"""
Synthetic Data Generator for TariffGuard
Produces 60–90 days of realistic hourly meter readings and weather data
for a demo textile factory in Faisalabad, Pakistan.

All generated data is clearly labeled as synthetic.
"""

import math
import random
import logging
from datetime import datetime, timedelta, date
from typing import List, Dict

from sqlalchemy.orm import Session

from app.models.factory import Factory
from app.models.machine import Machine
from app.models.production_order import ProductionOrder
from app.models.tariff import Tariff
from app.models.meter_reading import MeterReading
from app.models.weather_reading import WeatherReading
from app.services.weather_service import WeatherService

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# Machine catalogue — representative small textile unit
# ------------------------------------------------------------------
MACHINE_CATALOGUE = [
    {"name": "Dyeing Machine 01", "machine_type": "Dyeing", "power_kw": 45,
     "min_run_minutes": 120, "setup_minutes": 30, "shiftable": True,
     "priority": 1, "available_from": "08:00", "available_to": "22:00"},
    {"name": "Dyeing Machine 02", "machine_type": "Dyeing", "power_kw": 45,
     "min_run_minutes": 120, "setup_minutes": 30, "shiftable": True,
     "priority": 1, "available_from": "08:00", "available_to": "22:00"},
    {"name": "Spinning Machine 01", "machine_type": "Spinning", "power_kw": 30,
     "min_run_minutes": 60, "setup_minutes": 15, "shiftable": True,
     "priority": 2, "available_from": "08:00", "available_to": "22:00"},
    {"name": "Spinning Machine 02", "machine_type": "Spinning", "power_kw": 30,
     "min_run_minutes": 60, "setup_minutes": 15, "shiftable": True,
     "priority": 2, "available_from": "08:00", "available_to": "22:00"},
    {"name": "Weaving Machine 01", "machine_type": "Weaving", "power_kw": 25,
     "min_run_minutes": 90, "setup_minutes": 20, "shiftable": False,
     "priority": 1, "available_from": "08:00", "available_to": "22:00"},
    {"name": "Weaving Machine 02", "machine_type": "Weaving", "power_kw": 25,
     "min_run_minutes": 90, "setup_minutes": 20, "shiftable": False,
     "priority": 1, "available_from": "08:00", "available_to": "22:00"},
    {"name": "Finishing Machine 01", "machine_type": "Finishing", "power_kw": 20,
     "min_run_minutes": 45, "setup_minutes": 10, "shiftable": True,
     "priority": 3, "available_from": "08:00", "available_to": "22:00"},
    {"name": "Packaging Machine 01", "machine_type": "Packaging", "power_kw": 15,
     "min_run_minutes": 30, "setup_minutes": 5, "shiftable": True,
     "priority": 3, "available_from": "08:00", "available_to": "22:00"},
    {"name": "Knitting Machine 01", "machine_type": "Knitting", "power_kw": 22,
     "min_run_minutes": 90, "setup_minutes": 20, "shiftable": True,
     "priority": 2, "available_from": "08:00", "available_to": "22:00"},
    {"name": "Bleaching Machine 01", "machine_type": "Bleaching", "power_kw": 35,
     "min_run_minutes": 60, "setup_minutes": 15, "shiftable": True,
     "priority": 1, "available_from": "09:00", "available_to": "20:00"},
]

# Process types for order generation
PROCESS_TYPES = ["Dyeing", "Spinning", "Weaving", "Finishing", "Packaging",
                 "Knitting", "Bleaching"]

# Machine type → compatible machine indices (0-based into MACHINE_CATALOGUE)
MACHINE_TYPE_MAP: Dict[str, List[int]] = {}
for _idx, _m in enumerate(MACHINE_CATALOGUE):
    MACHINE_TYPE_MAP.setdefault(_m["machine_type"], []).append(_idx)


class SyntheticDataGenerator:
    """
    Generate a realistic 60–90 day dataset for a demo textile factory.

    Usage::

        gen = SyntheticDataGenerator(db, days=90)
        gen.generate()
    """

    def __init__(
        self,
        db: Session,
        days: int = 90,
        seed: int = 42,
    ):
        self.db = db
        self.days = days
        self.rng = random.Random(seed)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate(self) -> Dict:
        """Run the full generation pipeline and return summary stats."""
        logger.info("Starting synthetic data generation (%d days)", self.days)

        factory = self._create_factory()
        machines = self._create_machines(factory.id)
        tariffs = self._create_tariffs()
        weather_records = self._generate_weather(factory.id)
        meter_readings = self._generate_meter_readings(
            factory, machines, weather_records
        )
        orders = self._create_production_orders(factory.id)

        summary = {
            "factory_id": factory.id,
            "factory_name": factory.name,
            "machines": len(machines),
            "tariffs": len(tariffs),
            "weather_records": len(weather_records),
            "meter_readings": len(meter_readings),
            "production_orders": len(orders),
            "days": self.days,
            "data_source": "synthetic",
        }
        logger.info("Synthetic data generation complete: %s", summary)
        return summary

    # ------------------------------------------------------------------
    # Factory
    # ------------------------------------------------------------------

    def _create_factory(self) -> Factory:
        factory = Factory(
            name="Faisalabad Textile Unit 01",
            location="Faisalabad, Pakistan",
            tariff_category="Industrial",
            sanctioned_load_kw=250,
            solar_capacity_kw=100,
            operating_hours="08:00-22:00",
            working_days="Mon-Sat",
        )
        self.db.add(factory)
        self.db.commit()
        self.db.refresh(factory)
        logger.info("Factory created: %s (ID %d)", factory.name, factory.id)
        return factory

    # ------------------------------------------------------------------
    # Machines
    # ------------------------------------------------------------------

    def _create_machines(self, factory_id: int) -> List[Machine]:
        machines = []
        for spec in MACHINE_CATALOGUE:
            m = Machine(factory_id=factory_id, **spec)
            self.db.add(m)
            machines.append(m)
        self.db.commit()
        for m in machines:
            self.db.refresh(m)
        logger.info("Created %d machines", len(machines))
        return machines

    # ------------------------------------------------------------------
    # Tariffs — configurable, matching NEPRA industrial TOU structure
    # ------------------------------------------------------------------

    def _create_tariffs(self) -> List[Tariff]:
        today = date.today()
        tariff_specs = [
            {
                "category": "Industrial",
                "period_name": "Off-Peak",
                "start_time": "00:00",
                "end_time": "18:00",
                "rate_pkr_per_kwh": 25.0,
                "fixed_charge_pkr_per_kw": 400,
                "effective_from": today - timedelta(days=self.days),
                "source": "NEPRA (synthetic demo)",
            },
            {
                "category": "Industrial",
                "period_name": "Peak",
                "start_time": "18:00",
                "end_time": "22:00",
                "rate_pkr_per_kwh": 35.0,
                "fixed_charge_pkr_per_kw": 400,
                "effective_from": today - timedelta(days=self.days),
                "source": "NEPRA (synthetic demo)",
            },
            {
                "category": "Industrial",
                "period_name": "Night",
                "start_time": "22:00",
                "end_time": "00:00",
                "rate_pkr_per_kwh": 20.0,
                "fixed_charge_pkr_per_kw": 400,
                "effective_from": today - timedelta(days=self.days),
                "source": "NEPRA (synthetic demo)",
            },
        ]
        tariffs = []
        for spec in tariff_specs:
            t = Tariff(**spec)
            self.db.add(t)
            tariffs.append(t)
        self.db.commit()
        for t in tariffs:
            self.db.refresh(t)
        logger.info("Created %d tariff periods", len(tariffs))
        return tariffs

    # ------------------------------------------------------------------
    # Weather — delegates to WeatherService (Open-Meteo or fallback)
    # ------------------------------------------------------------------

    def _generate_weather(self, factory_id: int) -> List[Dict]:
        end_date = date.today()
        start_date = end_date - timedelta(days=self.days)

        ws = WeatherService(self.db, factory_id)
        records = ws.fetch_and_store(start_date, end_date)
        logger.info("Weather records: %d", len(records))
        return records

    # ------------------------------------------------------------------
    # Meter readings — driven by weather and machine activity
    # ------------------------------------------------------------------

    def _generate_meter_readings(
        self,
        factory: Factory,
        machines: List[Machine],
        weather_records: List[Dict],
    ) -> List[MeterReading]:
        """
        Generate hourly meter readings for the full date range.

        Load model:
          base_load(hour) + machine_activity(hour) + hvac(temp) + noise

        Solar model:
          shortwave_radiation × solar_capacity_kw / 1000 × efficiency
        """
        readings: List[MeterReading] = []

        # Build a timestamp→weather lookup
        wx_map: Dict[datetime, Dict] = {}
        for rec in weather_records:
            ts = rec["timestamp"]
            if isinstance(ts, str):
                ts = datetime.fromisoformat(ts)
            wx_map[ts.replace(minute=0, second=0, microsecond=0)] = rec

        end_date = date.today()
        start_date = end_date - timedelta(days=self.days)
        current = datetime.combine(start_date, datetime.min.time())
        end_dt = datetime.combine(end_date, datetime.min.time()) + timedelta(hours=23)

        solar_capacity = factory.solar_capacity_kw or 100
        # PV system efficiency (inverter + wiring + temperature derating)
        pv_efficiency = 0.15  # 15% of W/m² × panel area → kW; simplified

        # Pre-compute total installed machine power for load simulation
        total_machine_power = sum(m.power_kw for m in machines)  # ~257 kW
        sanctioned = factory.sanctioned_load_kw  # 250 kW

        # Inject a few high-demand events for risk detection training
        spike_days = set(
            self.rng.sample(
                range(self.days), min(8, self.days)
            )
        )

        hour_index = 0
        while current <= end_dt:
            hour = current.hour
            day_offset = (current.date() - start_date).days
            ts = current.replace(minute=0, second=0, microsecond=0)

            wx = wx_map.get(ts, {})
            temp_c = wx.get("temperature_c", 30.0)
            shortwave = wx.get("shortwave_radiation_wm2", 0)
            cloud_cover = wx.get("cloud_cover_pct", 20)

            # --- Base factory load (lighting, control systems, etc.) ---
            if 8 <= hour <= 22:
                base_load = 40 + self.rng.gauss(0, 3)
            else:
                base_load = 15 + self.rng.gauss(0, 2)

            # --- Machine activity load ---
            # Working hours: most machines active; off-hours: minimal
            if 8 <= hour <= 18:
                activity_fraction = 0.55 + self.rng.uniform(-0.1, 0.15)
            elif 18 <= hour <= 22:
                activity_fraction = 0.30 + self.rng.uniform(-0.05, 0.1)
            else:
                activity_fraction = 0.05 + self.rng.uniform(0, 0.05)

            machine_load = total_machine_power * max(0, activity_fraction)

            # Demand spike injection
            if day_offset in spike_days and 10 <= hour <= 16:
                machine_load *= self.rng.uniform(1.3, 1.6)

            # --- HVAC / cooling load (temperature-dependent) ---
            if temp_c > 30:
                hvac_load = (temp_c - 30) * 3.5 + self.rng.gauss(0, 2)
            elif temp_c < 15:
                hvac_load = (15 - temp_c) * 2.0 + self.rng.gauss(0, 1)
            else:
                hvac_load = 5 + self.rng.gauss(0, 1)
            hvac_load = max(0, hvac_load)

            # --- Total kWh (≈ kW for 1-hour interval) ---
            total_kw = base_load + machine_load + hvac_load
            total_kw = max(10, total_kw)  # never below 10 kW

            # Cap at sanctioned load (but allow occasional near-limit)
            if total_kw > sanctioned * 1.02:
                total_kw = sanctioned * self.rng.uniform(0.95, 1.02)

            kwh = total_kw * self.rng.uniform(0.95, 1.05)

            # --- Solar generation ---
            # PV output = radiation (W/m²) × capacity / reference_irradiance × eff
            reference_irradiance = 1000  # W/m² STC
            solar_kw = (
                shortwave * solar_capacity * pv_efficiency
                / (reference_irradiance * pv_efficiency)
            )
            # Simplify: solar_kw ≈ shortwave/1000 × solar_capacity × 0.85
            solar_kw = shortwave / 1000 * solar_capacity * 0.85
            solar_kw = max(0, solar_kw)
            # Solar can't exceed total consumption (export capped at 0 grid)
            solar_kwh = min(solar_kw, kwh)

            # --- Electrical parameters ---
            voltage = 400 + self.rng.gauss(0, 5)
            current_a = total_kw / (voltage * 0.001732)  # 3-phase: P = √3 × V × I
            pf = 0.85 + self.rng.gauss(0, 0.03)
            pf = max(0.70, min(0.98, pf))

            reading = MeterReading(
                factory_id=factory.id,
                timestamp=ts,
                kwh=round(kwh, 2),
                kw=round(total_kw, 2),
                solar_kwh=round(solar_kwh, 2),
                voltage=round(voltage, 1),
                current=round(current_a, 2),
                power_factor=round(pf, 3),
            )
            readings.append(reading)

            current += timedelta(hours=1)
            hour_index += 1

        # Bulk insert in batches
        batch_size = 500
        for i in range(0, len(readings), batch_size):
            self.db.bulk_save_objects(readings[i : i + batch_size])
            self.db.commit()

        logger.info("Created %d meter readings", len(readings))
        return readings

    # ------------------------------------------------------------------
    # Production orders — spread across the planning horizon
    # ------------------------------------------------------------------

    def _create_production_orders(self, factory_id: int) -> List[ProductionOrder]:
        orders: List[ProductionOrder] = []
        now = datetime.now()
        start = now - timedelta(days=self.days)

        order_counter = 1
        current_date = start

        while current_date < now:
            # Generate 2–4 orders per day
            n_orders = self.rng.randint(2, 4)
            for _ in range(n_orders):
                process = self.rng.choice(PROCESS_TYPES)
                machine_indices = MACHINE_TYPE_MAP.get(process, [0])
                # Map catalogue indices → DB machine IDs (1-based)
                machine_ids = [idx + 1 for idx in machine_indices]

                duration = self.rng.choice([60, 90, 120, 150, 180, 240, 300])
                priority = self.rng.choice([1, 1, 2, 2, 2, 3])
                quantity = self.rng.randint(100, 5000)

                # Earliest start: working hours on the order day
                earliest_hour = self.rng.randint(8, 14)
                earliest_start = current_date.replace(
                    hour=earliest_hour, minute=0, second=0, microsecond=0
                )

                # Deadline: same day or next day, within operating hours
                deadline_offset = self.rng.choice([4, 6, 8, 10, 12, 24])
                deadline = earliest_start + timedelta(hours=deadline_offset)

                order_no = f"ORD-{order_counter:03d}"
                locked = self.rng.random() < 0.15  # 15% locked
                status = self.rng.choice(
                    ["pending", "pending", "pending", "completed", "in_progress"]
                )

                order = ProductionOrder(
                    factory_id=factory_id,
                    order_no=order_no,
                    process=process,
                    quantity=quantity,
                    duration_minutes=duration,
                    earliest_start=earliest_start,
                    deadline=deadline,
                    priority=priority,
                    machine_options=machine_ids,
                    locked=locked,
                    status=status,
                )
                self.db.add(order)
                orders.append(order)
                order_counter += 1

            current_date += timedelta(days=1)

        self.db.commit()
        for o in orders:
            self.db.refresh(o)
        logger.info("Created %d production orders", len(orders))
        return orders
