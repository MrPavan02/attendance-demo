/*
Test if CORS is working properly for frontend requests
This simulates what the browser would do
*/

// Test 1: Simple CORS preflight test
console.log("Testing CORS setup...\n");

const BASE_URL = 'http://localhost:8000/api/v1';

async function testCORS() {
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employee_id: 'EMP001',
        password: 'admin123'
      })
    });

    console.log('CORS Test Status:', response.status);
    const data = await response.json();
    console.log('Login response:', data.access_token ? 'SUCCESS - Token received' : 'FAILED - No token');
    
    if (data.access_token) {
      // Test with token
      const meResp = await fetch(`${BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        }
      });
      
      console.log('Auth/ME Status:', meResp.status);
      const meData = await meResp.json();
      console.log('User fetched:', meData.employee_id);
    }
  } catch (error) {
    console.error('CORS Error:', error.message);
  }
}

testCORS();
