/**
 * Fix Lab Payment Schema - Add missing columns for payment processing
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function fixLabPaymentSchema() {
    try {
        console.log('🔧 Adding missing lab payment columns...\n');

        const columns = [
            'ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50)',
            'ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)',
            'ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMP',
            'ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS payment_received_by INTEGER',
            'ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS paid_by_username VARCHAR(255)',
            'ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS payment_location VARCHAR(50)',
            'ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100)',
            'ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2)',
            'ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS test_price DECIMAL(10,2)',
            'ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS price DECIMAL(10,2)'
        ];

        for (const sql of columns) {
            await pool.query(sql);
            const colName = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)[1];
            console.log(`✅ Added column: ${colName}`);
        }

        console.log('\n🎉 All payment columns added successfully!');
        console.log('\n📌 Try the lab payment again now.');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

fixLabPaymentSchema();
