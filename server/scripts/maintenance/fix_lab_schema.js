const { pool } = require('./db');

async function fixLabSchema() {
    try {
        console.log('🔧 Fixing Lab Schema...');

        // 1. Ensure lab_audit_log table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS lab_audit_log (
                id SERIAL PRIMARY KEY,
                lab_order_id INTEGER,
                action VARCHAR(100),
                performed_by INTEGER,
                details JSONB,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Checked/Created lab_audit_log table');

        // 2. Add Payment columns to lab_requests if missing
        const columns = [
            "ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Pending'",
            "ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)",
            "ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2)",
            "ADD COLUMN IF NOT EXISTS payment_transaction_ref VARCHAR(100)",
            "ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMP",
            "ADD COLUMN IF NOT EXISTS payment_received_by INTEGER REFERENCES users(id)",
            "ADD COLUMN IF NOT EXISTS barcode VARCHAR(50)",
            "ADD COLUMN IF NOT EXISTS sample_collected_at TIMESTAMP",
            "ADD COLUMN IF NOT EXISTS collected_by INTEGER REFERENCES users(id)",
            "ADD COLUMN IF NOT EXISTS notes TEXT",
            "ADD COLUMN IF NOT EXISTS has_critical_value BOOLEAN DEFAULT FALSE"
        ];

        for (const col of columns) {
            try {
                await pool.query(`ALTER TABLE lab_requests ${col}`);
            } catch (e) {
                console.log(`⚠️ Column add warning (likely exists): ${col} - ${e.message}`);
            }
        }
        console.log('✅ Checked/Added lab_requests columns');

        // 3. Ensure lab_critical_alerts table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS lab_critical_alerts (
                id SERIAL PRIMARY KEY,
                lab_request_id INTEGER REFERENCES lab_requests(id),
                patient_id UUID REFERENCES patients(id),
                doctor_id INTEGER REFERENCES users(id),
                parameter VARCHAR(100),
                value DECIMAL(10,2),
                unit VARCHAR(20),
                alert_type VARCHAR(20),
                acknowledged BOOLEAN DEFAULT FALSE,
                acknowledged_by INTEGER REFERENCES users(id),
                acknowledged_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Checked/Created lab_critical_alerts table');

        process.exit(0);
    } catch (error) {
        console.error('❌ Lab Schema fix failed:', error);
        process.exit(1);
    }
}

fixLabSchema();
