#!/usr/bin/env python3
"""Test error message handling for both EMP001 and EMP002"""

import requests
import json
from datetime import datetime
import base64

BASE_URL = 'http://localhost:8000/api/v1'

print("="*70)
print("COMPREHENSIVE ERROR MESSAGE TEST")
print("="*70)
print()

# Create minimal test image (too small to pass validation)
minimal_png = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
image_b64 = base64.b64encode(minimal_png).decode('utf-8')

test_cases = [
    {
        'name': 'EMP001 - No Face Enrolled',
        'employee_id': 'EMP001',
        'password': 'admin123',
        'expected_error': 'Enrolled face image not found'
    },
    {
        'name': 'EMP002 - Face Too Small',
        'employee_id': 'EMP002',
        'password': 'emp123',
        'expected_error': 'Image is too small'
    }
]

results = []

for test in test_cases:
    print(f"TEST: {test['name']}")
    print("-"*70)
    
    try:
        # Login
        login_resp = requests.post(
            f'{BASE_URL}/auth/login',
            json={'employee_id': test['employee_id'], 'password': test['password']},
            timeout=5
        )
        
        if login_resp.status_code != 200:
            print(f"❌ Login failed: {login_resp.status_code}")
            results.append({
                'test': test['name'],
                'result': 'FAIL',
                'reason': f'Login failed: {login_resp.status_code}'
            })
            continue
        
        token = login_resp.json()['access_token']
        print(f"✓ Login successful")
        
        # Attempt check-in
        headers = {'Authorization': f'Bearer {token}'}
        check_in_resp = requests.post(
            f'{BASE_URL}/attendance/check-in',
            json={
                'employee_id': test['employee_id'],
                'timestamp': datetime.now().isoformat(),
                'type': 'IN',
                'mode': 'OFFICE',
                'latitude': 19.244449,
                'longitude': 83.422297,
                'device_id': 'test',
                'verification_method': 'BIOMETRIC',
                'image_data': image_b64
            },
            headers=headers,
            timeout=5
        )
        
        print(f"Status: {check_in_resp.status_code}")
        
        if check_in_resp.status_code >= 400:
            try:
                error_data = check_in_resp.json()
                error_msg = error_data.get('message', 'Unknown error')
                details = error_data.get('details', {})
                
                # Build full message as frontend would
                full_msg = error_msg
                if isinstance(details, dict) and details.get('reason'):
                    full_msg = f"{error_msg}: {details['reason']}"
                
                print(f"Error message: '{full_msg}'")
                
                # Check if expected error found
                if test['expected_error'].lower() in full_msg.lower():
                    print(f"✓ PASS: Found expected error substring")
                    results.append({
                        'test': test['name'],
                        'result': 'PASS',
                        'error': full_msg
                    })
                else:
                    print(f"✗ FAIL: Expected '{test['expected_error']}' but got '{full_msg}'")
                    results.append({
                        'test': test['name'],
                        'result': 'FAIL',
                        'reason': f"Expected '{test['expected_error']}' but got '{full_msg}'"
                    })
                    
            except json.JSONDecodeError:
                print(f"✗ FAIL: Response is not JSON")
                print(f"Response: {check_in_resp.text[:200]}")
                results.append({
                    'test': test['name'],
                    'result': 'FAIL',
                    'reason': 'Response is not JSON'
                })
        else:
            print(f"✗ FAIL: Expected error but got success")
            results.append({
                'test': test['name'],
                'result': 'FAIL',
                'reason': 'Expected error but got success'
            })
            
    except Exception as e:
        print(f"✗ FAIL: {e}")
        results.append({
            'test': test['name'],
            'result': 'FAIL',
            'reason': str(e)
        })
    
    print()

# Summary
print("="*70)
print("TEST SUMMARY")
print("="*70)

passed = sum(1 for r in results if r['result'] == 'PASS')
failed = sum(1 for r in results if r['result'] == 'FAIL')

for result in results:
    status_icon = "✓" if result['result'] == 'PASS' else "✗"
    print(f"{status_icon} {result['test']}: {result['result']}")
    if result['result'] == 'FAIL':
        print(f"   → {result.get('reason', 'Unknown')}")
    else:
        print(f"   → {result.get('error', 'Success')}")

print()
print(f"Results: {passed} passed, {failed} failed")

if failed == 0:
    print()
    print("✅ ALL TESTS PASSED!")
    print()
    print("Frontend error handling correctly:")
    print("  • Shows 'Enrolled face image not found' for EMP001")
    print("  • Shows 'Failed to process image data: Image is too small...' for EMP002")
else:
    print()
    print("❌ SOME TESTS FAILED - see details above")
    print()
    print("Expected behavior:")
    print("  • EMP001: Should see 'Enrolled face image not found'")
    print("  • EMP002: Should see 'Image is too small (minimum 15000 bytes required)'")
