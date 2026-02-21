#!/usr/bin/env python3
"""Test complete check-in with face verification"""

import requests
import base64
from pathlib import Path

BASE_URL = 'http://localhost:8000/api/v1'

# Read test face image
face_path = Path('backend/static/faces/EMP002.jpg')
image_bytes = face_path.read_bytes()
image_b64 = base64.b64encode(image_bytes).decode('utf-8')

# Login as EMP002
print("Step 1: Login as EMP002...")
login_resp = requests.post(
    f'{BASE_URL}/auth/login',
    json={'employee_id': 'EMP002', 'password': 'emp123'},
    timeout=5
)

if login_resp.status_code == 200:
    resp_data = login_resp.json()['data']
    token = resp_data['access_token']
    user = resp_data['user']
    print(f"[OK] Login successful: {user['name']}")
    print(f"  Face URL: {user.get('face_image_url', 'None')}")
    
    # Try check-in
    print("\nStep 2: Check-in with face verification...")
    from datetime import datetime
    checkin_resp = requests.post(
        f'{BASE_URL}/attendance/check-in',
        json={
            'employee_id': 'EMP002',
            'timestamp': datetime.now().isoformat(),
            'type': 'IN',
            'latitude': 19.244449,
            'longitude': 83.422297,
            'mode': 'OFFICE',
            'device_id': 'test-device-001',
            'verification_method': 'BIOMETRIC',
            'image_data': f'data:image/jpeg;base64,{image_b64}'
        },
        headers={'Authorization': f'Bearer {token}'},
        timeout=10
    )
    
    print(f"Check-in status code: {checkin_resp.status_code}")
    if checkin_resp.status_code == 201:
        print("[OK] Check-in successful")
        resp_data = checkin_resp.json()
        if 'data' in resp_data:
            print(f"  Entry ID: {resp_data['data'].get('id', 'N/A')}")
    else:
        print(f"[FAIL] Check-in failed: {checkin_resp.status_code}")
        import json
        print(f"Response: {json.dumps(checkin_resp.json(), indent=2)}")
else:
    print(f"[FAIL] Login failed: {login_resp.status_code}")
    import json
    print(f"Response: {json.dumps(login_resp.json(), indent=2)}")

# Test all three employees
print("\n" + "="*70)
print("TESTING ALL EMPLOYEES")
print("="*70)

test_users = [
    ('EMP001', 'admin123', 'backend/static/faces/EMP001.jpg'),
    ('EMP002', 'emp123', 'backend/static/faces/EMP002.jpg'),
    ('EMP003', 'emp123', 'backend/static/faces/EMP003.jpg'),
]

for emp_id, password, face_file in test_users:
    print(f"\nTesting {emp_id}...")
    
    try:
        # Login
        login_resp = requests.post(
            f'{BASE_URL}/auth/login',
            json={'employee_id': emp_id, 'password': password},
            timeout=5
        )
        
        if login_resp.status_code != 200:
            print(f"  [FAIL] Login failed")
            continue
        
        token = login_resp.json()['data']['access_token']
        print(f"  [OK] Login OK")
        
        # Check-in
        face_bytes = Path(face_file).read_bytes()
        face_b64 = base64.b64encode(face_bytes).decode('utf-8')
        
        from datetime import datetime
        checkin_resp = requests.post(
            f'{BASE_URL}/attendance/check-in',
            json={
                'employee_id': emp_id,
                'timestamp': datetime.now().isoformat(),
                'type': 'IN',
                'latitude': 19.244449,
                'longitude': 83.422297,
                'mode': 'OFFICE',
                'device_id': 'test-device-001',
                'verification_method': 'BIOMETRIC',
                'image_data': f'data:image/jpeg;base64,{face_b64}'
            },
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        
        if checkin_resp.status_code == 201:
            print(f"  [OK] Check-in OK")
        else:
            print(f"  [FAIL] Check-in failed: {checkin_resp.status_code}")
            
    except Exception as e:
        print(f"  [ERROR] {e}")

print("\n" + "="*70)
print("Test complete!")
print("="*70)
