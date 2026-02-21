import requests
import json

# Try complete login flow
BASE_URL = 'http://localhost:8000/api/v1'

# Step 1: Login
print('Step 1: Login...')
login_resp = requests.post(f'{BASE_URL}/auth/login', json={'employee_id': 'EMP001', 'password': 'admin123'}, timeout=5)
print(f'Login Status: {login_resp.status_code}')
token = login_resp.json().get('access_token')
print(f'Token received: {"Yes" if token else "No"}\n')

# Step 2: Get user info
print('Step 2: Get current user...')
me_resp = requests.get(f'{BASE_URL}/auth/me', headers={'Authorization': f'Bearer {token}'}, timeout=5)
print(f'User Info Status: {me_resp.status_code}')
user = me_resp.json()
print(f'Employee ID: {user.get("employee_id")}')
print(f'Name: {user.get("name")}')
print(f'Role: {user.get("role")}\n')

# Step 3: Get attendance status
print('Step 3: Get attendance status...')
emp_id = user.get('employee_id')
status_resp = requests.get(f'{BASE_URL}/attendance/status/{emp_id}', headers={'Authorization': f'Bearer {token}'}, timeout=5)
print(f'Status Response: {status_resp.status_code}')
print(f'Status Data: {json.dumps(status_resp.json(), indent=2)}')
