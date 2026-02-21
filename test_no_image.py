#!/usr/bin/env python3
import requests
import json
from datetime import datetime

BASE_URL = 'http://localhost:8000/api/v1'

# Login
login_resp = requests.post(f'{BASE_URL}/auth/login', 
    json={'employee_id': 'EMP002', 'password': 'emp123'}, 
    timeout=5)
token = login_resp.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# Test WITHOUT image data
payload = {
    "employee_id": "EMP002",
    "timestamp": datetime.now().isoformat(),
    "type": "IN",
    "mode": "OFFICE",
    "latitude": 19.244449,
    "longitude": 83.422297,
    "device_id": "desktop",
    "verification_method": "BIOMETRIC",
    "field_work_reason": None,
    "image_data": None  # No image
}

print("Test 1: WITHOUT image_data")
resp = requests.post(f'{BASE_URL}/attendance/check-in', json=payload, headers=headers, timeout=10)
print(f"Status: {resp.status_code}")
print(f"Content-Type: {resp.headers.get('content-type')}")
try:
    print(f"Response: {json.dumps(resp.json(), indent=2)}")
except:
    print(f"Response (raw): {resp.text[:500]}")
