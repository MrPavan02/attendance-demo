#!/usr/bin/env python3
"""Diagnose what's failing for EMP002 check-in"""

import requests
import json
from datetime import datetime
import base64

BASE_URL = 'http://localhost:8000/api/v1'

print("="*70)
print("DIAGNOSING EMP002 CHECK-IN FAILURE")
print("="*70)
print()

# Step 1: Login as EMP002
print("Step 1: Login as EMP002")
print("-"*70)
try:
    login_resp = requests.post(
        f'{BASE_URL}/auth/login',
        json={'employee_id': 'EMP002', 'password': 'emp123'},
        timeout=5
    )
    print(f"Status: {login_resp.status_code}")
    print(f"Response: {login_resp.text[:300]}")
    
    if login_resp.status_code != 200:
        print("❌ Login failed!")
        exit(1)
    
    token = login_resp.json()['access_token']
    print("✓ Login successful\n")
    
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)

# Step 2: Check user details
print("Step 2: Get user details")
print("-"*70)
try:
    headers = {'Authorization': f'Bearer {token}'}
    user_resp = requests.get(f'{BASE_URL}/auth/me', headers=headers, timeout=5)
    print(f"Status: {user_resp.status_code}")
    
    if user_resp.status_code == 200:
        user = user_resp.json()
        print(f"Name: {user.get('name')}")
        print(f"Employee ID: {user.get('employee_id')}")
        print(f"Face URL: {user.get('face_image_url')}")
        print(f"✓ User loaded\n")
    else:
        print(f"❌ Failed: {user_resp.text}\n")
        
except Exception as e:
    print(f"❌ Error: {e}\n")

# Step 3: Attempt check-in with minimal image data
print("Step 3: Attempt check-in")
print("-"*70)

# Create a minimal but valid PNG image (1x1 pixel)
minimal_png = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
image_b64 = base64.b64encode(minimal_png).decode('utf-8')

check_in_payload = {
    'employee_id': 'EMP002',
    'timestamp': datetime.now().isoformat(),
    'type': 'IN',
    'mode': 'OFFICE',
    'latitude': 19.244449,
    'longitude': 83.422297,
    'device_id': 'test-device',
    'verification_method': 'BIOMETRIC',
    'image_data': image_b64
}

try:
    check_in_resp = requests.post(
        f'{BASE_URL}/attendance/check-in',
        json=check_in_payload,
        headers={**headers, 'Content-Type': 'application/json'},
        timeout=5
    )
    
    print(f"Status: {check_in_resp.status_code}")
    print(f"Content-Type: {check_in_resp.headers.get('content-type')}")
    print(f"Full Response:\n{check_in_resp.text}")
    print()
    
    if check_in_resp.status_code >= 400:
        print("❌ CHECK-IN FAILED")
        print("\nTrying to parse error as JSON:")
        try:
            error = check_in_resp.json()
            print(f"✓ Error object: {json.dumps(error, indent=2)}")
            
            # Extract the actual error message
            actual_error = error.get('message') or error.get('detail') or error.get('description')
            print(f"\nActual error message: '{actual_error}'")
            
        except json.JSONDecodeError as e:
            print(f"✗ Response is NOT valid JSON: {e}")
            print(f"Response starts with: {check_in_resp.text[:100]}")
    else:
        print("✓ CHECK-IN SUCCESSFUL")
        
except Exception as e:
    print(f"❌ Error during check-in: {e}\n")

print("="*70)
print("ANALYSIS")
print("="*70)
print("""
If check-in failed with specific error (like "Face verification failed"):
- The backend IS returning proper JSON with the error
- The frontend error handler should show this error
- If not showing, we need to fix error message extraction

If response is NOT JSON:
- Backend crashed or returned HTML
- Check backend logs for exceptions

Next step: Check backend logs
tail -f backend/logs/error.log
""")
