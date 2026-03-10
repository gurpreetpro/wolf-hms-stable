const axios = require('axios');
const CLOUD_URL = 'https://wolfhms-fdurncganq-el.a.run.app';

async function execSql(query) {
    const res = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, { 
        sql: query,
        setupKey: 'WolfSetup2024!'
    });
    return res.data;
}

async function fix() {
    console.log('🔧 Fixing hospital_id NULL values...\n');

    // Fix ward_service_charges
    console.log('Fixing ward_service_charges...');
    await execSql("UPDATE ward_service_charges SET hospital_id = 1 WHERE hospital_id IS NULL");
    let r = await execSql("SELECT COUNT(*) as cnt FROM ward_service_charges WHERE hospital_id = 1");
    console.log('  ✅ Charges with hospital_id=1:', r.rows[0].cnt);

    // Fix ward_consumables
    console.log('Fixing ward_consumables...');
    await execSql("UPDATE ward_consumables SET hospital_id = 1 WHERE hospital_id IS NULL");
    r = await execSql("SELECT COUNT(*) as cnt FROM ward_consumables WHERE hospital_id = 1");
    console.log('  ✅ Consumables with hospital_id=1:', r.rows[0].cnt);

    console.log('\n🎉 Done!');
}

fix();
