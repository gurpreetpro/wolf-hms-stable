const axios = require('axios');
const API_URL = 'http://localhost:5000/api';

const runAudit = async () => {
    console.log('🔍 Starting Local Audit...');
    
    // 1. Health Check
    try {
        const health = await axios.get(`${API_URL}/health`);
        console.log('✅ Health Check Passed:', JSON.stringify(health.data, null, 2));
    } catch (e) {
        console.error('❌ Health Check Failed:', e.message);
        if (e.response && e.response.data) {
             console.log(JSON.stringify(e.response.data, null, 2));
        }
    }

    // 2. Login (Admin)
    let token = '';
    try {
        const login = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin_user',
            password: 'admin123'
        });
        token = login.data.token;
        console.log('✅ Login Passed');
    } catch (e) {
        console.error('❌ Login Failed:', e.response?.data || e.message);
        return; // Stop if login fails
    }

    const authHeader = { headers: { Authorization: `Bearer ${token}` } };

    // 3. User Management
    try {
        const users = await axios.get(`${API_URL}/users`, authHeader);
        console.log(`✅ Users Endpoint: Found ${users.data.length} users`);
    } catch (e) {
        console.error('❌ Users Endpoint Failed:', e.message);
    }
    
    // 4. Platform Endpoints
     try {
        const tenants = await axios.get(`${API_URL}/platform/tenants`, authHeader);
        console.log(`✅ Platform Tenants: Found ${tenants.data.length} tenants`);
    } catch (e) {
        console.error('❌ Platform Tenants Failed (Expected if not platform admin):', e.response?.status);
    }

    console.log('🏁 Audit Complete');
};

runAudit();
