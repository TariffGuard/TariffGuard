"""
Cost Calculation Service for TariffGuard
Calculates energy costs based on tariff periods and consumption
"""

from datetime import datetime, time
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