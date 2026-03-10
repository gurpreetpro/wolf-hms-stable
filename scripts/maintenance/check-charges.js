const axios = require('axios');
async function q() {
    // Check ward_service_charges schema
    console.log('=== ward_service_charges schema ===');
    let r = await axios.post('https://wolfhms-fdurncganq-el.a.run.app/api/health/exec-sql', {
        sql: "SELECT column_name FROM information_schema.columns WHERE table_name = 'ward_service_charges'",
        setupKey: 'WolfSetup2024!'
    });
    console.log(r.data.rows);

    // Check if data exists
    console.log('\n=== ward_service_charges data ===');
    r = await axios.post('https://wolfhms-fdurncganq-el.a.run.app/api/health/exec-sql', {
        sql: "SELECT * FROM ward_service_charges LIMIT 5",
        setupKey: 'WolfSetup2024!'
    });
    console.log(r.data);
}
q();
