const axios = require('axios');
const API_URL = 'https://wolf-hms-1026194439642.asia-south1.run.app';

async function verify() {
    console.log(`🔍 Verifying Backend Update at: ${API_URL}`);
    try {
        // 1. Health Check
        const health = await axios.get(`${API_URL}/api/health`);
        console.log(`✅ Health: ${health.status} ${health.data.status || 'OK'}`);

        // 2. Branding Lookup (This Requires New Code)
        // Try looking up 'mobile-test' code. 
        // If Old Code: Returns 404 or Default (because it only checked subdomain)
        // If New Code: Returns Hospital Object WITH ID
        try {
            const branding = await axios.get(`${API_URL}/api/hospitals/branding/mobile-test`);
            console.log('✅ Branding API Response:', branding.status);
            
            const data = branding.data.data || branding.data;
            if (data.id) {
                console.log(`✅ SUCCESS: Returned Hospital ID: ${data.id} (Name: ${data.name})`);
                console.log('🚀 Backend Update Verified!');
            } else {
                console.log('⚠️ WARNING: Response missing ID. Still running old code?');
                console.log(data);
            }
        } catch (e) {
            console.log('❌ Branding Lookup Failed:', e.response?.status, e.response?.data);
            // If 404, maybe hospital doesn't exist?
            // "mobile-test" code was inserted into 'hospitals' table. 
            // If the table is shared (Cloud SQL), it should exist.
        }

    } catch (e) {
        console.error('❌ Server Verification Failed:', e.message);
    }
}

verify();
