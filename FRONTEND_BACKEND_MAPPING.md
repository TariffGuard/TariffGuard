# Frontend to Backend Mapping

This document maps the planned frontend pages for TariffGuard to the backend API endpoints they will consume. It highlights what data is required and identifies where the frontend will need to rely on mock data due to missing backend implementation.

## Page Mapping Table

| Frontend Page | API Endpoint (Method + Path) | Data Needed by Frontend | Endpoint Exists? |
|--------------|------------------------------|-------------------------|------------------|
| **Login** | `POST /api/auth/login` | User roles (Owner, Manager, Supervisor), JWT token | ❌ No (Mock required) |
| **Overview (Dashboard)** | `GET /api/dashboard/factory/{id}` | KPI data (machines, orders, energy stats) | ✅ Yes |
| | `GET /api/meter-readings/` | Time-series data for Energy Consumption charts | ✅ Yes |
| | `GET /api/alerts/recent` | Recent anomalies and system alerts | ❌ No (Mock required) |
| **Schedule Optimizer** | `GET /api/orders/` | List of pending/active production orders | ✅ Yes |
| | `POST /api/optimize/schedule/{id}` | Generated optimal production schedule | ✅ Yes |
| | `POST /api/optimize/compare/{id}` | Cost comparison (baseline vs optimized) | ✅ Yes |
| **Machines** | `GET /api/machines/` | List of machines and specifications | ✅ Yes |
| | `POST /api/machines/` | Create a new machine | ✅ Yes |
| | `PUT /api/machines/{id}` <br> `DELETE /api/machines/{id}` | Edit or remove a machine | ❌ No (Mock required) |
| **Alerts & Anomalies**| `GET /api/alerts/` | Comprehensive list of system alerts and anomalies | ❌ No (Mock required) |
| **Tariff Calendar** | `GET /api/tariffs/` | List of electricity tariffs and time periods | ✅ Yes |
| | `POST`, `PUT`, `DELETE /api/tariffs` | Manage tariff data | ✅ Yes |
| **Reports** | `GET /api/meter-readings/stats/{id}` | Aggregate statistics for cost/energy analysis | ✅ Yes (Partial) |
| | `GET /api/reports/generate` | PDF/CSV export of historical reports | ❌ No (Mock required) |
| **Settings** | `GET /api/factories/{id}` <br> `PUT /api/factories/{id}` | Read and update factory details | ✅ Yes |
| | `GET /api/users/me` <br> `GET /api/settings` | Read and update user/app preferences | ❌ No (Mock required) |

---

## Mock Data Requirements Summary

Because the backend is still under development, the frontend will need to heavily rely on the `lib/mock_data.ts` file for several core features. 

The following pages and components will require **100% Mock Data** initially:
1. **Login Page**: No authentication or user models exist on the backend. Hardcoded roles and mock auth contexts will be required.
2. **Alerts & Anomalies Page**: No endpoints or database schemas exist for system alerts.
3. **Reports (Exports)**: While some stats exist, advanced reporting features (like exporting PDFs/CSVs of historical data) are not implemented.
4. **Settings (User Preferences)**: General application settings and user profiles do not exist.

The following pages will require **Partial Mock Data**:
1. **Machines**: Creating and reading machines works, but updating or deleting them will need to be simulated in the UI.
2. **Overview (Dashboard)**: The alerts panel on the dashboard will need mock data, even though KPIs and charts can use real data.
