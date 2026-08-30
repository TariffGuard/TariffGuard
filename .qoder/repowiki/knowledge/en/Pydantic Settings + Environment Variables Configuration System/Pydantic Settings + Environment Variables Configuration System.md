---
kind: configuration_system
name: Pydantic Settings + Environment Variables Configuration System
category: configuration_system
scope:
    - '**'
source_files:
    - backend/app/core/config.py
    - backend/app/core/database.py
    - backend/main.py
    - docker-compose.yml
    - .env.example
    - frontend/next.config.ts
---

## What system/approach is used

The TariffGuard platform uses a **pydantic-settings `BaseSettings`** configuration model for the FastAPI backend, with environment variables as the primary source of truth. The `.env` file (loaded via pydantic-settings) and Docker Compose `environment:` blocks are the two mechanisms by which runtime values are injected. The frontend (Next.js) has no application-level configuration module — its `next.config.ts` is effectively empty, so there is no equivalent frontend configuration system in this repo.

## Key files and packages

- `backend/app/core/config.py` — defines the `Settings` class using `pydantic_settings.BaseSettings`, declaring all configurable keys with defaults and loading `.env`.
- `backend/app/core/database.py` — reads `DATABASE_URL` directly via `os.getenv()` (bypassing the `Settings` object) to build the SQLAlchemy engine; falls back to SQLite when the URL does not start with `mysql`.
- `backend/main.py` — wires up the FastAPI app; also demonstrates ad-hoc env access via `os.getenv("DATABASE_URL", ...)` on the `/api/test` endpoint.
- `docker-compose.yml` — injects `DATABASE_URL`, `ENVIRONMENT`, `DEBUG`, `ALCHEMY_KEY`, `QWEN_API_KEY` into the backend container; hardcodes MySQL credentials for the `db` service.
- `.env.example` — documents the expected environment variable names (`ALCHEMY_KEY`, `QWEN_API_KEY`, `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`).

## Architecture and conventions

1. **Single typed settings object**: All app-level configuration is declared in `app.core.config.Settings`. Each field has a Python type and a default value, so missing env vars resolve to sensible development defaults (e.g. `DEBUG: True`, `ENVIRONMENT: "development"`, local MySQL DSN).
2. **`.env` file binding**: The `Settings.Config.env_file = ".env"` declaration tells pydantic-settings to load from a `.env` file at import time. `case_sensitive = True` means variable names must match exactly.
3. **Docker Compose overrides**: In production-like runs, `docker-compose.yml` supplies the same keys under `environment:` for the `backend` service, overriding any local `.env` values. The compose file also passes secrets through `${VAR:-default}` syntax (e.g. `${ALCHEMY_KEY:-dummy_key}`), allowing optional secrets without failing startup.
4. **Database config bypasses Settings**: `database.py` reads `DATABASE_URL` directly with `os.getenv()`, not via `settings.DATABASE_URL`. This creates a second, independent path for database configuration that ignores the typed `Settings` model.
5. **No feature flags or layered precedence**: There is no code implementing a priority order (e.g. CLI > env > file > defaults beyond pydantic-settings' built-in behavior). The only documented precedence is `.env` → Docker Compose `environment:` (which is how Docker itself resolves it).
6. **Frontend has no runtime config**: `frontend/next.config.ts` exports an empty config object. No `process.env.*` usage was found in the Next.js client-side code, so the frontend does not participate in this configuration system.

## Conventions and constraints

- **All backend configuration keys are uppercase**, matching the convention enforced by `case_sensitive = True` in `Settings.Config`.
- **Optional secrets use `Optional[str] = None`** in the `Settings` model (e.g. `ALCHEMY_KEY`, `QWEN_API_KEY`), signaling they may be absent in some environments.
- **Environment-specific toggles**: `ENVIRONMENT` and `DEBUG` are present in `Settings` and set in `docker-compose.yml` (`ENVIRONMENT: development`, `DEBUG: "true"`), but are never read anywhere in the codebase — they exist as declarative configuration slots only.
- **Database URL format**: When `DATABASE_URL` starts with `mysql`, SQLAlchemy is configured with connection pooling options (`pool_pre_ping=True`, `pool_recycle=3600`); otherwise it falls back to SQLite with `check_same_thread=False`. This is an implicit constraint enforced in `database.py`.
- **Secrets are documented, not committed**: `.env.example` lists the expected secret keys but contains placeholder values; actual secrets are expected to be provided via Docker Compose environment variables or a real `.env` file not tracked by git (per `.gitignore`).
- **Hardcoded fallbacks**: If `DATABASE_URL` is unset, `database.py` falls back to `sqlite:///./test.db`; if `ALCHEMY_KEY` / `QWEN_API_KEY` are unset, they resolve to `None` in `Settings` or `dummy_key` via Docker's `${VAR:-default}` substitution.