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

# Test with various coordinates
tests = [
    ("Office coordinates (from config)", {"latitude": 19.244449, "longitude": 83.422297}),
    ("Slightly offset", {"latitude": 19.2445, "longitude": 83.4223}),
    ("Invalid (far away)", {"latitude": 0.0, "longitude": 0.0}),
]

for test_name, coords in tests:
    payload = {
        "employee_id": "EMP002",
        "timestamp": datetime.now().isoformat(),
        "type": "IN",
        "mode": "OFFICE",
        "latitude": coords["latitude"],
        "longitude": coords["longitude"],
        "device_id": "desktop",
        "verification_method": "BIOMETRIC",
        "field_work_reason": None,
        "image_data": None
    }
    
    print(f"\nTest: {test_name}")
    print(f"  Coords: {coords}")
    resp = requests.post(f'{BASE_URL}/attendance/check-in', json=payload, headers=headers, timeout=10)
    print(f"  Status: {resp.status_code}")
    try:
        data = resp.json()
        print(f"  Response: {data.get('detail', 'Success')}")
    except:
        print(f"  Error (non-JSON): {resp.text[:100]}")
