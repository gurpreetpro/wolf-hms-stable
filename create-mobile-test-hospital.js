const axios = require('axios');
const CLOUD_URL = 'https://wolf-hms-1026194439642.asia-south1.run.app';

async function execSql(query) {
    try {
        const res = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, { 
            sql: query,
            setupKey: 'WolfSetup2024!'
        });
        return res.data;
    } catch (e) {
        console.error(`[ERROR] ${e.message}`);
        if(e.response) console.error(JSON.stringify(e.response.data));
    }
}

async function createTestHospital() {
    console.log(' Creating Mobile Test Hospital via API...');
    
    // Check if exists
    const check = await execSql("SELECT id FROM hospitals WHERE code = 'mobile-test'");
    if (check && check.rows && check.rows.length > 0) {
        console.log(' Hospital mobile-test already exists. ID:', check.rows[0].id);
        return;
    }

    // Create
    const result = await execSql(`
        INSERT INTO hospitals (
            code, name, subdomain, 
            primary_color, secondary_color, 
            logo_url, 
            subscription_tier, is_active
        ) VALUES (
            'mobile-test', 'Wolf Mobile Test Hospital', 'mobile-test-hms',
            '#FF5733', '#1F2937', 
            'https://via.placeholder.com/150',
            'enterprise', true
        ) RETURNING id, code, name
    `);

    if (result && result.rows) {
        console.log(' Success! Created Hospital:', result.rows[0]);
    } else {
        console.log('Failed to create hospital. Result:', result);
    }
}

createTestHospital();
