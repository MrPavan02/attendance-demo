#!/usr/bin/env python3
"""
Test file to verify frontend error handling for HTML vs JSON responses
This can be used to simulate backend issues and test error messages
"""

import requests
import json
from datetime import datetime

BASE_URL = 'http://localhost:8000/api/v1'

print("=" * 80)
print("TESTING: Frontend Error Handling for HTML vs JSON Responses")
print("=" * 80)
print()

def test_scenario(name, test_func):
    """Helper to run and report test scenarios"""
    print(f"\n{'='*80}")
    print(f"TEST: {name}")
    print(f"{'='*80}")
    try:
        test_func()
        print("✓ Test completed")
    except Exception as e:
        print(f"✗ Test failed: {e}")
    print()

def test_normal_login():
    """Test normal login (should work)"""
    print("Testing normal login endpoint...")
    resp = requests.post(
        f'{BASE_URL}/auth/login',
        json={'employee_id': 'EMP001', 'password': 'admin123'},
        timeout=5
    )
    print(f"  Status: {resp.status_code}")
    print(f"  Content-Type: {resp.headers.get('content-type')}")
    print(f"  Response type: {'JSON' if resp.headers.get('content-type', '').includes('json') else 'not JSON'}")
    
    if resp.status_code == 200:
        try:
            data = resp.json()
            print(f"  ✓ Valid JSON response with token: {data.get('access_token', 'N/A')[:20]}...")
        except json.JSONDecodeError as e:
            print(f"  ✗ Invalid JSON: {e}")

def test_invalid_credentials():
    """Test login with invalid credentials (should return JSON error)"""
    print("Testing login with invalid credentials...")
    resp = requests.post(
        f'{BASE_URL}/auth/login',
        json={'employee_id': 'INVALID', 'password': 'wrong'},
        timeout=5
    )
    print(f"  Status: {resp.status_code}")
    print(f"  Content-Type: {resp.headers.get('content-type')}")
    
    if not resp.ok:
        try:
            data = resp.json()
            print(f"  ✓ Error returned as JSON: {data.get('detail', data.get('message', 'Unknown error'))}")
        except json.JSONDecodeError as e:
            print(f"  ✗ Error response is NOT JSON: {e}")
            print(f"     Response starts with: {resp.text[:100]}")

def test_missing_required_fields():
    """Test login with missing fields (should return validation error in JSON)"""
    print("Testing login with empty request...")
    resp = requests.post(
        f'{BASE_URL}/auth/login',
        json={},  # Missing employee_id and password
        timeout=5
    )
    print(f"  Status: {resp.status_code}")
    print(f"  Content-Type: {resp.headers.get('content-type')}")
    
    if not resp.ok:
        try:
            data = resp.json()
            print(f"  ✓ Validation error returned as JSON")
            print(f"     Error: {data}")
        except json.JSONDecodeError as e:
            print(f"  ✗ Validation error is NOT JSON: {e}")
            print(f"     Response preview: {resp.text[:200]}")

def test_attendance_without_token():
    """Test attendance endpoint without auth token (should return auth error in JSON)"""
    print("Testing attendance check-in without auth token...")
    resp = requests.post(
        f'{BASE_URL}/attendance/check-in',
        json={
            'employee_id': 'EMP001',
            'timestamp': datetime.now().isoformat(),
            'type': 'IN',
            'mode': 'OFFICE',
            'latitude': 19.244449,
            'longitude': 83.422297,
            'device_id': 'test',
            'verification_method': 'BIOMETRIC'
        },
        timeout=5
    )
    print(f"  Status: {resp.status_code}")
    print(f"  Content-Type: {resp.headers.get('content-type')}")
    
    if not resp.ok:
        try:
            data = resp.json()
            print(f"  ✓ Auth error returned as JSON")
            print(f"     Error: {data.get('detail', 'Authentication error')}")
        except json.JSONDecodeError as e:
            print(f"  ✗ Auth error is NOT JSON: {e}")
            print(f"     Response preview: {resp.text[:200]}")

def test_with_token_check_in():
    """Test complete flow: login then check-in"""
    print("Testing complete flow: login -> check-in...")
    
    # Login
    login_resp = requests.post(
        f'{BASE_URL}/auth/login',
        json={'employee_id': 'EMP001', 'password': 'admin123'},
        timeout=5
    )
    
    if login_resp.status_code != 200:
        print(f"  ✗ Login failed: {login_resp.status_code}")
        return
    
    try:
        token = login_resp.json()['access_token']
        print(f"  ✓ Login successful, token obtained")
        
        # Check-in
        headers = {'Authorization': f'Bearer {token}'}
        check_in_resp = requests.post(
            f'{BASE_URL}/attendance/check-in',
            json={
                'employee_id': 'EMP001',
                'timestamp': datetime.now().isoformat(),
                'type': 'IN',
                'mode': 'OFFICE',
                'latitude': 19.244449,
                'longitude': 83.422297,
                'device_id': 'test',
                'verification_method': 'BIOMETRIC'
            },
            headers=headers,
            timeout=5
        )
        
        print(f"  Check-in status: {check_in_resp.status_code}")
        print(f"  Content-Type: {check_in_resp.headers.get('content-type')}")
        
        if check_in_resp.status_code >= 400:
            try:
                error = check_in_resp.json()
                print(f"  ✓ Error returned as JSON")
                print(f"     Error: {error.get('message', 'Unknown')}")
            except json.JSONDecodeError as e:
                print(f"  ✗ Error response is NOT JSON: {e}")
                print(f"     Response: {check_in_resp.text[:300]}")
        else:
            try:
                data = check_in_resp.json()
                print(f"  ✓ Check-in successful, response is valid JSON")
            except json.JSONDecodeError as e:
                print(f"  ✗ Success response is NOT JSON: {e}")
    
    except KeyError:
        print(f"  ✗ Login response missing access_token")

# Run all tests
print("\nRunning test scenarios...\n")

test_scenario(
    "Normal Login - Should return JSON with token",
    test_normal_login
)

test_scenario(
    "Invalid Credentials - Should return JSON error",
    test_invalid_credentials
)

test_scenario(
    "Missing Fields - Should return JSON validation error",
    test_missing_required_fields
)

test_scenario(
    "Unauthorized Access - Should return JSON auth error",
    test_attendance_without_token
)

test_scenario(
    "Complete Flow - Login then Check-in",
    test_with_token_check_in
)

print()
print("=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print("""
✓ All endpoints should return JSON responses (never HTML)
✓ Errors should include proper 'detail' or 'message' fields
✓ Status codes should be appropriate (401 for auth, 422 for validation, etc.)
✓ Content-Type headers should be 'application/json'

If any test shows HTML response (<!DOCTYPE...), that indicates:
- Backend misconfiguration
- Uncaught exception in backend
- Incorrect error handling

Frontend should display user-friendly messages instead of raw errors.
""")
print("=" * 80)
