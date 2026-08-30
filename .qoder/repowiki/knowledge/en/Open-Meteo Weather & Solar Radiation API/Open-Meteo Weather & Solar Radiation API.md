---
kind: external_dependency
name: Open-Meteo Weather & Solar Radiation API
slug: open-meteo
category: external_dependency
category_hints:
    - sdk_real_api
    - framework_behavior
scope:
    - '**'
---

### Open-Meteo
- **Role**: Free, no-API-key weather and solar radiation data source for Faisalabad, Pakistan (31.4°N, 73.1°E). Intended to feed both the load forecasting model and the physics-based solar estimation module.
- **Planned integration**: A new `weather_service.py` would call Open-Meteo's historical endpoint to backfill 60–90 days of hourly temperature, cloud cover, and solar radiation, then cache/store them alongside meter readings so the forecaster can use weather features.
- **Framework behavior**: Use the historical forecast endpoint (not the real-time one) to populate training data; treat weather as an input feature, not a hard dependency — synthetic fallbacks should be supported if the API is down.
- **Verify exact API/params against official docs** before implementing the HTTP client.