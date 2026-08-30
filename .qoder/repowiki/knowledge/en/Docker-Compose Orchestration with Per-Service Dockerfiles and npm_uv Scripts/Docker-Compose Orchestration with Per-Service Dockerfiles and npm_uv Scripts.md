---
kind: build_system
name: Docker-Compose Orchestration with Per-Service Dockerfiles and npm/uv Scripts
category: build_system
scope:
    - '**'
source_files:
    - docker-compose.yml
    - backend/Dockerfile
    - backend/requirements.txt
    - frontend/package.json
    - frontend/next.config.ts
    - .env.example
---

## Build System Overview

TariffGuard uses a lightweight, container-first build system centered on **Docker Compose** to orchestrate the FastAPI backend, MySQL database, and Next.js frontend. There is no Makefile, CI pipeline, or centralized build script at the repository root — each service manages its own dependencies and has its own entry point.

### Services and Entrypoints

- **Backend (FastAPI)**: Built via `backend/Dockerfile` from `python:3.11-slim`. Dependencies are pinned in `backend/requirements.txt` (FastAPI 0.104.1, SQLAlchemy 2.0.23, PyMySQL, cryptography, pydantic, pytest, etc.). The image installs system packages (`gcc`, `g++`, `curl`) for native extensions, copies `requirements.txt` first for layer caching, then the rest of the app, creates a non-root `appuser` (uid 1000), exposes port 8000, and runs `uvicorn main:app --host 0.0.0.0 --port 8000`.
- **Database**: `mysql:8.0` image with hardcoded credentials (`tariffguard_user` / `tariffguard_pass`, database `tariffguard`). A healthcheck uses `mysqladmin ping` with a 10s interval and 10 retries. Data persisted to a named volume `mysql_data`.
- **Frontend (Next.js)**: No Dockerfile; development is driven by `npm run dev` (`next dev`), production build by `next build`, serve by `next start`. Linting via `eslint`, tests via `jest` (jsdom environment). Configuration lives in `frontend/package.json`, `next.config.ts` (empty/default), `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `jest.config.js`, `jest.setup.js`.

### Orchestration

`docker-compose.yml` defines three services on a shared bridge network `tariffguard_network`:

1. `db` — starts first and must be healthy before dependents.
2. `backend` — depends on `db` with `condition: service_healthy`, mounts `./backend:/app` as a bind volume for hot reload during development, forwards port 8000, and passes env vars (`DATABASE_URL`, `ENVIRONMENT=development`, `DEBUG=true`, plus `ALCHEMY_KEY` and `QWEN_API_KEY` sourced from host env).
3. Frontend is not defined in compose; developers run it separately via `npm run dev` against the backend's API.

### Environment & Secrets

- `.env.example` exists at the repo root but is not referenced directly by compose; instead compose injects values through the `environment:` block, using `${ALCHEMY_KEY:-dummy_key}` style defaults so the stack runs without a host `.env` file.
- Database connection string is hard-coded into compose (`mysql+pymysql://tariffguard_user:tariffguard_pass@db:3306/tariffguard`).

### Versioning & Artifacts

- Backend versioning is implicit (Python image tag + git commit); no explicit version bump script.
- Frontend version is declared in `package.json` (`"version": "0.1.0"`) but there is no publish/release step configured.
- No multi-stage builds, no image tagging strategy, no registry push, no release artifacts beyond the source tree.

### Testing

- Backend: `pytest==7.4.3` installed alongside runtime deps; test files under `backend/tests/` (`test_complete.py`, `test_health.py`) and `backend/test_auth.py`.
- Frontend: Jest with `@testing-library/react` and `@testing-library/jest-dom`; component test under `frontend/tests/components/kpi_card.test.tsx`.

### Conventions Observed

- Each service is self-contained: dependencies declared next to the code (`requirements.txt`, `package.json`), containerized independently.
- Development workflow relies on bind-mount volumes (`./backend:/app`) and `uvicorn --reload` rather than rebuild-on-change.
- No CI/CD configuration exists (no `.github/workflows`, no Jenkinsfile, no GitHub Actions) — builds are local-only.
- No Makefile or top-level shell scripts; all commands are invoked via `docker compose up`, `npm run <script>`, or direct `uvicorn` invocation.