"""
Schedule Optimization Service for TariffGuard
Creates optimized production schedules based on energy costs
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from app.models.machine import Machine
from app.models.production_order import ProductionOrder
from app.models.tariff import Tariff
from app.services.cost_calculator import CostCalculator

class ScheduleOptimizer:
    """Optimize production schedules to minimize energy costs"""
    
    def __init__(self, db: Session):
        self.db = db
        self.cost_calculator = CostCalculator()
    
    def get_available_tariffs(self) -> List[Tariff]:
        """Get all available tariffs"""
        return self.db.query(Tariff).all()
    
    def get_available_machines(self, factory_id: int) -> List[Machine]:
        """Get machines for a factory"""
        return self.db.query(Machine).filter(Machine.factory_id == factory_id).all()
    
    def get_pending_orders(self, factory_id: int) -> List[ProductionOrder]:
        """Get pending orders for a factory"""
        return self.db.query(ProductionOrder).filter(
            ProductionOrder.factory_id == factory_id,
            ProductionOrder.status == "pending"
        ).all()
    
    def generate_time_slots(
        self,
        start_time: datetime,
        end_time: datetime,
        interval_minutes: int = 60
    ) -> List[datetime]:
        """Generate time slots between start and end time"""
        slots = []
        current = start_time
        while current < end_time:
            slots.append(current)
            current += timedelta(minutes=interval_minutes)
        return slots
    
    def calculate_slot_rates(
        self,
        slots: List[datetime],
        tariffs: List[Tariff]
    ) -> List[Dict]:
        """Calculate tariff rate for each time slot"""
        slot_rates = []
        for slot in slots:
            rate = self.cost_calculator.get_tariff_rate(tariffs, slot)
            slot_rates.append({
                "timestamp": slot,
                "rate": rate,
                "hour": slot.hour
            })
        return slot_rates
    
    def find_optimal_slots(
        self,
        slot_rates: List[Dict],
        duration_minutes: int,
        locked_slots: List[datetime] = None
    ) -> List[datetime]:
        """Find the cheapest time slots for a job"""
        if locked_slots is None:
            locked_slots = []
        
        # Sort slots by rate (cheapest first)
        sorted_slots = sorted(slot_rates, key=lambda x: x["rate"])
        
        # Find consecutive slots for the duration
        slots_needed = max(1, duration_minutes // 60)
        selected_slots = []
        
        for slot_info in sorted_slots:
            slot_time = slot_info["timestamp"]
            
            # Skip locked slots
            if slot_time in locked_slots:
                continue
            
            selected_slots.append(slot_time)
            
            if len(selected_slots) >= slots_needed:
                break
        
        return selected_slots
    
    def create_optimized_schedule(
        self,
        factory_id: int,
        start_time: datetime,
        end_time: datetime
    ) -> Dict:
        """Create an optimized schedule for all pending orders"""
        
        # Get data
        tariffs = self.get_available_tariffs()
        machines = self.get_available_machines(factory_id)
        orders = self.get_pending_orders(factory_id)
        
        # Generate time slots
        slots = self.generate_time_slots(start_time, end_time)
        slot_rates = self.calculate_slot_rates(slots, tariffs)
        
        # Assign orders to slots
        schedule = []
        used_slots = {}
        total_cost = 0
        total_kwh = 0
        
        for order in orders:
            # Find suitable machine
            suitable_machines = [
                m for m in machines
                if m.machine_type.lower() == order.process.lower()
            ]
            
            if not suitable_machines:
                machine = machines[0] if machines else None
            else:
                machine = suitable_machines[0]
            
            if not machine:
                continue
            
            # Find optimal slots
            optimal_slots = self.find_optimal_slots(
                slot_rates,
                order.duration_minutes,
                locked_slots=used_slots.get(machine.id, [])
            )
            
            if optimal_slots:
                # Calculate cost
                order_kwh = machine.power_kw * (order.duration_minutes / 60)
                order_cost = 0
                
                for slot in optimal_slots:
                    slot_info = next(
                        (s for s in slot_rates if s["timestamp"] == slot),
                        None
                    )
                    if slot_info:
                        order_cost += machine.power_kw * slot_info["rate"]
                        
                        # Mark slot as used
                        if machine.id not in used_slots:
                            used_slots[machine.id] = []
                        used_slots[machine.id].append(slot)
                
                schedule.append({
                    "order_id": order.id,
                    "order_no": order.order_no,
                    "process": order.process,
                    "quantity": order.quantity,
                    "machine_id": machine.id,
                    "machine_name": machine.name,
                    "machine_power_kw": machine.power_kw,
                    "duration_minutes": order.duration_minutes,
                    "start_time": optimal_slots[0],
                    "end_time": optimal_slots[-1] + timedelta(hours=1),
                    "slots": optimal_slots,
                    "estimated_cost": round(order_cost, 2),
                    "estimated_kwh": round(order_kwh, 2),
                    "priority": order.priority
                })
                
                total_cost += order_cost
                total_kwh += order_kwh
        
        return {
            "factory_id": factory_id,
            "start_time": start_time,
            "end_time": end_time,
            "total_orders_scheduled": len(schedule),
            "total_estimated_cost": round(total_cost, 2),
            "total_estimated_kwh": round(total_kwh, 2),
            "average_rate": round(total_cost / total_kwh, 2) if total_kwh > 0 else 0,
            "schedule": schedule,
            "slot_rates": slot_rates
        }
    
    def compare_baseline_vs_optimized(
        self,
        factory_id: int,
        start_time: datetime,
        end_time: datetime
    ) -> Dict:
        """Compare baseline (unoptimized) vs optimized schedule"""
        optimized = self.create_optimized_schedule(factory_id, start_time, end_time)
        
        # Calculate baseline cost (all orders at peak rate)
        orders = self.get_pending_orders(factory_id)
        machines = self.get_available_machines(factory_id)
        
        baseline_cost = 0
        baseline_kwh = 0
        
        # Assume baseline runs everything at peak rate
        peak_rate = 35.0  # Default peak rate
        
        for order in orders:
            machine = next(
                (m for m in machines if m.machine_type.lower() == order.process.lower()),
                machines[0] if machines else None
            )
            if machine:
                kwh = machine.power_kw * (order.duration_minutes / 60)
                baseline_cost += kwh * peak_rate
                baseline_kwh += kwh
        
        savings = baseline_cost - optimized["total_estimated_cost"]
        savings_pct = (savings / baseline_cost * 100) if baseline_cost > 0 else 0
        
        return {
            "baseline": {
                "total_cost": round(baseline_cost, 2),
                "total_kwh": round(baseline_kwh, 2)
            },
            "optimized": {
                "total_cost": optimized["total_estimated_cost"],
                "total_kwh": optimized["total_estimated_kwh"]
            },
            "savings": {
                "amount": round(savings, 2),
                "percentage": round(savings_pct, 2)
            },
            "schedule": optimized["schedule"]
        }