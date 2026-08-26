
# TariffGuard

AI-Powered Energy & Production Optimization Platform

## Overview

TariffGuard is a decision-support platform for small textile factories that converts electricity tariffs, production requirements, solar availability, and maximum-demand constraints into an actionable production schedule.

## Tech Stack

- **Backend:** Python 3.11, FastAPI, SQLAlchemy
- **Database:** MySQL 8.0
- **Container:** Docker, Docker Compose
- **Testing:** Pytest
- **Cloud:** Alibaba Cloud (RDS, OSS, ECS)
- **AI:** Qwen (Alibaba Cloud Model Studio)

## Features

### Core Features

- Factory management (CRUD)
- Machine management (CRUD)
- Production order management (CRUD)
- Tariff management (Peak/Off-Peak/Night rates)
- Meter reading tracking
- Schedule optimization
- Cost calculation
- Peak demand alerts
- Solar generation tracking
- Daily/Monthly reports

### Authentication & Authorization

- User registration/login/logout
- Token-based authentication
- Role-based access control:
  - Owner: Full access including deletion
  - Manager: Create/update machines, orders, factories
  - Supervisor: View and manage schedules
  - Viewer: Read-only access

### Business Logic

- Cost Calculator (tariff-based)
- Schedule Optimizer (finds cheapest time slots)
- Alert System (peak demand, deadlines, solar)
- Dashboard API (summary statistics)

## Quick Start

### Prerequisites

- Docker Desktop
- Git

### Setup

1. Clone the repository:


git clone https://github.com/musfirah111/TariffGuard.git
cd TariffGuard


2. Start Docker containers:

docker-compose up -d --build

3. Seed demo data:


docker-compose exec backend python seed.py


4. Access the API:

- Swagger UI: http://localhost:8000/docs
- Dashboard: http://localhost:8000/dashboard
- Health check: http://localhost:8000/health

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| POST | /api/auth/logout | Logout user |

### Factories

| Method | Endpoint | Access |
|--------|----------|--------|
| POST | /api/factories/ | Manager/Owner |
| GET | /api/factories/ | Any authenticated |
| GET | /api/factories/{id} | Any authenticated |
| PUT | /api/factories/{id} | Manager/Owner |
| DELETE | /api/factories/{id} | Owner only |

### Machines

| Method | Endpoint | Access |
|--------|----------|--------|
| POST | /api/machines/ | Manager/Owner |
| GET | /api/machines/ | Any authenticated |
| GET | /api/machines/{id} | Any authenticated |
| DELETE | /api/machines/{id} | Manager/Owner |

### Production Orders

| Method | Endpoint | Access |
|--------|----------|--------|
| POST | /api/orders/ | Manager/Owner |
| GET | /api/orders/ | Any authenticated |
| GET | /api/orders/{id} | Any authenticated |
| DELETE | /api/orders/{id} | Manager/Owner |

### Tariffs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/tariffs/ | Create tariff |
| GET | /api/tariffs/ | List tariffs |
| GET | /api/tariffs/{id} | Get tariff |
| PUT | /api/tariffs/{id} | Update tariff |
| DELETE | /api/tariffs/{id} | Delete tariff |

### Meter Readings

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/meter-readings/ | Create reading |
| GET | /api/meter-readings/ | List readings |
| GET | /api/meter-readings/stats/{factory_id} | Reading statistics |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/summary | Overall summary |
| GET | /api/dashboard/factory/{id} | Factory-specific dashboard |

### Optimization

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/optimize/schedule/{factory_id} | Generate optimized schedule |
| POST | /api/optimize/compare/{factory_id} | Compare baseline vs optimized |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/reports/daily/{factory_id} | Daily report |
| GET | /api/reports/monthly/{factory_id} | Monthly report |
| GET | /api/reports/summary/{factory_id} | Factory summary |

### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/alerts/ | List alerts |
| POST | /api/alerts/generate/{factory_id} | Generate alerts |
| GET | /api/alerts/unresolved/{factory_id} | Get unresolved alerts |
| PUT | /api/alerts/{id} | Update alert |
| GET | /api/alerts/stats/{factory_id} | Alert statistics |

## Running Tests


docker-compose exec backend pytest -v


## Demo Users

| Username | Password | Role |
|----------|----------|------|
| admin | password123 | Owner |
| viewer | password123 | Viewer |

## Project Structure

```
tariffguard/
├── backend/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── core/          # Core config, database
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   └── services/      # Business logic
│   ├── tests/             # Test files
│   ├── static/            # Frontend files
│   ├── main.py            # FastAPI app
│   ├── seed.py            # Seed data script
│   └── Dockerfile
├── docs/
│   ├── API.md
│   └── postman_collection.json
├── docker-compose.yml
└── README.md
```

## Environment Variables

env
DATABASE_URL=mysql+pymysql://tariffguard_user:tariffguard_pass@db:3306/tariffguard
ENVIRONMENT=development
DEBUG=true


## Team

- Frontend Engineer - React/Next.js dashboard
- Backend Engineer - FastAPI, database, business logic
- AI/ML Engineer - Forecasting, optimization algorithms
- Cloud & Data Engineer - Alibaba Cloud infrastructure

## Acknowledgments

- Bano Qabil AI Hackathon
- Alibaba Cloud & Cognix
```

