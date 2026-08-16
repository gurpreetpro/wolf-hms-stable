const { pool } = require('./server/db');

async function migratePatientsSchema() {
    console.log('🔄 Executing Patients Schema Alteration...');
    try {
        await pool.query(`
            ALTER TABLE patients 
            ADD COLUMN IF NOT EXISTS abha_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS global_uhid VARCHAR(255);
        `);
        console.log('✅ Patients schema updated successfully! Added abha_id and global_uhid columns.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

migratePatientsSchema();
