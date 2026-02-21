#!/usr/bin/env python3
import requests
import json
from datetime import datetime

BASE_URL = 'http://localhost:8000/api/v1'

# Login first
login_resp = requests.post(f'{BASE_URL}/auth/login', 
    json={'employee_id': 'EMP002', 'password': 'emp123'}, 
    timeout=5)
token = login_resp.json()['access_token']
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# Try to check in
check_in_payload = {
    "employee_id": "EMP002",
    "timestamp": datetime.utcnow().isoformat(),
    "type": "IN",
    "mode": "OFFICE",
    "latitude": 19.244449,
    "longitude": 83.422297,
    "device_id": "test-device",
    "verification_method": "BIOMETRIC",
    "field_work_reason": None,
    "image_data": "test_image_base64"
}

print("Testing CHECK-IN endpoint...")
print(f"Payload: {json.dumps(check_in_payload, indent=2)}")
print()

resp = requests.post(f'{BASE_URL}/attendance/check-in', 
    json=check_in_payload,
    headers=headers,
    timeout=10)

print(f"Status: {resp.status_code}")
print(f"Content-Type: {resp.headers.get('content-type')}")
print(f"Response (first 500 chars):\n{resp.text[:500]}")
