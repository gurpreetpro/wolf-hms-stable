const axios = require('axios');

const API_URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app';

async function test() {
    try {
        console.log('1. Logging in...');
        const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
            username: 'admin_kokila', // Trying default admin first, or admin_kokila
            password: 'password123'
        });
        
        const token = loginRes.data.token;
        console.log('Login successful. Token obtained.');
        
        const headers = { Authorization: `Bearer ${token}` };
        
        console.log('\n2. Testing /api/auth/users...');
        try {
            const usersRes = await axios.get(`${API_URL}/api/auth/users?t=${Date.now()}`, { headers });
            console.log(`PASS: /api/auth/users found ${usersRes.data.data ? usersRes.data.data.length : (Array.isArray(usersRes.data) ? usersRes.data.length : 'unknown')} users`);
        } catch (e) {
            console.log(`FAIL: /api/auth/users - ${e.message}`);
            if (e.response) console.log('Data:', e.response.data);
        }
        
        console.log('\n3. Testing /api/admin/staff...');
        try {
            const staffRes = await axios.get(`${API_URL}/api/admin/staff`, { headers });
            console.log(`PASS: /api/admin/staff found ${staffRes.data.count || staffRes.data.length} staff`);
        } catch (e) {
            console.log(`FAIL: /api/admin/staff - ${e.message} (Status: ${e.response?.status})`);
        }

    } catch (e) {
        console.error('Login Failed:', e.message);
        if (e.response) console.error('Data:', e.response.data);
    }
}

test();
