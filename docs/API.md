# TariffGuard API Documentation

## Base URL
http://localhost:8000


## Endpoints

### Health & Info
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Root endpoint - API info |
| GET | `/health` | Health check |
| GET | `/api/test` | Test endpoint |

### Factories
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/factories/` | Create factory |
| GET | `/api/factories/` | List all factories |
| GET | `/api/factories/{id}` | Get factory by ID |
| PUT | `/api/factories/{id}` | Update factory |
| DELETE | `/api/factories/{id}` | Delete factory |

### Machines
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/machines/` | Create machine |
| GET | `/api/machines/` | List machines |
| GET | `/api/machines/{id}` | Get machine by ID |

### Production Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders/` | Create order |
| GET | `/api/orders/` | List orders |
| GET | `/api/orders/{id}` | Get order by ID |

### Tariffs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tariffs/` | Create tariff |
| GET | `/api/tariffs/` | List tariffs |
| GET | `/api/tariffs/{id}` | Get tariff by ID |
| PUT | `/api/tariffs/{id}` | Update tariff |
| DELETE | `/api/tariffs/{id}` | Delete tariff |

### Meter Readings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/meter-readings/` | Create reading |
| GET | `/api/meter-readings/` | List readings |
| GET | `/api/meter-readings/stats/{factory_id}` | Get statistics |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Overall summary |
| GET | `/api/dashboard/factory/{id}` | Factory dashboard |

### Optimization
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/optimize/schedule/{factory_id}` | Generate optimized schedule |
| POST | `/api/optimize/compare/{factory_id}` | Compare baseline vs optimized |

## Swagger UI
Interactive API documentation available at:

http://localhost:8000/docs


## Authentication
Currently, no authentication is required for MVP. This will be added in production.

## Error Handling
All errors return JSON with:
- `status`: "error"
- `message`: Error description
- `detail`: Detailed error (debug mode only)

## Rate Limiting
Not implemented in MVP.

## Pagination
List endpoints support:
- `skip`: Number of records to skip
- `limit`: Maximum records to return