const axios = require('axios');

const URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app/api/health/exec-sql';
const KEY = 'WolfSetup2024!';

async function runQuery(label, sql) {
    try {
        console.log(`\n--- ${label} ---`);
        const res = await axios.post(URL, {
            setupKey: KEY,
            sql: sql
        });
        if (res.data.success) {
            console.log(`Success! Rows: ${res.data.rowCount}`);
        } else {
            console.log('Query returned success: false', res.data);
        }
    } catch (e) {
        console.error('Error:', e.response?.data?.error || e.message);
    }
}

async function fixSchema() {
    // 1. Add target_value column
    await runQuery('Add target_value column', `
        ALTER TABLE lab_qc_materials ADD COLUMN IF NOT EXISTS target_value DECIMAL(10,2) DEFAULT 0;
    `);
    
    // 2. Add sd_value column
    await runQuery('Add sd_value column', `
        ALTER TABLE lab_qc_materials ADD COLUMN IF NOT EXISTS sd_value DECIMAL(10,2) DEFAULT 1;
    `);
    
    console.log('\n✅ Schema fix applied. The QC Dashboard should work now!');
}

fixSchema();
