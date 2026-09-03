"""
TariffGuard — Model Training Script

Trains the XGBoost load forecasting model on seeded synthetic data.

Usage:
    .\\venv\\Scripts\\python train_model.py
    .\\venv\\Scripts\\python train_model.py --days 90 --seed 42
"""

import argparse
import json
import logging
import os
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Train TariffGuard ML models")
    parser.add_argument("--days", type=int, default=90,
                        help="Days of synthetic data to train on")
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed for data generation")
    parser.add_argument("--test-fraction", type=float, default=0.2,
                        help="Fraction of data for testing (chronological)")
    args = parser.parse_args()

    print("=" * 60)
    print("  TariffGuard — Model Training")
    print("=" * 60)

    # Ensure we have seeded data
    from app.core.database import SessionLocal, init_db, Base, engine
    from app.models.meter_reading import MeterReading

    init_db()
    db = SessionLocal()

    meter_count = db.query(MeterReading).count()
    if meter_count < 48:
        logger.info(
            "Not enough meter data (%d rows). Running seed first...",
            meter_count,
        )
        from app.services.synthetic_data import SyntheticDataGenerator

        # Drop and recreate all tables (resets auto-increment IDs to 1)
        logger.info("Clearing existing data...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        db.close()
        db = SessionLocal()  # fresh session after table recreation

        gen = SyntheticDataGenerator(db, days=args.days, seed=args.seed)
        summary = gen.generate()
        logger.info("Seeded %d meter readings", summary["meter_readings"])
    else:
        logger.info("Using existing data (%d meter readings)", meter_count)

    # Train the load forecasting model
    from app.services.load_forecaster import LoadForecaster

    forecaster = LoadForecaster(db, factory_id=1)
    logger.info("Training XGBoost load forecasting model...")

    metrics = forecaster.train(
        test_fraction=args.test_fraction,
        save=True,
    )

    if metrics["status"] == "error":
        logger.error("Training failed: %s", metrics["message"])
        db.close()
        sys.exit(1)

    print("\n" + "=" * 60)
    print("  TRAINING RESULTS")
    print("=" * 60)
    print(f"  Training samples:  {metrics['train_samples']}")
    print(f"  Test samples:      {metrics['test_samples']}")
    print(f"  Total samples:     {metrics['total_samples']}")
    print(f"")
    print(f"  XGBoost Model:")
    print(f"    MAE:   {metrics['mae']:.2f} kWh")
    print(f"    RMSE:  {metrics['rmse']:.2f} kWh")
    print(f"    MAPE:  {metrics['mape_pct']:.2f}%")
    print(f"")
    print(f"  Naive Baseline (predict previous hour):")
    print(f"    MAE:   {metrics['naive_baseline_mae']:.2f} kWh")
    print(f"    RMSE:  {metrics['naive_baseline_rmse']:.2f} kWh")
    print(f"")
    print(f"  Improvement over naive:")
    print(f"    MAE:   {metrics['improvement_over_naive_mae_pct']:.1f}%")
    print(f"    RMSE:  {metrics['improvement_over_naive_rmse_pct']:.1f}%")
    print(f"")
    print(f"  Top features:")
    for feat, imp in list(metrics["feature_importance"].items())[:5]:
        bar = "#" * int(imp * 100)
        print(f"    {feat:30s}  {imp:.4f}  {bar}")
    print("=" * 60)

    # Save metrics to JSON
    from app.services.load_forecaster import MODEL_DIR
    metrics_path = MODEL_DIR / "training_metrics.json"
    # Convert for JSON serialization
    json_metrics = {k: v for k, v in metrics.items() if k != "feature_importance"}
    json_metrics["feature_importance"] = metrics["feature_importance"]
    with open(metrics_path, "w") as f:
        json.dump(json_metrics, f, indent=2, default=str)
    logger.info("Metrics saved to %s", metrics_path)

    # Quick prediction test
    logger.info("Testing prediction horizon...")
    predictions = forecaster.predict_horizon(hours=24)
    total_predicted = sum(p["predicted_kwh"] for p in predictions)
    peak_predicted = max(p["predicted_kw"] for p in predictions)
    print(f"\n  24h prediction test:")
    print(f"    Total predicted: {total_predicted:.1f} kWh")
    print(f"    Peak predicted:  {peak_predicted:.1f} kW")
    print(f"    Hours predicted:  {len(predictions)}")

    db.close()
    print("\nTraining complete!")


if __name__ == "__main__":
    main()
