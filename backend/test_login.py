import requests
import json

# Test admin login
response = requests.post(
    'http://localhost:8000/api/v1/auth/login',
    json={'employee_id': 'EMP001', 'password': 'admin123'}
)

print('Admin Login Test:')
print(f'Status Code: {response.status_code}')
if response.status_code == 200:
    resp_json = response.json()
    print(f'✓ Token: {resp_json["access_token"][:50]}...')
    print(f'Token Type: {resp_json["token_type"]}')
    print('✓ Admin login successful!')
else:
    print(f'Response: {response.text}')
print()

# Test employee login
response = requests.post(
    'http://localhost:8000/api/v1/auth/login',
    json={'employee_id': 'EMP002', 'password': 'emp123'}
)

print('Employee Login Test:')
print(f'Status Code: {response.status_code}')
if response.status_code == 200:
    resp_json = response.json()
    print(f'✓ Token: {resp_json["access_token"][:50]}...')
    print(f'Token Type: {resp_json["token_type"]}')
    print('✓ Employee login successful!')
else:
    print(f'Response: {response.text}')
