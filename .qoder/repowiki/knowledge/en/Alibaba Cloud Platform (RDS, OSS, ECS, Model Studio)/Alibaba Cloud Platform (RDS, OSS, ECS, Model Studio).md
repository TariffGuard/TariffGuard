---
kind: external_dependency
name: Alibaba Cloud Platform (RDS, OSS, ECS, Model Studio)
slug: alibaba-cloud
category: external_dependency
category_hints:
    - vendor_identity
    - client_constraint
scope:
    - '**'
---

### Alibaba Cloud
- **Role**: Target deployment platform and AI service provider for TariffGuard. The project is built for the Bano Qabil Alibaba Cloud AI Hackathon and targets Alibaba Cloud RDS (MySQL), OSS, and ECS for hosting.
- **Integration points**:
  - `ALCHEMY_KEY` — Alibaba Cloud API key injected via Docker Compose env var into the backend container; currently unused by code but reserved for future Alibaba Cloud SDK calls.
  - `QWEN_API_KEY` — Alibaba Cloud Model Studio (Qwen) API key; intended for an AI explanation layer that turns optimizer results into plain-language schedules.
- **Client constraint**: Keys are supplied at runtime through environment variables; no SDK client is wired in yet, so any future Alibaba Cloud integration must read these from `app.core.config.Settings`.
- **Direction**: When adding Alibaba Cloud services, follow the existing pattern of declaring the env var in `config.py`, injecting it via `docker-compose.yml`, and reading it through `settings`.