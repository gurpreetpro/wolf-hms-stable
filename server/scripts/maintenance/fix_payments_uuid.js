const { pool } = require('./db');

async function fixSchemaCorrectly() {
    try {
        console.log('🔧 Fixing payments table schema (Correcting Types)...');
        
        // Check if patient_id exists first
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'patient_id'");
        
        if (res.rows.length === 0) {
            console.log('⚠️ patient_id column missing. Adding it as UUID...');
            await pool.query('ALTER TABLE payments ADD COLUMN patient_id UUID REFERENCES patients(id)');
            console.log('✅ patient_id (UUID) added successfully.');
        } else {
            console.log('ℹ️ patient_id column already exists.');
        }

        // Also check/fix visit_id (should be integer as opd_visits.id is serial/int)
         try { await pool.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS visit_id INTEGER REFERENCES opd_visits(id)"); } catch (e) { console.log('visit_id error (ignored):', e.message); }
         try { await pool.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2)"); } catch (e) { console.log('amount error (ignored):', e.message); }
         try { await pool.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50)"); } catch (e) { console.log('payment_mode error (ignored):', e.message); }
         try { await pool.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100)"); } catch (e) { console.log('transaction_id error (ignored):', e.message); }

        process.exit(0);
    } catch (error) {
        console.error('❌ Schema fix failed:', error);
        process.exit(1);
    }
}

fixSchemaCorrectly();
