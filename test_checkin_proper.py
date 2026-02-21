#!/usr/bin/env python3
import requests
import json
from datetime import datetime
import base64

BASE_URL = 'http://localhost:8000/api/v1'

# Login first
login_resp = requests.post(f'{BASE_URL}/auth/login', 
    json={'employee_id': 'EMP002', 'password': 'emp123'}, 
    timeout=5)
token = login_resp.json()['access_token']
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# Create a dummy image (PNG magic numbers + padding to meet minimum size)
# PNG header: 89 50 4E 47 0D 0A 1A 0A
dummy_image = b'\x89PNG\r\n\x1a\n' + b'\x00' * 20000  # 20KB of zeros

# Convert to base64
image_base64 = base64.b64encode(dummy_image).decode('utf-8')

check_in_payload = {
    "employee_id": "EMP002",
    "timestamp": datetime.now().isoformat(),
    "type": "IN",
    "mode": "OFFICE",
    "latitude": 19.244449,
    "longitude": 83.422297,
    "device_id": "test-device",
    "verification_method": "BIOMETRIC",
    "field_work_reason": None,
    "image_data": image_base64
}

print("Testing CHECK-IN endpoint with proper image...")
print(f"Image size: {len(image_base64)} chars (based64), {len(dummy_image)} bytes (raw)")
print()

resp = requests.post(f'{BASE_URL}/attendance/check-in', 
    json=check_in_payload,
    headers=headers,
    timeout=10)

print(f"Status: {resp.status_code}")
print(f"Content-Type: {resp.headers.get('content-type')}")
print(f"Response:\n{resp.text[:800]}")
