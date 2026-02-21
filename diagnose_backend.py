#!/usr/bin/env python3
"""Diagnose backend response issues"""

import requests
import json
from datetime import datetime

BASE_URL = 'http://localhost:8000/api/v1'

print('=== Detailed Backend Diagnostic ===\n')

# Test 1: Basic health check
print('1. Health Check:')
try:
    health = requests.get(f'{BASE_URL}/health', timeout=5)
    print(f'   Status: {health.status_code}')
    print(f'   Content-Type: {health.headers.get("content-type")}')
    print(f'   Response: {health.text[:200]}')
    print()
except Exception as e:
    print(f'   ERROR: {e}\n')

# Test 2: Login and check response details
print('2. Login Request:')
try:
    login = requests.post(
        f'{BASE_URL}/auth/login',
        json={'employee_id': 'EMP001', 'password': 'admin123'},
        timeout=5
    )
    print(f'   Status: {login.status_code}')
    print(f'   Content-Type: {login.headers.get("content-type")}')
    print(f'   Response: {login.text[:300]}')
    print()
    
    if login.status_code == 200:
        token = login.json()['access_token']
        print(f'3. Check-in Request (with valid token):')
        
        check_in = requests.post(
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
            headers={'Authorization': f'Bearer {token}'},
            timeout=5
        )
        print(f'   Status: {check_in.status_code}')
        print(f'   Content-Type: {check_in.headers.get("content-type")}')
        print(f'   Response: {check_in.text[:300]}')
        print()
        
        if check_in.status_code >= 400:
            print(f'\n⚠️  CHECK-IN FAILED WITH STATUS {check_in.status_code}')
            print('Full response:')
            print(check_in.text)
        
except Exception as e:
    print(f'   ERROR: {e}\n')

print('\n=== Summary ===')
print('Check that:')
print('✓ All Content-Type headers are "application/json"')
print('✓ No responses start with "<" (HTML marker)')
print('✓ Status codes are correct (200 for success, 4xx for errors)')
print('✓ Error responses include "detail" or "message" field')
