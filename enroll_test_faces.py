#!/usr/bin/env python3
"""
Quick script to enroll face images for test users
This helps test the complete check-in/check-out flow
"""

import requests
import base64
import json
from pathlib import Path

BASE_URL = 'http://localhost:8000/api/v1'

print("="*70)
print("FACE IMAGE ENROLLMENT FOR TEST USERS")
print("="*70)
print()

# Step 1: Login as admin
print("Step 1: Admin Login")
print("-" * 70)
try:
    login_resp = requests.post(
        f'{BASE_URL}/auth/login',
        json={'employee_id': 'EMP001', 'password': 'admin123'},
        timeout=5
    )
    if login_resp.status_code != 200:
        print(f"❌ Login failed: {login_resp.status_code}")
        print(f"   {login_resp.text}")
        exit(1)
    
    token = login_resp.json()['access_token']
    print(f"✓ Admin logged in successfully")
    headers = {'Authorization': f'Bearer {token}'}
    print()
    
except Exception as e:
    print(f"❌ Error during login: {e}")
    exit(1)

# Step 2: Create a simple test face image (1x1 pixel PNG)
print("Step 2: Create Test Face Images")
print("-" * 70)

# Minimal 1x1 PNG (transparent pixel) - for testing, just needs valid image format
minimal_png = base64.b64encode(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82').decode('utf-8')

test_users = [
    ('EMP001', 'admin123', 'HR Admin'),
    ('EMP002', 'emp123', 'Test Employee 1'),
    ('EMP003', 'emp123', 'Test Employee 2'),
]

enrolled = []
failed = []

for emp_id, password, name in test_users:
    print(f"\nEnrolling {name} ({emp_id})...")
    
    try:
        # We'll try to update the user with a face image URL
        # This is a workaround since the API might not have a direct face upload endpoint
        
        # First check if user exists
        user_resp = requests.get(
            f'{BASE_URL}/employees/{emp_id}',
            headers=headers,
            timeout=5
        )
        
        if user_resp.status_code != 200:
            print(f"  ⚠️  User not found or cannot access: {user_resp.status_code}")
            continue
        
        user = user_resp.json()
        print(f"  Found: {user.get('name', 'Unknown')}")
        
        # Try to set face image data directly
        # Update payload with face image
        update_payload = {
            'face_image_url': f'data:image/png;base64,{minimal_png[:100]}...',  
        }
        
        update_resp = requests.put(
            f'{BASE_URL}/employees/{emp_id}',
            json=update_payload,
            headers=headers,
            timeout=5
        )
        
        if update_resp.status_code in [200, 204]:
            print(f"  ✓ Face image enrollment successful")
            enrolled.append((emp_id, name))
        else:
            print(f"  ⚠️  Enrollment response: {update_resp.status_code}")
            # This might be expected if the endpoint doesn't support it
            print(f"     (This may need manual enrollment or database update)")
            
    except Exception as e:
        print(f"  ✗ Error: {e}")
        failed.append((emp_id, name, str(e)))

print()
print("="*70)
print("ENROLLMENT SUMMARY")
print("="*70)

if enrolled:
    print(f"\n✓ Successfully enrolled {len(enrolled)} user(s):")
    for emp_id, name in enrolled:
        print(f"  - {emp_id}: {name}")
else:
    print("\n⚠️  No enrollments successful via API")

if failed:
    print(f"\n✗ Failed to enroll {len(failed)} user(s):")
    for emp_id, name, error in failed:
        print(f"  - {emp_id}: {name} ({error})")

print("\n" + "="*70)
print("ALTERNATIVE: Manual Database Update")
print("="*70)
print("""
If the API endpoint doesn't support face image enrollment, you can:

1. Use database tools to set face_image_url directly
2. Run the backend script:
   python backend/scripts/set_face_image_url.py

3. Or manually update database:
   UPDATE users SET face_image_url = 'static/faces/default.jpg' 
   WHERE employee_id = 'EMP001';

After enrollment, try check-in again:
- You should see camera permission request
- Capture a face photo
- System should verify the face
- If match successful, attendance recorded
""")

print("="*70)
print("Status: Script complete")
print("="*70)
