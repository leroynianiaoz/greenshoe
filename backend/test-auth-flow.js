import 'dotenv/config';

const API_URL = 'http://localhost:8080/api';

async function testAuthFlow() {
  console.log('Testing Authentication Flow...\n');

  try {
    // Test 1: Register a new test user
    console.log('Test 1: Register a new user');
    const registerResponse = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test-${Date.now()}@greenshoe.com`,
        password: 'testpassword123',
        role: 'DEVELOPER'
      })
    });

    if (!registerResponse.ok) {
      const error = await registerResponse.json();
      console.log('Registration failed:', error.message);
      throw new Error('Registration failed');
    }

    const registerData = await registerResponse.json();
    console.log('✅ Registration successful');
    console.log('User:', registerData.user.email);
    console.log('Role:', registerData.user.role);
    console.log('Token received:', registerData.token ? 'Yes' : 'No');
    console.log();

    // Test 2: Login with existing user
    console.log('Test 2: Login with registered user');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: registerData.user.email,
        password: 'testpassword123'
      })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.json();
      console.log('Login failed:', error.message);
      throw new Error('Login failed');
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log('Token received:', loginData.token ? 'Yes' : 'No');
    console.log();

    // Test 3: Get current user info
    console.log('Test 3: Get current user info (/me endpoint)');
    const meResponse = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });

    if (!meResponse.ok) {
      const error = await meResponse.json();
      console.log('/me failed:', error.message);
      throw new Error('/me endpoint failed');
    }

    const meData = await meResponse.json();
    console.log('✅ /me endpoint successful');
    console.log('User:', meData.user.email);
    console.log('Role:', meData.user.role);
    console.log();

    // Test 4: Test invalid token
    console.log('Test 4: Test invalid token');
    const invalidTokenResponse = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid-token-123'
      }
    });

    if (invalidTokenResponse.ok) {
      console.log('❌ Invalid token was accepted (this should fail)');
    } else {
      console.log('✅ Invalid token rejected correctly');
    }
    console.log();

    // Test 5: Test missing token
    console.log('Test 5: Test missing token');
    const noTokenResponse = await fetch(`${API_URL}/auth/me`, {
      method: 'GET'
    });

    if (noTokenResponse.ok) {
      console.log('❌ Request without token was accepted (this should fail)');
    } else {
      console.log('✅ Request without token rejected correctly');
    }
    console.log();

    console.log('All authentication tests completed successfully! ✅');

  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

testAuthFlow();
