---
kind: business_term
name: Business Glossary
category: business_term
scope:
    - '**'
---

### TariffGuard
- Definition：Internal name of the decision-support platform for small textile factories in Faisalabad, Pakistan that converts electricity tariffs, production requirements, solar availability, and maximum-demand constraints into an actionable production schedule.

### Bano Qabil Alibaba Cloud AI Hackathon
- Definition：The hackathon program under which TariffGuard was built; defines the project's scope, target audience (small textile manufacturers), and expected deliverables (AI-powered energy & production optimization).
- Aliases：Bano Qabil Hackathon

### MDI risk
- Definition：Maximum Demand Indicator risk — the probability or severity of exceeding the factory's contracted peak demand limit, which triggers penalties. Used as a soft constraint in scheduling decisions alongside tariff cost.
- Aliases：peak demand risk

### Meter Reading
- Definition：A time-stamped record of a factory's electricity consumption (kWh) and instantaneous power draw (kW), optionally including solar generation (solar_kwh). Used for cost calculation, peak detection, and training the load forecasting model.

### Production Order
- Definition：A manufacturing job tied to a machine type, quantity, duration, deadline, and priority. The scheduler assigns orders to time slots based on tariff rates, machine availability, and constraints.
- Aliases：order

### Tariff Period
- Definition：A time-of-day window (start_time → end_time) with an associated electricity rate (PKR/kWh). Tariffs define Peak, Off-Peak, and Night pricing used by the cost calculator and optimizer to find cheapest run windows.
- Aliases：tariff

### Schedule Optimizer
- Definition：The backend component that takes pending orders, machines, tariffs, and (future) forecasts to produce an optimized hourly production schedule minimizing energy cost while respecting machine conflicts, deadlines, and peak-demand limits.
- Aliases：optimizer

### Cost Calculator
- Definition：Deterministic module that computes energy cost from kWh × applicable tariff rate, tracks grid vs solar consumption, and identifies peak kW for alerting.

### Load Forecasting
- Definition：ML task (XGBoost/LightGBM) that predicts next-hour factory electricity demand using historical meter readings, machine schedule, hour/day-of-week features, and weather inputs (temperature, cloud cover, solar radiation).
- Aliases：demand forecast

### Solar Estimation
- Definition：Physics-based calculation of hourly PV output from solar irradiance/weather data and factory PV capacity — intentionally transparent rather than a trained neural net.

### OR-Tools CP-SAT
- Definition：Google OR-Tools Constraint Programming solver intended to replace the current greedy slot-picker. It will enforce hard constraints (machine conflicts, deadlines, locked jobs) and soft constraints (solar windows, peak demand limits).
- Aliases：CP-SAT、constraint programming solver

### Qwen Explanation Layer
- Definition：Alibaba Cloud Model Studio (Qwen) integration that consumes structured optimizer outputs and returns plain-language explanations of why a schedule changed — explicitly not performing optimization or inventing numbers.
- Aliases：AI explanation、explainability

### Synthetic Dataset Generator
- Definition：Module to produce 60–90 days of realistic hourly factory energy data (load, solar, weather features) labeled as synthetic, used to train and validate the forecasting and optimization components when real factory telemetry is unavailable.
- Aliases：synthetic data
