const pool = require('./config/db');

const fixSchema = async () => {
    try {
        console.log('Fixing bed_history schema...');

        // Add end_time column if it doesn't exist
        await pool.query("ALTER TABLE bed_history ADD COLUMN IF NOT EXISTS end_time TIMESTAMP");
        console.log('Added end_time column.');

        // Add start_time column if we want to be explicit, but timestamp is likely start_time.
        // The controller uses 'timestamp' as default for insert (start time).

        // Also check if action column exists, it should.

        console.log('✅ Schema fixed successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error fixing schema:', err);
        process.exit(1);
    }
};

fixSchema();
