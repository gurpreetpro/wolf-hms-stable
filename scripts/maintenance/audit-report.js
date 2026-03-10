const axios = require('axios');
const fs = require('fs');
const API_URL = 'http://localhost:5000/api';

const runAudit = async () => {
    const report = {
        timestamp: new Date().toISOString(),
        health: null,
        login: null,
        users: null,
        platform_tenants: null,
        errors: []
    };

    console.log('🔍 Starting Audit...');

    // 1. Health
    try {
        const res = await axios.get(`${API_URL}/health`);
        report.health = res.data;
    } catch (e) {
        report.errors.push(`Health Check Failed: ${e.message}`);
        if(e.response) report.health = e.response.data;
    }

    // 2. Login
    let token = '';
    try {
        const res = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin_user',
            password: 'admin123'
        });
        report.login = { success: true, user: res.data.user };
        token = res.data.token;
    } catch (e) {
        report.errors.push(`Login Failed: ${e.message}`);
        report.login = { success: false, error: e.response?.data };
    }

    if (token) {
        const authConfig = { headers: { Authorization: `Bearer ${token}` } };
        
        // 3. Users
        try {
            const res = await axios.get(`${API_URL}/users`, authConfig);
            // ResponseHandler wraps data in { success: true, data: [...] }
            const usersList = res.data.data || res.data; 
            report.users = { count: usersList.length, first_5: usersList.slice(0, 5) };
        } catch (e) {
            report.errors.push(`Users Fetch Failed: ${e.message}`);
        }

        // 4. Platform Tenants
        try {
            const res = await axios.get(`${API_URL}/platform/tenants`, authConfig);
            report.platform_tenants = res.data;
        } catch (e) {
            report.errors.push(`Platform Tenants Failed: ${e.message} (Status: ${e.response?.status})`);
        }
    }

    fs.writeFileSync('audit_report.json', JSON.stringify(report, null, 2));
    console.log('✅ Audit Report saved to audit_report.json');
};

runAudit();
