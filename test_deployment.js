const axios = require('axios');

async function testDeployment() {
    try {
        console.log('--- 1. Verification of Admin Access ---');
        // Note: In real life we need a valid token. 
        // For this test, our dev server might be lenient or we mock authentication headers if we run this via 'node' directly against controller logic, 
        // OR we use the actual login endpoint first.
        
        // Let's assume we can hit the endpoint if we have a valid token. 
        // Getting a token via login for a known admin user (seeded in DB).
        const loginRes = await axios.post('http://localhost:8080/api/auth/login', {
            email: 'admin@wolfhms.com', // Default seeded admin
            password: 'password123'
        });
        const token = loginRes.data.data.token;
        console.log('Admin Token Acquired');

        console.log('--- 2. Deploy New Tenant ---');
        const uniqueDomain = `test-hospital-${Date.now()}.wolfhms.com`;
        const deployRes = await axios.post('http://localhost:8080/api/platform/deploy', {
            hospital_name: 'Test Hospital Auto',
            hospital_domain: uniqueDomain,
            admin_email: `admin-${Date.now()}@test.com`,
            admin_password: 'securepass123',
            plan: 'standard'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Deployment Response:', deployRes.data);

        if (deployRes.data.success) {
            console.log('✅ Deployment Verified');
        } else {
            console.error('❌ Deployment Failed', deployRes.data);
        }

    } catch (e) {
        console.error('Test Failed Details:', {
            message: e.message,
            code: e.code,
            responseStatus: e.response?.status,
            responseData: e.response?.data
        });
    }
}

testDeployment();
