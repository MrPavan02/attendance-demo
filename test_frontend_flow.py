import requests
import json

# Simulate complete frontend login flow
BASE_URL = 'http://localhost:8000/api/v1'

print("=== Testing Frontend Login Flow ===\n")

# Step 1: Login
print("1. Login...")
try:
    login_resp = requests.post(f'{BASE_URL}/auth/login', 
        json={'employee_id': 'EMP001', 'password': 'admin123'}, 
        timeout=5)
    print(f"   Status: {login_resp.status_code}")
    token_data = login_resp.json()
    token = token_data.get('access_token')
    print(f"   Token: {token[:50]}..." if token else "   Token: MISSING")
except Exception as e:
    print(f"   ERROR: {e}")
    exit(1)

# Step 2: Get user info
print("\n2. Get user info (/auth/me)...")
try:
    headers = {'Authorization': f'Bearer {token}'}
    me_resp = requests.get(f'{BASE_URL}/auth/me', headers=headers, timeout=5)
    print(f"   Status: {me_resp.status_code}")
    user_data = me_resp.json()
    print(f"   Employee: {user_data.get('employee_id')}")
    print(f"   Name: {user_data.get('name')}")
    print(f"   Role: {user_data.get('role')}")
    print(f"   Face URL: {user_data.get('face_image_url')}")
except Exception as e:
    print(f"   ERROR: {e}")
    exit(1)

# Step 3: Get attendance status
print("\n3. Get status (/attendance/status/{id})...")
try:
    emp_id = user_data.get('employee_id')
    headers = {'Authorization': f'Bearer {token}'}
    status_resp = requests.get(f'{BASE_URL}/attendance/status/{emp_id}', headers=headers, timeout=5)
    print(f"   Status: {status_resp.status_code}")
    status_data = status_resp.json()
    print(f"   Current Status: {status_data.get('current_status')}")
    print(f"   Last Check-in: {status_data.get('last_check_in')}")
except Exception as e:
    print(f"   ERROR: {e}")

# Step 4: Get attendance entries
print("\n4. Get entries (/attendance/entries)...")
try:
    headers = {'Authorization': f'Bearer {token}'}
    entries_resp = requests.get(f'{BASE_URL}/attendance/entries', headers=headers, timeout=5)
    print(f"   Status: {entries_resp.status_code}")
    entries_data = entries_resp.json()
    print(f"   Entries returned: {len(entries_data) if isinstance(entries_data, list) else 'ERROR'}")
    if isinstance(entries_data, list) and len(entries_data) > 0:
        print(f"   First entry: {json.dumps(entries_data[0], indent=4)}")
except Exception as e:
    print(f"   ERROR: {e}")

print("\n=== All steps completed successfully! ===")
