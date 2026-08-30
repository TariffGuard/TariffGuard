"""
Load Forecasting Service for TariffGuard

Predicts near-term factory electricity demand (kW/kWh) using an
XGBoost regression model trained on historical meter readings and
weather data.

Features
--------
- Temporal: hour, day_of_week, month, is_weekend
- Lagged consumption: kwh_lag_1, kwh_lag_2, kwh_lag_3, kwh_lag_24
- Rolling averages: kwh_roll_3, kwh_roll_6, kwh_roll_24
- Weather: temperature_c, cloud_cover_pct, shortwave_radiation_wm2
- Solar: solar_kwh (estimated or metered)
- Tariff: current tariff rate (informational feature)
- Peak indicator: is_peak_hour (18–22 PKT)

The model is trained with a **chronological split** (not random)
to respect the time-series nature of the data.
"""

import logging
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sqlalchemy.orm import Session

from app.models.meter_reading import MeterReading
from app.models.weather_reading import WeatherReading
from app.models.tariff import Tariff
from app.services.cost_calculator import CostCalculator

logger = logging.getLogger(__name__)

# Where trained models are persisted
MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "models_trained"
MODEL_PATH = MODEL_DIR / "load_forecaster_xgb.joblib"
SCALER_PATH = MODEL_DIR / "feature_columns.joblib"

# Feature columns (order matters for prediction)
FEATURE_COLS = [
    "hour",
    "day_of_week",
    "month",
    "is_weekend",
    "temperature_c",
    "cloud_cover_pct",
    "shortwave_radiation_wm2",
    "solar_kwh",
    "tariff_rate",
    "is_peak_hour",
    "kwh_lag_1",
    "kwh_lag_2",
    "kwh_lag_3",
    "kwh_lag_24",
    "kwh_roll_3",
    "kwh_roll_6",
    "kwh_roll_24",
    "kw_lag_1",
    "kw_roll_3",
]

TARGET = "kwh"


class LoadForecaster:
    """
    Predict factory electricity demand using a trained XGBoost model.

    Usage::

        fc = LoadForecaster(db, factory_id)
        fc.load_model()                    # load pre-trained model
        preds = fc.predict_horizon(24)     # next 24 hours
    """

    def __init__(self, db: Session, factory_id: int):
        self.db = db
        self.factory_id = factory_id
        self.model = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def load_model(self, path: Optional[Path] = None) -> bool:
        """Load a pre-trained model from disk. Returns True on success."""
        model_path = path or MODEL_PATH
        if not model_path.exists():
            logger.warning("No trained model found at %s", model_path)
            return False
        self.model = joblib.load(model_path)
        logger.info("Load forecaster model loaded from %s", model_path)
        return True

    def predict_horizon(
        self,
        hours: int = 24,
        start_time: Optional[datetime] = None,
    ) -> List[Dict]:
        """
        Predict load for the next *hours* hours starting from *start_time*.

        Returns a list of dicts with:
            timestamp, predicted_kwh, predicted_kw, tariff_rate, is_peak
        """
        if self.model is None:
            raise RuntimeError(
                "No model loaded. Call load_model() first or run "
                "the training script."
            )

        if start_time is None:
            start_time = datetime.now().replace(
                minute=0, second=0, microsecond=0
            ) + timedelta(hours=1)

        # Fetch recent history for lag features
        history = self._fetch_history(
            end=start_time, lookback_hours=48
        )

        tariffs = self.db.query(Tariff).all()
        predictions = []

        # Rolling buffer of recent kwh for lag features
        kwh_buffer = list(history["kwh"].values) if len(history) > 0 else [100.0]
        kw_buffer = list(history["kw"].values) if len(history) > 0 else [100.0]

        for h in range(hours):
            ts = start_time + timedelta(hours=h)
            features = self._build_future_features(
                ts, tariffs, kwh_buffer, kw_buffer
            )
            X = pd.DataFrame([features], columns=FEATURE_COLS)
            pred_kwh = float(self.model.predict(X)[0])
            pred_kwh = max(10.0, pred_kwh)  # floor at 10 kW

            rate = CostCalculator.get_tariff_rate(tariffs, ts)
            predictions.append({
                "timestamp": ts,
                "predicted_kwh": round(pred_kwh, 2),
                "predicted_kw": round(pred_kwh, 2),  # kWh ≈ kW for 1h
                "tariff_rate": rate,
                "is_peak": 1 if 18 <= ts.hour < 22 else 0,
            })

            # Update buffers with prediction for recursive forecasting
            kwh_buffer.append(pred_kwh)
            kw_buffer.append(pred_kwh)

        return predictions

    def train(
        self,
        test_fraction: float = 0.2,
        save: bool = True,
    ) -> Dict:
        """
        Train the XGBoost load forecasting model.

        Uses a chronological train/test split (oldest → newest).

        Returns a dict with training metrics.
        """
        from xgboost import XGBRegressor

        df = self._build_training_dataframe()
        if len(df) < 48:
            return {
                "status": "error",
                "message": f"Not enough data ({len(df)} rows). Need ≥48.",
            }

        # Chronological split
        split_idx = int(len(df) * (1 - test_fraction))
        train_df = df.iloc[:split_idx]
        test_df = df.iloc[split_idx:]

        X_train = train_df[FEATURE_COLS]
        y_train = train_df[TARGET]
        X_test = test_df[FEATURE_COLS]
        y_test = test_df[TARGET]

        model = XGBRegressor(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_alpha=0.1,
            reg_lambda=1.0,
            random_state=42,
            n_jobs=-1,
        )
        model.fit(
            X_train, y_train,
            eval_set=[(X_test, y_test)],
            verbose=False,
        )

        # Evaluate
        y_pred = model.predict(X_test)
        y_pred = np.maximum(y_pred, 0)  # no negative load

        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        mape = np.mean(
            np.abs((y_test.values - y_pred) / np.maximum(y_test.values, 1))
        ) * 100

        # Naive baseline (predict previous hour)
        naive_pred = y_test.shift(1).fillna(y_test.iloc[0])
        naive_mae = mean_absolute_error(y_test, naive_pred)
        naive_rmse = np.sqrt(mean_squared_error(y_test, naive_pred))

        improvement_mae = (naive_mae - mae) / naive_mae * 100
        improvement_rmse = (naive_rmse - rmse) / naive_rmse * 100

        # Feature importance
        importance = dict(zip(
            FEATURE_COLS,
            [round(float(x), 4) for x in model.feature_importances_],
        ))

        metrics = {
            "status": "success",
            "train_samples": len(train_df),
            "test_samples": len(test_df),
            "total_samples": len(df),
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "mape_pct": round(mape, 2),
            "naive_baseline_mae": round(naive_mae, 2),
            "naive_baseline_rmse": round(naive_rmse, 2),
            "improvement_over_naive_mae_pct": round(improvement_mae, 2),
            "improvement_over_naive_rmse_pct": round(improvement_rmse, 2),
            "feature_importance": dict(
                sorted(importance.items(), key=lambda x: -x[1])
            ),
        }

        if save:
            MODEL_DIR.mkdir(parents=True, exist_ok=True)
            joblib.dump(model, MODEL_PATH)
            joblib.dump(FEATURE_COLS, SCALER_PATH)
            logger.info("Model saved to %s", MODEL_PATH)

        self.model = model
        return metrics

    # ------------------------------------------------------------------
    # Data loading
    # ------------------------------------------------------------------

    def _build_training_dataframe(self) -> pd.DataFrame:
        """
        Build a feature-engineered DataFrame from historical meter +
        weather data.  Rows are sorted chronologically.
        """
        meter = (
            self.db.query(MeterReading)
            .filter(MeterReading.factory_id == self.factory_id)
            .order_by(MeterReading.timestamp)
            .all()
        )
        if not meter:
            return pd.DataFrame(columns=FEATURE_COLS + [TARGET])

        weather = (
            self.db.query(WeatherReading)
            .filter(WeatherReading.factory_id == self.factory_id)
            .order_by(WeatherReading.timestamp)
            .all()
        )
        wx_map = {
            w.timestamp.replace(minute=0, second=0, microsecond=0): w
            for w in weather
        }

        tariffs = self.db.query(Tariff).all()

        rows = []
        for m in meter:
            ts = m.timestamp.replace(minute=0, second=0, microsecond=0)
            wx = wx_map.get(ts)

            rows.append({
                "timestamp": ts,
                "kwh": m.kwh,
                "kw": m.kw or m.kwh,
                "solar_kwh": m.solar_kwh or 0,
                "temperature_c": wx.temperature_c if wx else 30.0,
                "cloud_cover_pct": wx.cloud_cover_pct if wx else 20.0,
                "shortwave_radiation_wm2": wx.shortwave_radiation_wm2 if wx else 0.0,
                "tariff_rate": CostCalculator.get_tariff_rate(tariffs, ts),
            })

        df = pd.DataFrame(rows).sort_values("timestamp").reset_index(drop=True)
        df = self._add_temporal_features(df)
        df = self._add_lag_features(df)
        df = df.dropna().reset_index(drop=True)

        return df

    def _fetch_history(
        self, end: datetime, lookback_hours: int = 48
    ) -> pd.DataFrame:
        """Fetch recent meter readings for lag feature computation."""
        start = end - timedelta(hours=lookback_hours)
        readings = (
            self.db.query(MeterReading)
            .filter(
                MeterReading.factory_id == self.factory_id,
                MeterReading.timestamp >= start,
                MeterReading.timestamp < end,
            )
            .order_by(MeterReading.timestamp)
            .all()
        )
        if not readings:
            return pd.DataFrame(columns=["kwh", "kw"])

        return pd.DataFrame([
            {"kwh": r.kwh, "kw": r.kw or r.kwh}
            for r in readings
        ])

    # ------------------------------------------------------------------
    # Feature engineering
    # ------------------------------------------------------------------

    @staticmethod
    def _add_temporal_features(df: pd.DataFrame) -> pd.DataFrame:
        """Add hour, day_of_week, month, is_weekend, is_peak_hour."""
        df["hour"] = df["timestamp"].dt.hour
        df["day_of_week"] = df["timestamp"].dt.dayofweek
        df["month"] = df["timestamp"].dt.month
        df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
        df["is_peak_hour"] = ((df["hour"] >= 18) & (df["hour"] < 22)).astype(int)
        return df

    @staticmethod
    def _add_lag_features(df: pd.DataFrame) -> pd.DataFrame:
        """Add lagged consumption and rolling averages."""
        # kWh lags
        for lag in [1, 2, 3, 24]:
            df[f"kwh_lag_{lag}"] = df["kwh"].shift(lag)

        # Rolling averages
        for window in [3, 6, 24]:
            df[f"kwh_roll_{window}"] = (
                df["kwh"].rolling(window=window, min_periods=1).mean()
            )

        # kW lag and rolling
        df["kw_lag_1"] = df["kw"].shift(1)
        df["kw_roll_3"] = df["kw"].rolling(window=3, min_periods=1).mean()

        return df

    def _build_future_features(
        self,
        ts: datetime,
        tariffs: List[Tariff],
        kwh_buffer: List[float],
        kw_buffer: List[float],
    ) -> Dict[str, float]:
        """Build feature dict for a single future timestamp."""
        hour = ts.hour
        dow = ts.weekday()
        month = ts.month
        is_weekend = 1 if dow >= 5 else 0
        is_peak = 1 if 18 <= hour < 22 else 0
        rate = CostCalculator.get_tariff_rate(tariffs, ts)

        # Lags from buffer
        def safe_lag(buf, n):
            return buf[-n] if len(buf) >= n else buf[-1] if buf else 100.0

        def safe_roll(buf, n):
            recent = buf[-n:] if len(buf) >= n else buf
            return sum(recent) / len(recent) if recent else 100.0

        return {
            "hour": hour,
            "day_of_week": dow,
            "month": month,
            "is_weekend": is_weekend,
            "temperature_c": 30.0,  # will be overridden if weather available
            "cloud_cover_pct": 20.0,
            "shortwave_radiation_wm2": 0.0,
            "solar_kwh": 0.0,
            "tariff_rate": rate,
            "is_peak_hour": is_peak,
            "kwh_lag_1": safe_lag(kwh_buffer, 1),
            "kwh_lag_2": safe_lag(kwh_buffer, 2),
            "kwh_lag_3": safe_lag(kwh_buffer, 3),
            "kwh_lag_24": safe_lag(kwh_buffer, 24),
            "kwh_roll_3": safe_roll(kwh_buffer, 3),
            "kwh_roll_6": safe_roll(kwh_buffer, 6),
            "kwh_roll_24": safe_roll(kwh_buffer, 24),
            "kw_lag_1": safe_lag(kw_buffer, 1),
            "kw_roll_3": safe_roll(kw_buffer, 3),
        }
