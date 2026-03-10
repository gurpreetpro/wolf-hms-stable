// Quick fix for controlled_substance_log
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool();

async function fix() {
    try {
        await pool.query(`ALTER TABLE controlled_substance_log ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
        console.log('✅ Added dispensed_at column');
        
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_csl_hospital_dispensed ON controlled_substance_log(hospital_id, dispensed_at DESC)`);
        console.log('✅ Created index');
        
        console.log('🎉 All Phase 1 migrations complete!');
    } catch (e) {
        console.log('❌', e.message);
    } finally {
        await pool.end();
    }
}

fix();
