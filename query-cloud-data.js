/**
 * Query wards and beds data
 */
const axios = require('axios');
const CLOUD_URL = 'https://wolf-hms-server-1026194439642.asia-south1.run.app';

async function query() {
    try {
        console.log('=== WARDS ===');
        let res = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, { 
            sql: "SELECT * FROM wards LIMIT 10",
            setupKey: 'WolfSetup2024!'
        });
        console.log(JSON.stringify(res.data, null, 2));

        console.log('\n=== BEDS COUNT ===');
        res = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, { 
            sql: "SELECT COUNT(*) as cnt FROM beds",
            setupKey: 'WolfSetup2024!'
        });
        console.log(JSON.stringify(res.data, null, 2));

        console.log('\n=== BEDS SAMPLE ===');
        res = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, { 
            sql: "SELECT * FROM beds LIMIT 5",
            setupKey: 'WolfSetup2024!'
        });
        console.log(JSON.stringify(res.data, null, 2));

        console.log('\n=== TABLE SCHEMA FOR BEDS ===');
        res = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, { 
            sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'beds' ORDER BY ordinal_position",
            setupKey: 'WolfSetup2024!'
        });
        console.log(JSON.stringify(res.data, null, 2));

    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) console.error(JSON.stringify(e.response.data));
    }
}

query();
