#!/usr/bin/env python3
"""
Comprehensive authentication test
Check if frontend can successfully authenticate with backend
"""

import requests
import json
from datetime import datetime

print("=" * 60)
print("FRONTEND AUTHENTICATION TEST")
print("=" * 60)
print(f"Time: {datetime.now()}\n")

BASE_URL = 'http://localhost:8000/api/v1'

# Test credentials from USER_CREDENTIALS.md
test_cases = [
    {
        'role': 'HR Admin',
        'employee_id': 'EMP001',
        'password': 'admin123',
        'expected_role': 'HR'
    },
    {
        'role': 'Employee (Alice)',
        'employee_id': 'EMP002',
        'password': 'emp123',
        'expected_role': 'EMPLOYEE'
    },
    {
        'role': 'Employee (Bob)',
        'employee_id': 'EMP003',
        'password': 'emp123',
        'expected_role': 'EMPLOYEE'
    },
]

print("\nTesting login with various credentials:\n")

for i, test in enumerate(test_cases, 1):
    print(f"Test {i}: {test['role']}")
    print(f"  Employee ID: {test['employee_id']}")
    print(f"  Password: {test['password']}")
    
    try:
        # Step 1: Login
        login_resp = requests.post(
            f'{BASE_URL}/auth/login',
            json={
                'employee_id': test['employee_id'],
                'password': test['password']
            },
            timeout=5
        )
        
        if login_resp.status_code != 200:
            print(f"  ❌ Login FAILED: {login_resp.status_code}")
            print(f"     {login_resp.text}")
            continue
        
        token_data = login_resp.json()
        token = token_data.get('access_token')
        
        if not token:
            print(f"  ❌ No token in response")
            continue
        
        print(f"  ✓ Login successful")
        
        # Step 2: Get user info
        headers = {'Authorization': f'Bearer {token}'}
        me_resp = requests.get(f'{BASE_URL}/auth/me', headers=headers, timeout=5)
        
        if me_resp.status_code != 200:
            print(f"  ❌ Get user info FAILED: {me_resp.status_code}")
            continue
        
        user = me_resp.json()
        print(f"  ✓ User info retrieved")
        print(f"     Name: {user.get('name')}")
        print(f"     Role: {user.get('role')}")
        print(f"     Email: {user.get('email')}")
        
        # Check role matches expectation
        if user.get('role') != test['expected_role']:
            print(f"  ⚠ Role mismatch: expected {test['expected_role']}, got {user.get('role')}")
        
        # Step 3: Get attendance status
        status_resp = requests.get(
            f'{BASE_URL}/attendance/status/{user.get("employee_id")}',
            headers=headers,
            timeout=5
        )
        
        if status_resp.status_code != 200:
            print(f"  ❌ Get status FAILED: {status_resp.status_code}")
            continue
        
        status = status_resp.json()
        print(f"  ✓ Attendance status retrieved")
        print(f"     Current: {status.get('current_status')}")
        
        print(f"  ✅ ALL TESTS PASSED FOR {test['role']}\n")
        
    except Exception as e:
        print(f"  ❌ ERROR: {e}\n")

print("=" * 60)
print("Test complete!")
print("=" * 60)
