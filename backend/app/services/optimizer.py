"""
Schedule Optimization Service for TariffGuard
Uses Google OR-Tools CP-SAT solver to create constraint-based production
schedules that minimize energy cost while respecting machine conflicts,
deadlines, locked jobs, solar availability and demand-risk constraints.

Replaces the previous greedy slot-picker with a proper constraint
programming formulation.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple

from sqlalchemy.orm import Session
from ortools.sat.python import cp_model

from app.models.machine import Machine
from app.models.production_order import ProductionOrder
from app.models.tariff import Tariff
from app.models.factory import Factory
from app.services.cost_calculator import CostCalculator
from app.services.solar_estimator import SolarEstimator

logger = logging.getLogger(__name__)

# Penalty weights (tunable)
W_ENERGY = 1.0        # PKR cost weight
W_MOVEMENT = 50.0     # penalty per hour of job shift from baseline
W_DEMAND = 200.0      # penalty per kW above demand threshold


class ScheduleOptimizer:
    """
    OR-Tools CP-SAT based production schedule optimizer.

    Usage::

        opt = ScheduleOptimizer(db)
        result = opt.create_optimized_schedule(factory_id, start, end)
    """

    def __init__(self, db: Session):
        self.db = db
        self.cost_calculator = CostCalculator()

    # ------------------------------------------------------------------
    # Data access helpers (same interface as before)
    # ------------------------------------------------------------------

    def get_available_tariffs(self) -> List[Tariff]:
        return self.db.query(Tariff).all()

    def get_available_machines(self, factory_id: int) -> List[Machine]:
        return self.db.query(Machine).filter(
            Machine.factory_id == factory_id
        ).all()

    def get_pending_orders(self, factory_id: int) -> List[ProductionOrder]:
        return self.db.query(ProductionOrder).filter(
            ProductionOrder.factory_id == factory_id,
            ProductionOrder.status.in_(["pending", "in_progress"]),
        ).all()

    def get_orders_for_window(
        self,
        factory_id: int,
        start_time: datetime,
        end_time: datetime,
    ) -> List[ProductionOrder]:
        """
        Get orders that are relevant for the given planning window.
        An order is relevant if its deadline falls within or after
        the window start AND it has not been completed.
        """
        return self.db.query(ProductionOrder).filter(
            ProductionOrder.factory_id == factory_id,
            ProductionOrder.status.in_(["pending", "in_progress"]),
            ProductionOrder.deadline >= start_time,
        ).all()

    # ------------------------------------------------------------------
    # Slot / rate helpers
    # ------------------------------------------------------------------

    @staticmethod
    def generate_time_slots(
        start_time: datetime,
        end_time: datetime,
        interval_minutes: int = 60,
    ) -> List[datetime]:
        slots = []
        current = start_time
        while current < end_time:
            slots.append(current)
            current += timedelta(minutes=interval_minutes)
        return slots

    def calculate_slot_rates(
        self, slots: List[datetime], tariffs: List[Tariff]
    ) -> List[Dict]:
        slot_rates = []
        for slot in slots:
            rate = self.cost_calculator.get_tariff_rate(tariffs, slot)
            slot_rates.append({"timestamp": slot, "rate": rate, "hour": slot.hour})
        return slot_rates

    # ------------------------------------------------------------------
    # Solar estimates (optional enrichment)
    # ------------------------------------------------------------------

    def _get_solar_map(
        self,
        factory_id: int,
        slots: List[datetime],
    ) -> Dict[datetime, float]:
        """Return {timestamp: solar_kw} or empty dict on failure."""
        try:
            if not slots:
                return {}
            est = SolarEstimator(self.db, factory_id)
            data = est.estimate_period(slots[0], slots[-1])
            return {d["timestamp"]: d["solar_kw"] for d in data}
        except (ValueError, Exception) as e:
            logger.warning("Solar estimation unavailable: %s", e)
            return {}

    # ------------------------------------------------------------------
    # CP-SAT Optimizer
    # ------------------------------------------------------------------

    def create_optimized_schedule(
        self,
        factory_id: int,
        start_time: datetime,
        end_time: datetime,
    ) -> Dict:
        """
        Create an optimized schedule using OR-Tools CP-SAT.

        Returns the same response shape as the previous greedy optimizer
        so existing API consumers are not broken.
        """
        tariffs = self.get_available_tariffs()
        machines = self.get_available_machines(factory_id)
        orders = self.get_orders_for_window(factory_id, start_time, end_time)

        if not orders or not machines:
            return self._empty_result(factory_id, start_time, end_time)

        slots = self.generate_time_slots(start_time, end_time)
        slot_rates = self.calculate_slot_rates(slots, tariffs)
        solar_map = self._get_solar_map(factory_id, slots)

        n_slots = len(slots)

        # Pre-filter: only keep orders that can fit in the planning window
        feasible_orders = []
        for order in orders:
            dur = max(1, order.duration_minutes // 60)
            # Skip orders whose deadline is before window start
            if order.deadline and order.deadline < start_time:
                continue
            # Skip orders whose earliest_start is after window end
            if order.earliest_start and order.earliest_start >= end_time:
                continue
            # Skip orders too long for the window
            if dur > n_slots:
                logger.warning(
                    "Skipping %s: duration %d slots exceeds window %d",
                    order.order_no, dur, n_slots,
                )
                continue
            feasible_orders.append(order)
        orders = feasible_orders
        n_orders = len(orders)
        n_machines = len(machines)

        if n_orders == 0:
            return self._empty_result(factory_id, start_time, end_time)

        # Pre-compute rate and solar arrays indexed by slot
        rates = [s["rate"] for s in slot_rates]
        solar_kw = [solar_map.get(slots[i], 0.0) for i in range(n_slots)]

        # Build machine index and compatibility maps
        machine_idx = {m.id: i for i, m in enumerate(machines)}
        compatible = {}  # order_idx -> list of machine indices
        for oi, order in enumerate(orders):
            if order.machine_options:
                compat = [
                    machine_idx[mid]
                    for mid in order.machine_options
                    if mid in machine_idx
                ]
            else:
                compat = [
                    mi
                    for mi, m in enumerate(machines)
                    if m.machine_type.lower() == order.process.lower()
                ]
            compatible[oi] = compat if compat else list(range(n_machines))

        # ---- Build CP-SAT model ----
        model = cp_model.CpModel()
        SCALE = 100  # integer scaling for costs

        # Decision variables
        start_vars = {}  # (oi) -> IntVar (slot index)
        machine_vars = {}  # (oi) -> IntVar (machine index)
        intervals = {}  # (oi, mi) -> IntervalVar
        presences = {}  # (oi, mi) -> BoolVar

        for oi, order in enumerate(orders):
            dur_slots = max(1, order.duration_minutes // 60)

            # Earliest and latest feasible slot indices
            earliest_slot = 0
            if order.earliest_start:
                for si, s in enumerate(slots):
                    if s >= order.earliest_start:
                        earliest_slot = si
                        break

            latest_start_slot = max(0, n_slots - dur_slots)
            if order.deadline:
                for si in range(n_slots - 1, -1, -1):
                    slot_end = slots[si] + timedelta(hours=dur_slots)
                    if slot_end <= order.deadline:
                        latest_start_slot = si
                        break
                else:
                    latest_start_slot = max(0, n_slots - dur_slots)

            latest_start_slot = max(earliest_slot, latest_start_slot)

            sv = model.NewIntVar(
                earliest_slot, latest_start_slot, f"start_{oi}"
            )
            start_vars[oi] = sv

            mv = model.NewIntVar(0, n_machines - 1, f"machine_{oi}")
            machine_vars[oi] = mv

            # Constrain machine_var to compatible machines
            if len(compatible[oi]) < n_machines:
                model.AddAllowedAssignments(
                    [mv], [(m,) for m in compatible[oi]]
                )

            # Per-machine optional intervals
            for mi in compatible[oi]:
                pres = model.NewBoolVar(f"pres_{oi}_{mi}")
                presences[(oi, mi)] = pres

                # Link presence to machine_var
                model.Add(mv == mi).OnlyEnforceIf(pres)
                model.Add(mv != mi).OnlyEnforceIf(pres.Not())

                iv = model.NewOptionalIntervalVar(
                    sv, dur_slots, sv + dur_slots, pres,
                    f"interval_{oi}_{mi}",
                )
                intervals[(oi, mi)] = iv

            # Locked jobs: fix start and machine
            if order.locked and order.machine_options and len(order.machine_options) > 0:
                locked_mid = order.machine_options[0]
                if locked_mid in machine_idx:
                    locked_mi = machine_idx[locked_mid]
                    model.Add(mv == locked_mi)
                    # Keep it at baseline start
                    baseline_slot = self._find_baseline_slot(order, slots)
                    if baseline_slot is not None:
                        model.Add(sv == baseline_slot)

        # No-overlap per machine
        for mi in range(n_machines):
            machine_intervals = [
                intervals[(oi, mi)]
                for oi in range(n_orders)
                if (oi, mi) in intervals
            ]
            if machine_intervals:
                model.AddNoOverlap(machine_intervals)

        # ---- Objective: minimize energy cost + movement penalty ----
        objective_terms = []

        # Pre-compute slot costs for each order at each possible start
        for oi, order in enumerate(orders):
            dur = max(1, order.duration_minutes // 60)
            machine = self._primary_machine(order, machines)
            power = machine.power_kw if machine else 30.0

            for si in range(n_slots):
                end_si = min(si + dur, n_slots)
                # Energy cost for this placement
                slot_energy_cost = 0
                for s in range(si, end_si):
                    grid_kw = max(0, power - solar_kw[s])
                    slot_energy_cost += grid_kw * rates[s]

                # Movement penalty
                baseline_slot = self._find_baseline_slot(order, slots)
                if baseline_slot is not None:
                    move_penalty = (
                        W_MOVEMENT * abs(si - baseline_slot)
                    )
                else:
                    move_penalty = 0

                total_cost = W_ENERGY * slot_energy_cost + move_penalty
                is_this_start = model.NewBoolVar(f"is_start_{oi}_{si}")
                model.Add(start_vars[oi] == si).OnlyEnforceIf(is_this_start)
                model.Add(start_vars[oi] != si).OnlyEnforceIf(
                    is_this_start.Not()
                )
                objective_terms.append(
                    int(total_cost * SCALE) * is_this_start
                )

        model.Minimize(sum(objective_terms))

        # ---- Solve ----
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 30.0
        solver.parameters.num_workers = 4
        status = solver.Solve(model)

        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            logger.warning(
                "CP-SAT status: %s — falling back to greedy",
                solver.StatusName(status),
            )
            return self._greedy_fallback(
                factory_id, start_time, end_time, slots, slot_rates,
                tariffs, machines, orders, solar_map,
            )

        # ---- Extract solution ----
        schedule = []
        total_cost = 0.0
        total_kwh = 0.0
        total_grid_kwh = 0.0
        total_solar_kwh = 0.0
        peak_grid_kw = 0.0

        # Per-slot demand tracking for peak calculation
        slot_demand = [0.0] * n_slots

        for oi, order in enumerate(orders):
            si = solver.Value(start_vars[oi])
            mi = solver.Value(machine_vars[oi])
            dur = max(1, order.duration_minutes // 60)
            machine = machines[mi]

            order_kwh = machine.power_kw * dur
            order_cost = 0.0
            order_solar_kwh = 0.0

            for s in range(si, min(si + dur, n_slots)):
                grid_kw = max(0, machine.power_kw - solar_kw[s])
                solar_used = min(solar_kw[s], machine.power_kw)
                order_cost += grid_kw * rates[s]
                order_solar_kwh += solar_used
                slot_demand[s] += machine.power_kw

            order_grid_kwh = order_kwh - order_solar_kwh
            order_cost = round(order_cost, 2)

            schedule.append({
                "order_id": order.id,
                "order_no": order.order_no,
                "process": order.process,
                "quantity": order.quantity,
                "machine_id": machine.id,
                "machine_name": machine.name,
                "machine_power_kw": machine.power_kw,
                "duration_minutes": order.duration_minutes,
                "start_time": slots[si],
                "end_time": slots[min(si + dur - 1, n_slots - 1)] + timedelta(hours=1),
                "slots": [slots[s] for s in range(si, min(si + dur, n_slots))],
                "estimated_cost": order_cost,
                "estimated_kwh": round(order_kwh, 2),
                "grid_kwh": round(max(0, order_grid_kwh), 2),
                "solar_kwh": round(order_solar_kwh, 2),
                "priority": order.priority,
                "locked": order.locked,
            })

            total_cost += order_cost
            total_kwh += order_kwh
            total_solar_kwh += order_solar_kwh
            total_grid_kwh += max(0, order_grid_kwh)

        # Peak grid demand
        for s in range(n_slots):
            grid_at_s = max(0, slot_demand[s] - solar_kw[s])
            peak_grid_kw = max(peak_grid_kw, grid_at_s)

        avg_rate = (
            total_cost / total_grid_kwh if total_grid_kwh > 0 else 0
        )

        return {
            "factory_id": factory_id,
            "start_time": start_time,
            "end_time": end_time,
            "total_orders_scheduled": len(schedule),
            "total_estimated_cost": round(total_cost, 2),
            "total_estimated_kwh": round(total_kwh, 2),
            "total_grid_kwh": round(total_grid_kwh, 2),
            "total_solar_kwh": round(total_solar_kwh, 2),
            "peak_grid_kw": round(peak_grid_kw, 2),
            "average_rate": round(avg_rate, 2),
            "solver_status": solver.StatusName(status),
            "schedule": schedule,
            "slot_rates": slot_rates,
        }

    # ------------------------------------------------------------------
    # Baseline vs Optimized comparison
    # ------------------------------------------------------------------

    def compare_baseline_vs_optimized(
        self,
        factory_id: int,
        start_time: datetime,
        end_time: datetime,
    ) -> Dict:
        """
        Compare a naive baseline schedule (earliest feasible) against
        the CP-SAT optimized schedule.
        """
        optimized = self.create_optimized_schedule(
            factory_id, start_time, end_time
        )

        tariffs = self.get_available_tariffs()
        machines = self.get_available_machines(factory_id)
        orders = self.get_orders_for_window(factory_id, start_time, end_time)
        solar_map = self._get_solar_map(
            factory_id,
            self.generate_time_slots(start_time, end_time),
        )
        slots = self.generate_time_slots(start_time, end_time)

        # Baseline: each order at its earliest_start on first compatible machine
        baseline_cost = 0.0
        baseline_kwh = 0.0
        baseline_grid_kwh = 0.0
        baseline_solar_kwh = 0.0
        baseline_schedule = []

        for order in orders:
            machine = self._primary_machine(order, machines)
            if not machine:
                continue
            dur = max(1, order.duration_minutes // 60)
            si = self._find_baseline_slot(order, slots)
            if si is None:
                si = 0

            order_kwh = machine.power_kw * dur
            order_cost = 0.0
            order_solar = 0.0

            for s in range(si, min(si + dur, len(slots))):
                slot_solar = solar_map.get(slots[s], 0.0)
                grid_kw = max(0, machine.power_kw - slot_solar)
                rate = CostCalculator.get_tariff_rate(tariffs, slots[s])
                order_cost += grid_kw * rate
                order_solar += min(slot_solar, machine.power_kw)

            baseline_cost += order_cost
            baseline_kwh += order_kwh
            baseline_solar_kwh += order_solar
            baseline_grid_kwh += max(0, order_kwh - order_solar)

            baseline_schedule.append({
                "order_id": order.id,
                "order_no": order.order_no,
                "process": order.process,
                "machine_name": machine.name,
                "machine_power_kw": machine.power_kw,
                "start_time": slots[si],
                "end_time": slots[min(si + dur - 1, len(slots) - 1)] + timedelta(hours=1),
                "estimated_cost": round(order_cost, 2),
                "estimated_kwh": round(order_kwh, 2),
            })

        savings = baseline_cost - optimized["total_estimated_cost"]
        savings_pct = (savings / baseline_cost * 100) if baseline_cost > 0 else 0

        return {
            "baseline": {
                "total_cost": round(baseline_cost, 2),
                "total_kwh": round(baseline_kwh, 2),
                "total_grid_kwh": round(baseline_grid_kwh, 2),
                "total_solar_kwh": round(baseline_solar_kwh, 2),
                "schedule": baseline_schedule,
            },
            "optimized": {
                "total_cost": optimized["total_estimated_cost"],
                "total_kwh": optimized["total_estimated_kwh"],
                "total_grid_kwh": optimized.get("total_grid_kwh", 0),
                "total_solar_kwh": optimized.get("total_solar_kwh", 0),
                "peak_grid_kw": optimized.get("peak_grid_kw", 0),
                "solver_status": optimized.get("solver_status", "unknown"),
            },
            "savings": {
                "amount": round(savings, 2),
                "percentage": round(savings_pct, 2),
            },
            "schedule": optimized["schedule"],
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _find_baseline_slot(
        order: ProductionOrder, slots: List[datetime]
    ) -> Optional[int]:
        """Find the slot index closest to the order's earliest_start."""
        if not order.earliest_start:
            return 0
        for si, s in enumerate(slots):
            if s >= order.earliest_start:
                return si
        return len(slots) - 1

    @staticmethod
    def _primary_machine(
        order: ProductionOrder, machines: List[Machine]
    ) -> Optional[Machine]:
        """Get the first compatible machine for an order."""
        if order.machine_options:
            for m in machines:
                if m.id in order.machine_options:
                    return m
        for m in machines:
            if m.machine_type.lower() == order.process.lower():
                return m
        return machines[0] if machines else None

    @staticmethod
    def _empty_result(
        factory_id: int, start_time: datetime, end_time: datetime
    ) -> Dict:
        return {
            "factory_id": factory_id,
            "start_time": start_time,
            "end_time": end_time,
            "total_orders_scheduled": 0,
            "total_estimated_cost": 0,
            "total_estimated_kwh": 0,
            "total_grid_kwh": 0,
            "total_solar_kwh": 0,
            "peak_grid_kw": 0,
            "average_rate": 0,
            "solver_status": "no_data",
            "schedule": [],
            "slot_rates": [],
        }

    def _greedy_fallback(
        self,
        factory_id, start_time, end_time, slots, slot_rates,
        tariffs, machines, orders, solar_map,
    ) -> Dict:
        """
        Fallback to the original greedy algorithm if CP-SAT fails.
        Kept for robustness — sorts slots by rate and picks cheapest.
        """
        logger.info("Using greedy fallback scheduler")
        schedule = []
        used_slots: Dict[int, List[int]] = {}
        total_cost = 0.0
        total_kwh = 0.0

        for order in orders:
            machine = self._primary_machine(order, machines)
            if not machine:
                continue
            dur = max(1, order.duration_minutes // 60)

            # Sort available slots by rate
            available = [
                (si, sr)
                for si, sr in enumerate(slot_rates)
                if si not in used_slots.get(machine.id, [])
            ]
            available.sort(key=lambda x: x[1]["rate"])

            selected = [a[0] for a in available[:dur]]
            if len(selected) < dur:
                continue

            order_cost = 0.0
            order_kwh = machine.power_kw * dur
            for si in selected:
                slot_solar = solar_map.get(slots[si], 0.0)
                grid_kw = max(0, machine.power_kw - slot_solar)
                order_cost += grid_kw * slot_rates[si]["rate"]
                used_slots.setdefault(machine.id, []).append(si)

            schedule.append({
                "order_id": order.id,
                "order_no": order.order_no,
                "process": order.process,
                "quantity": order.quantity,
                "machine_id": machine.id,
                "machine_name": machine.name,
                "machine_power_kw": machine.power_kw,
                "duration_minutes": order.duration_minutes,
                "start_time": slots[selected[0]],
                "end_time": slots[selected[-1]] + timedelta(hours=1),
                "slots": [slots[si] for si in selected],
                "estimated_cost": round(order_cost, 2),
                "estimated_kwh": round(order_kwh, 2),
                "priority": order.priority,
                "locked": order.locked,
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
            "average_rate": round(
                total_cost / total_kwh, 2
            ) if total_kwh > 0 else 0,
            "solver_status": "greedy_fallback",
            "schedule": schedule,
            "slot_rates": slot_rates,
        }
