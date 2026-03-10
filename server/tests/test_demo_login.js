const axios = require('axios');

async function testDemoLogin() {
    try {
        console.log('Testing /api/auth/demo-login...');
        const res = await axios.post('http://localhost:5000/api/auth/demo-login');
        console.log('Status:', res.status);
        console.log('Token:', res.data.token ? 'Present' : 'Missing');
        console.log('User:', res.data.user);

        if (res.data.token) {
            // Check token structure
            const parts = res.data.token.split('.');
            console.log('Token parts:', parts.length);
            if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                console.log('Token Payload:', payload);
            }
        }
    } catch (err) {
        console.error('Login Failed:', err.response?.data || err.message);
    }
}

testDemoLogin();
