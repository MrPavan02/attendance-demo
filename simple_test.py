#!/usr/bin/env python3
import requests
import json
from datetime import datetime
import base64

BASE_URL = 'http://localhost:8000/api/v1'

# Login
login_resp = requests.post(f'{BASE_URL}/auth/login', 
    json={'employee_id': 'EMP002', 'password': 'emp123'}, 
    timeout=5)
token = login_resp.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# Simple image (20KB of zeros with PNG header)
dummy_image = b'\x89PNG\r\n\x1a\n' + b'\x00' * 20000
image_b64 = base64.b64encode(dummy_image).decode('utf-8')

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
    "image_data": image_b64
}

resp = requests.post(f'{BASE_URL}/attendance/check-in', json=payload, headers=headers, timeout=10)
print(f"Status: {resp.status_code}")
print(f"Content-Type: {resp.headers.get('content-type')}")
try:
    data = resp.json()
    print(f"Response: {json.dumps(data, indent=2)}")
except:
    print(f"Response (raw): {resp.text[:500]}")
