const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const { pool } = require('../server/config/db');

async function runFix() {
    try {
        console.log('🔧 Fixing Payments Table Schema...');
        const client = await pool.connect();
        
        // Fix patient_id
        try {
            await client.query("ALTER TABLE payments ALTER COLUMN patient_id TYPE VARCHAR(255) USING patient_id::VARCHAR");
            console.log("✅ Converted patient_id to VARCHAR");
        } catch (e) { console.log("⚠️ patient_id fix:", e.message); }

        // Fix visit_id
        try {
            await client.query("ALTER TABLE payments ALTER COLUMN visit_id TYPE VARCHAR(255) USING visit_id::VARCHAR");
            console.log("✅ Converted visit_id to VARCHAR");
        } catch (e) { console.log("⚠️ visit_id fix:", e.message); }

        // Fix invoice_id
        try {
            await client.query("ALTER TABLE payments ALTER COLUMN invoice_id TYPE VARCHAR(255) USING invoice_id::VARCHAR");
            console.log("✅ Converted invoice_id to VARCHAR");
        } catch (e) { console.log("⚠️ invoice_id fix:", e.message); }

        client.release();
        console.log('✅ Fix Complete');
    } catch (err) {
        console.error('❌ Fix Failed:', err);
    } finally {
        await pool.end();
    }
}

runFix();
