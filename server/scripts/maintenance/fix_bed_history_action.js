const pool = require('./config/db');

const fixSchema = async () => {
    try {
        console.log('Fixing bed_history schema...');

        // Add 'action' column if it doesn't exist
        await pool.query(`
            ALTER TABLE bed_history 
            ADD COLUMN IF NOT EXISTS action VARCHAR(20);
        `);

        console.log('✅ Added action column.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error fixing schema:', err);
        process.exit(1);
    }
};

fixSchema();
