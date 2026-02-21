import requests

BASE_URL = 'http://localhost:8000/api/v1'

# Test login
print('Testing Login...')
r = requests.post(f'{BASE_URL}/auth/login', json={'employee_id': 'EMP001', 'password': 'admin123'})
print(f'Status: {r.status_code}')

data = r.json()
if r.status_code == 200 and 'data' in data and 'access_token' in data['data']:
    token = data['data']['access_token']
    print('Token: FOUND [OK]')
    
    # Test /auth/me
    print('\nTesting /auth/me...')
    me_r = requests.get(f'{BASE_URL}/auth/me', headers={'Authorization': f'Bearer {token}'})
    if me_r.status_code == 200:
        user = me_r.json()['data']
        print(f'User: {user["name"]} ({user["employee_id"]}) [OK]')
        print(f'Face URL: {user.get("face_image_url", "None")}')
        print('\n[SUCCESS] Authentication flow working!')
    else:
        print(f'Failed: {me_r.status_code}')
else:
    print('Token: NOT FOUND [FAILED]')
