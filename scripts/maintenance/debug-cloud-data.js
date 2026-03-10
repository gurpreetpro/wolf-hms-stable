/**
 * Check and Debug Ward Data in Cloud
 */

const axios = require('axios');
const CLOUD_URL = 'https://wolf-hms-server-1026194439642.asia-south1.run.app';

async function execSql(query) {
    try {
        console.log(`[EXEC] ${query.substring(0, 80)}...`);
        const res = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, { 
            sql: query,
            setupKey: 'WolfSetup2024!'
        });
        console.log('  → Result:', JSON.stringify(res.data).substring(0, 200));
        return res.data;
    } catch (e) {
        console.error(`[ERROR] ${e.message}`);
        if (e.response) console.error(JSON.stringify(e.response.data));
        return { error: e.message };
    }
}

async function debug() {
    console.log('🔍 Debugging Ward Data in Cloud...\n');

    // Check wards
    console.log('📌 Checking Wards:');
    await execSql("SELECT id, name, type, hospital_id FROM wards ORDER BY id LIMIT 10");

    // Check beds count
    console.log('\n📌 Checking Beds Count:');
    await execSql("SELECT COUNT(*) as total_beds FROM beds");

    // Check beds with ward join
    console.log('\n📌 Checking Beds with Ward Join (what API sees):');
    await execSql("SELECT b.id, b.bed_number, b.status, w.name as ward_name, w.hospital_id FROM beds b JOIN wards w ON w.id = b.ward_id LIMIT 10");

    // Check if beds exist but without hospital_id on wards
    console.log('\n📌 Checking Beds Raw:');
    await execSql("SELECT id, ward_id, bed_number, status FROM beds LIMIT 10");

    // Check patients
    console.log('\n📌 Checking Patients:');
    await execSql("SELECT id, name, phone FROM patients LIMIT 10");

    // Check admissions
    console.log('\n📌 Checking Admissions:');
    await execSql("SELECT id, patient_id, ward, bed_number, status FROM admissions WHERE status = 'Admitted' LIMIT 10");

    console.log('\n✅ Debug Complete');
}

debug();
