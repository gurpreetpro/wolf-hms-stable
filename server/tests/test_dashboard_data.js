const axios = require('axios');
const BASE_URL = 'http://localhost:5001/api';

async function testDashboardData() {
    try {
        // Login as admin
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'admin_user',
            password: 'password123'
        });
        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        console.log('Testing Dashboard Endpoints...');

        // 1. Recent Patients
        try {
            const patientsRes = await axios.get(`${BASE_URL}/admin/patients`, { headers });
            console.log(`[PASS] Recent Patients: ${patientsRes.data.length} items`);
            if (patientsRes.data.length > 0) console.log('Sample:', patientsRes.data[0]);
        } catch (e) { console.error('[FAIL] Recent Patients:', e.message); }

        // 2. Activity Stats
        try {
            const activityRes = await axios.get(`${BASE_URL}/analytics/activity`, { headers });
            console.log(`[PASS] Activity Stats: ${activityRes.data.length} items`);
            if (activityRes.data.length > 0) console.log('Sample:', activityRes.data[0]);
        } catch (e) { console.error('[FAIL] Activity Stats:', e.message); }

        // 3. Daily Tasks
        try {
            const tasksRes = await axios.get(`${BASE_URL}/admin/tasks`, { headers });
            console.log(`[PASS] Daily Tasks: ${tasksRes.data.length} items`);
            if (tasksRes.data.length > 0) console.log('Sample:', tasksRes.data[0]);
        } catch (e) { console.error('[FAIL] Daily Tasks:', e.message); }

        // 4. Ward Occupancy
        try {
            const occupancyRes = await axios.get(`${BASE_URL}/beds/occupancy`, { headers });
            console.log(`[PASS] Ward Occupancy: ${occupancyRes.data.length} items`);
            if (occupancyRes.data.length > 0) console.log('Sample:', occupancyRes.data[0]);
        } catch (e) { console.error('[FAIL] Ward Occupancy:', e.message); }

    } catch (err) {
        console.error('Login Failed:', err.response?.data || err.message);
    }
}

testDashboardData();
