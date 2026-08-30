"""
Demand Risk Scoring Service for TariffGuard

Calculates a 0–100 demand risk score based on predicted grid demand
relative to the factory's sanctioned load / configured threshold.

Risk levels:
    0–40   → Low
    40–70  → Medium
    70–100 → High / Critical
"""

from typing import List, Dict, Optional


class DemandRiskCalculator:
    """
    Score demand risk for planned or predicted load profiles.

    Usage::

        calc = DemandRiskCalculator(sanctioned_load_kw=250)
        score = calc.score_slot(predicted_grid_kw=210)
        # score = {"risk_score": 70, "level": "High", ...}
    """

    def __init__(
        self,
        sanctioned_load_kw: float,
        warning_threshold_pct: float = 80.0,
        critical_threshold_pct: float = 95.0,
    ):
        self.sanctioned_load_kw = sanctioned_load_kw
        self.warning_kw = sanctioned_load_kw * warning_threshold_pct / 100
        self.critical_kw = sanctioned_load_kw * critical_threshold_pct / 100

    # ------------------------------------------------------------------
    # Single-slot scoring
    # ------------------------------------------------------------------

    def score_slot(self, predicted_grid_kw: float) -> Dict:
        """
        Return a risk score for a single time slot.

        Parameters
        ----------
        predicted_grid_kw : float
            Predicted grid demand (total load − solar) for the slot.

        Returns
        -------
        dict with risk_score (0–100), level, predicted_grid_kw,
        sanctioned_load_kw, headroom_kw.
        """
        if self.sanctioned_load_kw <= 0:
            return self._zero_risk(predicted_grid_kw)

        ratio = predicted_grid_kw / self.sanctioned_load_kw
        ratio = min(ratio, 1.2)  # cap at 120% to keep score bounded

        # Non-linear scoring: gentle below warning, steep above
        if ratio <= self.warning_kw / self.sanctioned_load_kw:
            # Below warning: 0–40 range
            score = (ratio / (self.warning_kw / self.sanctioned_load_kw)) * 40
        elif ratio <= self.critical_kw / self.sanctioned_load_kw:
            # Warning → critical: 40–70 range
            warn_frac = self.warning_kw / self.sanctioned_load_kw
            crit_frac = self.critical_kw / self.sanctioned_load_kw
            position = (ratio - warn_frac) / (crit_frac - warn_frac)
            score = 40 + position * 30
        else:
            # Above critical: 70–100 range
            crit_frac = self.critical_kw / self.sanctioned_load_kw
            overshoot = (ratio - crit_frac) / (1.2 - crit_frac)
            score = 70 + min(overshoot, 1.0) * 30

        score = round(min(100, max(0, score)), 1)
        level = self._score_to_level(score)
        headroom = round(self.sanctioned_load_kw - predicted_grid_kw, 1)

        return {
            "risk_score": score,
            "level": level,
            "predicted_grid_kw": round(predicted_grid_kw, 1),
            "sanctioned_load_kw": self.sanctioned_load_kw,
            "headroom_kw": headroom,
            "utilization_pct": round(ratio * 100, 1),
        }

    # ------------------------------------------------------------------
    # Profile scoring (multiple slots)
    # ------------------------------------------------------------------

    def score_profile(
        self,
        slot_loads: List[Dict],
        solar_map: Optional[Dict] = None,
    ) -> Dict:
        """
        Score risk for a full schedule / forecast profile.

        Parameters
        ----------
        slot_loads : list of dicts
            Each must have "timestamp" and "load_kw".
        solar_map : dict, optional
            timestamp → solar_kw.  Grid demand = load − solar.

        Returns
        -------
        dict with peak_risk, avg_risk, slots_at_risk, and per-slot scores.
        """
        if solar_map is None:
            solar_map = {}

        slot_scores = []
        peak_score = 0.0
        peak_ts = None
        total_score = 0.0
        at_risk_count = 0

        for slot in slot_loads:
            ts = slot["timestamp"]
            load_kw = slot["load_kw"]
            solar_kw = solar_map.get(ts, 0.0)
            grid_kw = max(0.0, load_kw - solar_kw)

            result = self.score_slot(grid_kw)
            result["timestamp"] = ts
            slot_scores.append(result)

            total_score += result["risk_score"]
            if result["risk_score"] > peak_score:
                peak_score = result["risk_score"]
                peak_ts = ts
            if result["risk_score"] >= 70:
                at_risk_count += 1

        n = len(slot_scores) if slot_scores else 1
        avg_score = round(total_score / n, 1)

        return {
            "peak_risk_score": peak_score,
            "peak_risk_level": self._score_to_level(peak_score),
            "peak_risk_timestamp": str(peak_ts) if peak_ts else None,
            "avg_risk_score": avg_score,
            "avg_risk_level": self._score_to_level(avg_score),
            "slots_at_risk": at_risk_count,
            "total_slots": len(slot_scores),
            "slots": slot_scores,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _score_to_level(score: float) -> str:
        if score < 40:
            return "Low"
        elif score < 70:
            return "Medium"
        else:
            return "High"

    def _zero_risk(self, predicted_grid_kw: float) -> Dict:
        return {
            "risk_score": 0,
            "level": "Low",
            "predicted_grid_kw": round(predicted_grid_kw, 1),
            "sanctioned_load_kw": 0,
            "headroom_kw": 0,
            "utilization_pct": 0,
        }
