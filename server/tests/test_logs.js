const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let token = '';

async function runTests() {
    try {
        // 1. Login as Admin (Should create a log)
        console.log('1. Logging in as Admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin_user',
            password: 'password123'
        });
        token = loginRes.data.token;
        console.log('✅ Login successful');

        // 2. Fetch Logs
        console.log('\n2. Fetching Logs...');
        const logsRes = await axios.get(`${API_URL}/admin/logs`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const logs = logsRes.data.logs;

        // 3. Verify Login Log
        const loginLog = logs.find(l => l.action === 'LOGIN' && l.username === 'admin_user');
        if (loginLog) {
            console.log('✅ Found LOGIN log for admin_user');
            console.log(`   Details: ${loginLog.details}`);
            console.log(`   Time: ${loginLog.timestamp}`);
        } else {
            throw new Error('LOGIN log not found');
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

runTests();
