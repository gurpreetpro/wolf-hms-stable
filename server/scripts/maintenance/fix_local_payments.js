const { pool } = require('./db');

async function fixSchema() {
    try {
        console.log('🔧 Fixing payments table schema...');
        
        // 1. Add columns individually to avoid transaction rollback on single error
        try { await pool.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS patient_id INTEGER REFERENCES patients(id)"); } catch (e) { console.log('patient_id error (ignored):', e.message); }
        try { await pool.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS visit_id INTEGER REFERENCES opd_visits(id)"); } catch (e) { console.log('visit_id error (ignored):', e.message); }
        try { await pool.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2)"); } catch (e) { console.log('amount error (ignored):', e.message); }
        try { await pool.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50)"); } catch (e) { console.log('payment_mode error (ignored):', e.message); }
        try { await pool.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100)"); } catch (e) { console.log('transaction_id error (ignored):', e.message); }
        try { await pool.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending'"); } catch (e) { console.log('status error (ignored):', e.message); }
        try { await pool.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id)"); } catch (e) { console.log('created_by error (ignored):', e.message); }
        
        console.log('✅ Schema fixed: Attempted to add all columns.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Schema fix failed:', error);
        process.exit(1);
    }
}

fixSchema();
