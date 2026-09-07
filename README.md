
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
