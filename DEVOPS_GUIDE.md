# 🛡️ TariffGuard — DevOps & Cloud Engineering Runbook

Welcome to the **TariffGuard** infrastructure and operations manual. This guide is curated specifically for DevOps and Platform Engineers responsible for deploying, configuring, maintaining, and scaling the TariffGuard platform.

---

## 📑 Table of Contents

1. [System Architecture & Component Scan](#1-system-architecture--component-scan)
2. [How to Run the Application](#2-how-to-run-the-application)
   - [Method A: Quick Start with Docker (Local MySQL)](#method-a-quick-start-with-docker-local-mysql)
   - [Method B: Hybrid Development (Local Backend + Local Frontend + Aiven MySQL)](#method-b-hybrid-development)
   - [Method C: Full Docker with Cloud Database](#method-c-full-docker-with-cloud-database)
3. [Aiven Cloud MySQL Setup Guide](#3-aiven-cloud-mysql-setup-guide)
   - [Step 1: Provision Aiven MySQL Service](#step-1-provision-aiven-mysql-service)
   - [Step 2: Collect Credentials & Certificates](#step-2-collect-credentials--certificates)
   - [Step 3: Configure Database URL with SSL](#step-3-configure-database-url-with-ssl)
   - [Step 4: Verify Connectivity](#step-4-verify-connectivity)
   - [Step 5: Run Schema Initialization & Seeder](#step-5-run-schema-initialization--seeder)
   - [Step 6: Train XGBoost Forecasting Model](#step-6-train-xgboost-forecasting-model)
4. [DevOps Action Plan & Production Roadmap](#4-devops-action-plan--production-roadmap)
   - [Phase 1: Database & Cloud Persistence](#phase-1-database--cloud-persistence)
   - [Phase 2: CI/CD Pipeline Automation](#phase-2-cicd-pipeline-automation)
   - [Phase 3: Containerization & Cloud Deployment](#phase-3-containerization--cloud-deployment)
   - [Phase 4: Monitoring, Backups & Observability](#phase-4-monitoring-backups--observability)
5. [CI/CD GitHub Actions Workflow Template](#5-cicd-github-actions-workflow-template)
6. [Environment Variable Reference](#6-environment-variable-reference)
7. [Operational Troubleshooting](#7-operational-troubleshooting)

---

## 1. System Architecture & Component Scan

TariffGuard is an AI-powered energy scheduling and tariff cost optimization platform built for industrial manufacturers (textile factories).

```mermaid
flowchart TD
    subgraph ClientLayer["Frontend Layer (Port 3000)"]
        UI["Next.js 16 (React 19 + Tailwind CSS)"]
    end

    subgraph APILayer["Backend Layer (Port 8000)"]
        FastAPI["FastAPI App (Python 3.11)"]
        Optimizer["OR-Tools CP-SAT Solver"]
        ML["XGBoost Load Forecaster"]
        AI["Qwen LLM / DashScope AI Explainer"]
        Weather["Open-Meteo API Client"]
    end

    subgraph DataLayer["Data Layer"]
        AivenDB[("Aiven Cloud MySQL 8.0\n(TLS/SSL Encrypted)")]
        LocalDB[("Local Docker MySQL\n(Optional Dev)")]
    end

    UI -->|"REST / JSON (Bearer Token)"| FastAPI
    FastAPI --> Optimizer
    FastAPI --> ML
    FastAPI --> AI
    FastAPI --> Weather
    FastAPI -->|"SQLAlchemy 2.0 + PyMySQL"| AivenDB
    FastAPI -.->|"Fallback"| LocalDB
```

### Core Components Summary

| Component | Technology | Default Port | Description |
|-----------|------------|--------------|-------------|
| **Backend API** | FastAPI / Python 3.11 | `8000` | REST API, Business logic, Auth, Optimization endpoints |
| **Frontend Web** | Next.js 16 / React 19 | `3000` | Responsive web dashboard, schedules, alerts, analytics |
| **Database** | MySQL 8.0 / Aiven Cloud | `3306` / Aiven Port | Stores factories, machines, orders, meter readings, tariffs, users |
| **Optimization** | Google OR-Tools (CP-SAT) | Embedded | Integer programming solver for cheapest production schedule |
| **Forecasting** | XGBoost + scikit-learn | Embedded | 24-hour predictive load forecasting |
| **AI Advisor** | Qwen (Alibaba Cloud DashScope) | Cloud API | Natural language explanations for shift supervisors |

---

## 2. How to Run the Application

### Method A: Quick Start with Docker (Local MySQL)

If you have **Docker Desktop** installed and want to test everything locally:

1. **Double-click or run `start.bat`** (Windows):
   ```cmd
   start.bat
   ```
2. **Or run manually via terminal**:
   ```bash
   # 1. Start containers
   docker compose up -d --build

   # 2. Seed demo data (90 days of factory & meter readings)
   docker compose exec -T backend python -m seed

   # 3. Train the XGBoost forecasting model
   docker compose exec -T backend python train_model.py

   # 4. Start Next.js frontend
   cd frontend
   npm install
   npm run dev
   ```

3. **Access URLs**:
   - Frontend UI: [http://localhost:3000](http://localhost:3000)
   - Backend API Docs (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)
   - Health Check: [http://localhost:8000/health](http://localhost:8000/health)

---

### Method B: Hybrid Development (Local Backend + Frontend + Aiven MySQL)

Best for rapid development without running Docker containers locally.

```bash
# 1. Clone & enter project
cd TariffGuard

# 2. Setup Backend Environment
cd backend
python -m venv venv

# Activate venv:
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt

# 3. Configure .env file in backend/.env with your Aiven Cloud MySQL URI
# Example: DATABASE_URL=mysql+pymysql://avnadmin:PASS@mysql-xxx.aivencloud.com:PORT/defaultdb?ssl_mode=REQUIRED

# 4. Verify DB connectivity & Seed data
python check_db.py
python -m seed
python train_model.py

# 5. Start Backend server
uvicorn main:app --reload --port 8000

# 6. In a new terminal, run Frontend
cd ../frontend
npm install
npm run dev
```

---

### Method C: Full Docker with Cloud Database

To run both Backend and Frontend in Docker connected to your Aiven MySQL instance:

1. Copy `.env.example` to `.env` and configure your `DATABASE_URL` pointing to Aiven.
2. Run:
   ```bash
   docker compose -f docker-compose.cloud.yml up -d --build
   ```

---

## 3. Aiven Cloud MySQL Setup Guide

Aiven provides managed, high-availability MySQL with automatic backups, TLS encryption, and global cloud regions (AWS, GCP, Azure).

### Step 1: Provision Aiven MySQL Service

1. Go to [https://console.aiven.io/](https://console.aiven.io/) and log in (or sign up with a free trial credit).
2. Click **Create Service**.
3. Select:
   - **Service**: `MySQL` (Version 8.0)
   - **Cloud Provider & Region**: Choose a region close to your users/servers (e.g. `ap-southeast-1` Singapore, `eu-central-1` Frankfurt, or `us-east-1`).
   - **Service Plan**: `Free Tier` or `Startup-4` / `Business-4`.
   - **Service Name**: `tariffguard-mysql`
4. Click **Create Service** and wait ~2-3 minutes for the service state to change from *Rebuilding* to *Running*.

---

### Step 2: Collect Credentials & Certificates

On the Aiven service overview page:
- **Host**: e.g., `mysql-1a2b3c4d-tariffguard.aivencloud.com`
- **Port**: e.g., `12345`
- **User**: `avnadmin`
- **Password**: Click *Show password* or copy the auto-generated password.
- **Database**: `defaultdb` (or create a dedicated database named `tariffguard` under the *Databases* tab).
- **SSL Mode**: Required (Aiven enforces TLS/SSL by default).

*(Optional)* Download the **CA Certificate** (`ca.pem`) from the Aiven console if you prefer path-based verification.

---

### Step 3: Configure Database URL with SSL

Construct your SQLAlchemy PyMySQL connection string in one of two ways:

#### Option 1: URL Parameter SSL (Recommended - No file download required)
```ini
DATABASE_URL="mysql+pymysql://avnadmin:YOUR_PASSWORD@mysql-1a2b3c4d-tariffguard.aivencloud.com:12345/defaultdb?ssl_mode=REQUIRED"
```

#### Option 2: Downloaded `ca.pem` Certificate
Place `ca.pem` in `backend/ca.pem` and set:
```ini
DATABASE_URL="mysql+pymysql://avnadmin:YOUR_PASSWORD@mysql-1a2b3c4d-tariffguard.aivencloud.com:12345/defaultdb"
DB_SSL_CA="ca.pem"
```

---

### Step 4: Verify Connectivity

Run the included verification tool to test the cloud connection:

```bash
cd backend
python check_db.py
```

Expected Output:
```text
============================================================
  TariffGuard — Database Connectivity & Table Inspector
============================================================
  Target Engine: mysql+pymysql://mysql-xxxx.aivencloud.com:12345/defaultdb
============================================================
  [SUCCESS] Database connection established successfully!
```

---

### Step 5: Run Schema Initialization & Seeder

Initialize tables and populate realistic demo data for testing:

```bash
cd backend
python -m seed --days 90
```

This generates:
- Factory record with sanctioned load (250 kW) and solar capacity (100 kW).
- Machine inventory (Dyeing, Weaving, Spinning, Finishing machines with power profiles).
- Time-of-Use electricity tariffs (Peak, Off-Peak, Night rates).
- 90 days of hourly solar irradiation and ambient temperature data.
- 90 days of meter readings and active production orders.

---

### Step 6: Train XGBoost Forecasting Model

Train the load prediction model using the newly seeded Aiven database:

```bash
cd backend
python train_model.py
```

This serializes the trained model into `backend/app/services/xgboost_load_model.joblib` which is consumed by the Schedule Optimizer.

---

## 4. DevOps Action Plan & Production Roadmap

As the DevOps Engineer, here is your implementation checklist:

### Phase 1: Database & Cloud Persistence (Now)
- [x] Integrate PyMySQL SSL compatibility for Aiven in `backend/app/core/database.py`.
- [x] Create `.env.example` templates across root, backend, and frontend.
- [x] Build database inspector tool (`check_db.py`).
- [ ] Create production database instance on Aiven.
- [ ] Configure Aiven IP Allowlist (Firewall) to allow only your backend application servers / NAT gateways.
- [ ] Set up daily automated backups and point-in-time recovery (PITR) in Aiven console.

### Phase 2: CI/CD Pipeline Automation
- [ ] Add GitHub Actions CI for:
  - Backend linting (`flake8` / `black`) and unit tests (`pytest`).
  - Frontend typecheck and build validation (`npm run build`).
  - Automated Docker container image build and push to Docker Hub / GitHub Container Registry (GHCR) / Alibaba Cloud ACR.

### Phase 3: Containerization & Cloud Deployment
- [x] Multi-stage `frontend/Dockerfile` created.
- [x] Multi-service `docker-compose.cloud.yml` created.
- [ ] Deploy Backend to cloud compute (e.g. AWS ECS / Alibaba Cloud ECS / Kubernetes / Render / Railway).
- [ ] Deploy Frontend to Vercel / Cloudflare Pages / Container host.
- [ ] Setup Custom Domain and SSL (Let's Encrypt / Cloudflare).

### Phase 4: Monitoring, Backups & Observability
- [ ] Configure Application Performance Monitoring (Sentry / Datadog / OpenTelemetry).
- [ ] Setup Health Check monitor for `https://api.yourdomain.com/health`.
- [ ] Setup log aggregation (Grafana Loki / AWS CloudWatch / Alibaba Cloud SLS).

---

## 5. CI/CD GitHub Actions Workflow Template

Create `.github/workflows/ci-cd.yml` to automate testing and validation on every pull request:

```yaml
name: TariffGuard CI/CD Pipeline

on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    branches: [ main, master ]

jobs:
  backend-test:
    name: Backend Lint & Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install Dependencies
        run: |
          cd backend
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Run Pytest Test Suite
        env:
          DATABASE_URL: sqlite:///./test.db
        run: |
          cd backend
          pytest -v

  frontend-build:
    name: Frontend Build Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install Frontend Dependencies
        run: |
          cd frontend
          npm ci

      - name: Run Next.js Build
        env:
          NEXT_PUBLIC_API_URL: http://localhost:8000
        run: |
          cd frontend
          npm run build
```

---

## 6. Environment Variable Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** | `sqlite:///./test.db` | SQLAlchemy MySQL/SQLite connection string |
| `DB_SSL_CA` | Optional | `None` | Path to SSL CA certificate (if using custom certificate file) |
| `ENVIRONMENT` | No | `development` | Environment name (`development`, `staging`, `production`) |
| `DEBUG` | No | `true` | Enable/disable FastAPI debug mode |
| `QWEN_API_KEY` | Optional | `None` | Alibaba Cloud DashScope API Key for AI explanation |
| `QWEN_BASE_URL` | No | `https://dashscope.aliyuncs.com/compatible-mode/v1` | OpenAI-compatible endpoint |
| `QWEN_MODEL` | No | `qwen-plus` | Qwen model identifier |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | **Yes** | `http://localhost:8000` | Base URL of the backend API |

---

## 7. Operational Troubleshooting

### Problem: SSL Connection Error (`SSL: CERTIFICATE_VERIFY_FAILED`)
- **Root Cause**: PyMySQL requires explicit SSL mode or CA verification when connecting to cloud MySQL providers like Aiven.
- **Fix**: Append `?ssl_mode=REQUIRED` to your `DATABASE_URL`. Alternatively, download `ca.pem` from Aiven and set `DB_SSL_CA=ca.pem`.

### Problem: Connection Timeout on Aiven
- **Root Cause**: Firewall / IP restriction enabled on Aiven or network port blocking.
- **Fix**: In the Aiven console, navigate to **Service settings** -> **IP Allowlist** and ensure your server IP or `0.0.0.0/0` (with strong password) is allowed during testing.

### Problem: XGBoost Model Not Found
- **Root Cause**: The load forecasting model hasn't been trained yet after a fresh database setup.
- **Fix**: Run `python backend/train_model.py`. The optimizer includes fallback heuristics, but the trained model gives the best accuracy.

### Problem: Next.js API CORS Error in Browser
- **Root Cause**: Frontend making calls to a different domain not listed in `CORSMiddleware`.
- **Fix**: FastAPI in `main.py` is configured with `allow_origins=["*"]`. Ensure `NEXT_PUBLIC_API_URL` points to the correct backend host.

---

*Authored for the TariffGuard Engineering Team.*
