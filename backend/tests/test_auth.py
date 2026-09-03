from fastapi.testclient import TestClient
import uuid
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app

client = TestClient(app)

def test_auth_register_and_login():
    unique_user = f"usr_{uuid.uuid4().hex[:8]}"
    email = f"{unique_user}@test.com"
    
    # Test Register
    res = client.post("/api/auth/register", json={
        "username": unique_user,
        "email": email,
        "password": "password123",
        "role": "manager"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == unique_user
    
    # Test Login
    login_res = client.post("/api/auth/login", json={
        "username": unique_user,
        "password": "password123"
    })
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
