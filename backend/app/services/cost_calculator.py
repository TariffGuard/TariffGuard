"""
Cost Calculation Service for TariffGuard
Calculates energy costs based on tariff periods and consumption
"""

from datetime import datetime, time, timedelta
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from app.models.tariff import Tariff
from app.models.meter_reading import MeterReading

class CostCalculator:
    """Calculate energy costs based on tariffs and consumption"""
    
    @staticmethod
    def get_tariff_rate(tariffs: List[Tariff], timestamp: datetime) -> float:
        """Get applicable tariff rate for a specific timestamp"""
        current_time = timestamp.time()
        
        for tariff in tariffs:
            start_time = time.fromisoformat(tariff.start_time)
            end_time = time.fromisoformat(tariff.end_time)
            
            # Handle overnight tariffs (e.g., 22:00 - 00:00)
            if start_time > end_time:
                if current_time >= start_time or current_time < end_time:
                    return tariff.rate_pkr_per_kwh
            else:
                if start_time <= current_time < end_time:
                    return tariff.rate_pkr_per_kwh
        
        # Default rate if no tariff matches
        return 25.0
    
    @staticmethod
    def calculate_slot_cost(
        kwh: float,
        timestamp: datetime,
        tariffs: List[Tariff]
    ) -> Dict:
        """Calculate cost for a single time slot"""
        rate = CostCalculator.get_tariff_rate(tariffs, timestamp)
        cost = kwh * rate
        
        return {
            "timestamp": timestamp,
            "kwh": kwh,
            "rate": rate,
            "cost": cost
        }
    
    @staticmethod
    def calculate_total_cost(
        readings: List[MeterReading],
        tariffs: List[Tariff]
    ) -> Dict:
        """Calculate total energy cost for a list of meter readings"""
        total_kwh = 0
        total_cost = 0
        peak_kw = 0
        solar_kwh = 0
        slot_costs = []
        
        for reading in readings:
            total_kwh += reading.kwh
            solar_kwh += reading.solar_kwh or 0
            
            if reading.kw and reading.kw > peak_kw:
                peak_kw = reading.kw
            
            cost_info = CostCalculator.calculate_slot_cost(
                reading.kwh,
                reading.timestamp,
                tariffs
            )
            total_cost += cost_info["cost"]
            slot_costs.append(cost_info)
        
        # Calculate grid consumption (total - solar)
        grid_kwh = max(0, total_kwh - solar_kwh)
        
        return {
            "total_kwh": round(total_kwh, 2),
            "grid_kwh": round(grid_kwh, 2),
            "solar_kwh": round(solar_kwh, 2),
            "peak_kw": round(peak_kw, 2),
            "total_cost": round(total_cost, 2),
            "average_rate": round(total_cost / total_kwh, 2) if total_kwh > 0 else 0,
            "slot_costs": slot_costs
        }
    
    @staticmethod
    def estimate_machine_cost(
        power_kw: float,
        duration_hours: float,
        start_time: datetime,
        tariffs: List[Tariff]
    ) -> Dict:
        """Estimate cost of running a machine for a duration"""
        kwh = power_kw * duration_hours
        rate = CostCalculator.get_tariff_rate(tariffs, start_time)
        cost = kwh * rate
        
        return {
            "power_kw": power_kw,
            "duration_hours": duration_hours,
            "kwh": kwh,
            "rate": rate,
            "estimated_cost": round(cost, 2)
        }

    # ------------------------------------------------------------------
    # Solar-aware cost calculation
    # ------------------------------------------------------------------

    @staticmethod
    def calculate_schedule_cost(
        slot_loads: List[Dict],
        tariffs: List[Tariff],
        solar_estimates: Optional[Dict[datetime, float]] = None,
    ) -> Dict:
        """
        Calculate energy cost for a planned schedule, accounting for solar.

        Parameters
        ----------
        slot_loads : list of dicts
            Each dict must have:
                "timestamp" : datetime
                "load_kw"   : float  (total planned consumption)
        tariffs : list of Tariff
            Active tariff rows.
        solar_estimates : dict, optional
            Mapping of timestamp → solar_kw from SolarEstimator.
            If not provided, solar contribution is zero.

        Returns
        -------
        dict with total_cost, total_kwh, grid_kwh, solar_kwh, peak_grid_kw,
        and per-slot breakdown.
        """
        if solar_estimates is None:
            solar_estimates = {}

        total_cost = 0.0
        total_kwh = 0.0
        solar_kwh = 0.0
        grid_kwh = 0.0
        peak_grid_kw = 0.0
        slot_details = []

        for slot in slot_loads:
            ts = slot["timestamp"]
            load_kw = slot["load_kw"]
            rate = CostCalculator.get_tariff_rate(tariffs, ts)

            # Solar contribution for this slot (capped at load)
            slot_solar = min(solar_estimates.get(ts, 0.0), load_kw)
            slot_grid = max(0.0, load_kw - slot_solar)

            # For 1-hour slots: kWh = kW × 1h
            slot_grid_kwh = slot_grid
            slot_solar_kwh = slot_solar

            slot_cost = slot_grid_kwh * rate

            total_cost += slot_cost
            total_kwh += load_kw
            grid_kwh += slot_grid_kwh
            solar_kwh += slot_solar_kwh
            peak_grid_kw = max(peak_grid_kw, slot_grid)

            slot_details.append({
                "timestamp": ts,
                "load_kw": round(load_kw, 2),
                "solar_kw": round(slot_solar, 2),
                "grid_kw": round(slot_grid, 2),
                "rate": rate,
                "cost": round(slot_cost, 2),
            })

        return {
            "total_cost": round(total_cost, 2),
            "total_kwh": round(total_kwh, 2),
            "grid_kwh": round(grid_kwh, 2),
            "solar_kwh": round(solar_kwh, 2),
            "solar_utilization_pct": round(
                solar_kwh / total_kwh * 100, 1
            ) if total_kwh > 0 else 0.0,
            "peak_grid_kw": round(peak_grid_kw, 2),
            "average_rate": round(
                total_cost / grid_kwh, 2
            ) if grid_kwh > 0 else 0.0,
            "slots": slot_details,
        }