import requests

# Test Register
res = requests.post("http://localhost:8000/api/auth/register", json={
    "username": "testuser",
    "email": "test@test.com",
    "password": "password123",
    "role": "manager"
})
print("Register:", res.status_code, res.text)

# Test Login
res = requests.post("http://localhost:8000/api/auth/login", json={
    "username": "testuser",
    "password": "password123"
})
print("Login (username):", res.status_code, res.text)

# Test Login with Email (should fail)
res = requests.post("http://localhost:8000/api/auth/login", json={
    "username": "test@test.com",
    "password": "password123"
})
print("Login (email):", res.status_code, res.text)
