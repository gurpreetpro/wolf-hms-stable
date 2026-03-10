const axios = require('axios');

const CLOUD_URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app';

async function testCloudLogin() {
    console.log('=== TEST CLOUD LOGIN ===');
    try {
        const res = await axios.post(`${CLOUD_URL}/api/auth/login`, {
            email: 'gurpreetpro@gmail.com',
            password: 'password123'
        });
        console.log('Login Status:', res.status);
        console.log('Role:', res.data.user.role);
        console.log('Hospital ID:', res.data.user.hospital_id); // Should be NULL
        console.log('Token received:', !!res.data.token);
    } catch (err) {
        console.log('Login Failed:', err.response?.data || err.message);
    }
}

testCloudLogin();
