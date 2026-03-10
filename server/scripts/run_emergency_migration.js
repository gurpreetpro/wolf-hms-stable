const pool = require('./config/db');

const migrate = async () => {
    try {
        console.log('Running migration: add_resolve_columns_to_emergency...');
        await pool.query(`
            ALTER TABLE emergency_logs 
            ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP, 
            ADD COLUMN IF NOT EXISTS resolved_by INTEGER REFERENCES users(id);
        `);
        console.log('✅ Migration successful: Added resolved_at and resolved_by columns.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        pool.end();
    }
};

migrate();
