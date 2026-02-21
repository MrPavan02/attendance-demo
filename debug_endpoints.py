import requests
import json

# First login
login_resp = requests.post('http://localhost:8000/api/v1/auth/login', 
    json={'employee_id': 'EMP001', 'password': 'admin123'}, 
    timeout=5)

token = login_resp.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# Test /auth/me
print('Testing /auth/me...')
me_resp = requests.get('http://localhost:8000/api/v1/auth/me', headers=headers, timeout=5)
print(f'Status: {me_resp.status_code}')
print(f'Content-Type: {me_resp.headers.get("content-type")}')
print(f'First 200 chars: {me_resp.text[:200]}')
print()

# Test /attendance/status
emp_id = me_resp.json()['employee_id']
print(f'Testing /attendance/status/{emp_id}...')
status_resp = requests.get(f'http://localhost:8000/api/v1/attendance/status/{emp_id}', headers=headers, timeout=5)
print(f'Status: {status_resp.status_code}')
print(f'Content-Type: {status_resp.headers.get("content-type")}')
print(f'First 200 chars: {status_resp.text[:200]}')
print()

# Test /attendance/entries - this is the one likely causing issues
print(f'Testing /attendance/entries...')
entries_resp = requests.get('http://localhost:8000/api/v1/attendance/entries', headers=headers, timeout=5)
print(f'Status: {entries_resp.status_code}')
print(f'Content-Type: {entries_resp.headers.get("content-type")}')
print(f'Response text length: {len(entries_resp.text)}')
print(f'First 500 chars: {entries_resp.text[:500]}')
