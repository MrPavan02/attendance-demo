#!/usr/bin/env python3
"""Test API endpoints to check for HTML vs JSON responses"""

import requests
import json
from datetime import datetime

BASE_URL = 'http://localhost:8000/api/v1'

print('=' * 70)
print('Testing API Endpoints for HTML vs JSON responses')
print('=' * 70)
print()

# First, login to get a token
print('=== Testing Login ===')
login_resp = requests.post(f'{BASE_URL}/auth/login', 
    json={'employee_id': 'EMP001', 'password': 'admin123'},
    timeout=5)
print(f'Status: {login_resp.status_code}')
print(f'Content-Type: {login_resp.headers.get("content-type")}')
print(f'Response preview: {login_resp.text[:200]}')
print()

if login_resp.status_code == 200:
    try:
        login_json = login_resp.json()
        token = login_json.get('access_token')
        print(f'Token obtained: {token[:20]}...' if token else 'No token in response')
        print()
        
        if token:
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test attendance/entries endpoint
            print('=== Testing /attendance/entries (GET) ===')
            entries_resp = requests.get(f'{BASE_URL}/attendance/entries', headers=headers, timeout=5)
            print(f'Status: {entries_resp.status_code}')
            print(f'Content-Type: {entries_resp.headers.get("content-type")}')
            print(f'First 300 chars: {entries_resp.text[:300]}')
            print()
            
            # Test check-in endpoint
            print('=== Testing /attendance/check-in (POST) ===')
            check_in_data = {
                'employee_id': 'EMP001',
                'timestamp': datetime.now().isoformat(),
                'type': 'IN',
                'mode': 'OFFICE',
                'latitude': 19.244449,
                'longitude': 83.422297,
                'device_id': 'test',
                'verification_method': 'BIOMETRIC'
            }
            check_in_resp = requests.post(f'{BASE_URL}/attendance/check-in',
                json=check_in_data,
                headers={**headers, 'Content-Type': 'application/json'},
                timeout=5)
            print(f'Status: {check_in_resp.status_code}')
            print(f'Content-Type: {check_in_resp.headers.get("content-type")}')
            print(f'First 500 chars: {check_in_resp.text[:500]}')
            
            if check_in_resp.status_code >= 400:
                print(f'Full response: {check_in_resp.text}')
            print()
            
            # Test logout
            print('=== Testing /auth/logout (POST) ===')
            logout_resp = requests.post(f'{BASE_URL}/auth/logout',
                headers=headers,
                timeout=5)
            print(f'Status: {logout_resp.status_code}')
            print(f'Content-Type: {logout_resp.headers.get("content-type")}')
            print(f'Response: {logout_resp.text}')
            print()
    except json.JSONDecodeError as e:
        print(f'ERROR: Cannot parse login response as JSON')
        print(f'Error: {e}')
        print(f'Response text: {login_resp.text}')
else:
    print(f'Login failed with status {login_resp.status_code}')
    print(f'Response: {login_resp.text}')

print()
print('=' * 70)
print('Test Complete')
print('=' * 70)
