const pool = require('./config/db');

async function fixSchema() {
    try {
        console.log('🔧 Fixing opd_visits schema...');
        await pool.query(`
            ALTER TABLE opd_visits 
            ADD COLUMN IF NOT EXISTS notes TEXT,
            ADD COLUMN IF NOT EXISTS consultation_type VARCHAR(50) DEFAULT 'in-person';
        `);
        console.log('✅ Schema fixed: Added notes and consultation_type to opd_visits');
        process.exit(0);
    } catch (error) {
        console.error('❌ Schema Fix Failed:', error);
        process.exit(1);
    }
}

fixSchema();
