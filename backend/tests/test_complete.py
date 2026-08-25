"""
Comprehensive Test Suite for TariffGuard API
Tests all major endpoints and business logic
"""

from fastapi.testclient import TestClient
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

# ============ Basic Endpoints ============

def test_root():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()

def test_health():
    """Test health endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_api_test():
    """Test /api/test endpoint"""
    response = client.get("/api/test")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

# ============ Factory Tests ============

def test_create_factory():
    """Test factory creation"""
    factory_data = {
        "name": "Test Factory",
        "location": "Faisalabad",
        "tariff_category": "Industrial",
        "sanctioned_load_kw": 250,
        "solar_capacity_kw": 100
    }
    response = client.post("/api/factories/", json=factory_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Factory"
    assert "id" in data

def test_list_factories():
    """Test listing factories"""
    response = client.get("/api/factories/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_factory():
    """Test getting specific factory"""
    response = client.get("/api/factories/2")  # Factory from seed data
    if response.status_code == 200:
        assert response.json()["id"] == 2

def test_get_nonexistent_factory():
    """Test 404 for non-existent factory"""
    response = client.get("/api/factories/9999")
    assert response.status_code == 404

# ============ Machine Tests ============

def test_create_machine():
    """Test machine creation"""
    machine_data = {
        "factory_id": 2,
        "name": "Test Machine",
        "machine_type": "Dyeing",
        "power_kw": 50,
        "min_run_minutes": 60,
        "shiftable": True
    }
    response = client.post("/api/machines/", json=machine_data)
    assert response.status_code == 200
    assert response.json()["name"] == "Test Machine"

def test_list_machines():
    """Test listing machines"""
    response = client.get("/api/machines/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_filter_machines_by_factory():
    """Test filtering machines by factory"""
    response = client.get("/api/machines/?factory_id=2")
    assert response.status_code == 200
    machines = response.json()
    assert all(m["factory_id"] == 2 for m in machines)

# ============ Order Tests ============
def test_create_order():
    """Test order creation"""
    import uuid
    unique_no = f"TEST-{uuid.uuid4().hex[:8]}"
    
    order_data = {
        "factory_id": 2,
        "order_no": unique_no,
        "process": "Dyeing",
        "quantity": 100,
        "duration_minutes": 120,
        "deadline": "2026-08-26T18:00:00",
        "priority": 1
    }
    response = client.post("/api/orders/", json=order_data)
    assert response.status_code == 200
    assert response.json()["order_no"] == unique_no

def test_list_orders():
    """Test listing orders"""
    response = client.get("/api/orders/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

# ============ Tariff Tests ============

def test_list_tariffs():
    """Test listing tariffs"""
    response = client.get("/api/tariffs/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_tariff():
    """Test tariff creation"""
    tariff_data = {
        "category": "Industrial",
        "period_name": "Test Peak",
        "start_time": "18:00",
        "end_time": "22:00",
        "rate_pkr_per_kwh": 35.0,
        "effective_from": "2026-08-25",
        "source": "Test"
    }
    response = client.post("/api/tariffs/", json=tariff_data)
    assert response.status_code == 200
    assert response.json()["period_name"] == "Test Peak"

# ============ Dashboard Tests ============

def test_dashboard_summary():
    """Test dashboard summary"""
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert "totals" in data
    assert "order_status" in data

def test_factory_dashboard():
    """Test factory-specific dashboard"""
    response = client.get("/api/dashboard/factory/2")
    if response.status_code == 200:
        data = response.json()
        assert "factory" in data
        assert "energy" in data

# ============ Meter Reading Tests ============

def test_list_meter_readings():
    """Test listing meter readings"""
    response = client.get("/api/meter-readings/?factory_id=2&limit=10")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_meter_reading_stats():
    """Test meter reading statistics"""
    response = client.get("/api/meter-readings/stats/2")
    assert response.status_code == 200
    data = response.json()
    assert "total_kwh" in data
    assert "peak_kw" in data

# ============ Optimization Tests ============

def test_optimize_schedule():
    """Test schedule optimization"""
    response = client.post("/api/optimize/schedule/2")
    assert response.status_code == 200
    data = response.json()
    assert "total_estimated_cost" in data
    assert "schedule" in data

def test_compare_schedules():
    """Test baseline vs optimized comparison"""
    response = client.post("/api/optimize/compare/2")
    assert response.status_code == 200
    data = response.json()
    assert "baseline" in data
    assert "optimized" in data
    assert "savings" in data