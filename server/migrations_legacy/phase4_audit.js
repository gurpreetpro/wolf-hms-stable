/**
 * Phase 4 Migration - Audit Trail and Receipt History
 * Creates tables for comprehensive audit logging
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function migrate() {
    const client = await pool.connect();
    
    try {
        console.log('🏥 Gold Standard Phase 4 Migration');
        console.log('━'.repeat(50));

        // 1. Create audit_logs table
        console.log('1️⃣ Creating audit_logs table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                action VARCHAR(100) NOT NULL,
                entity_type VARCHAR(50) NOT NULL,
                entity_id INTEGER,
                user_id INTEGER,
                user_name VARCHAR(255),
                user_role VARCHAR(50),
                old_value JSONB,
                new_value JSONB,
                ip_address VARCHAR(50),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ audit_logs table created');

        // 2. Create receipt_history table
        console.log('2️⃣ Creating receipt_history table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS receipt_history (
                id SERIAL PRIMARY KEY,
                receipt_number VARCHAR(50) UNIQUE NOT NULL,
                receipt_type VARCHAR(50) NOT NULL,
                patient_id INTEGER NOT NULL,
                patient_name VARCHAR(255),
                visit_id INTEGER,
                admission_id INTEGER,
                amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                payment_mode VARCHAR(50),
                items JSONB,
                billing_details JSONB,
                generated_by INTEGER,
                generated_by_name VARCHAR(255),
                printed_count INTEGER DEFAULT 1,
                last_printed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ receipt_history table created');

        // 3. Create indexes
        console.log('3️⃣ Creating indexes...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
            CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
            CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_receipt_patient ON receipt_history(patient_id);
            CREATE INDEX IF NOT EXISTS idx_receipt_number ON receipt_history(receipt_number);
            CREATE INDEX IF NOT EXISTS idx_receipt_type ON receipt_history(receipt_type);
        `);
        console.log('   ✅ Indexes created');

        console.log('━'.repeat(50));
        console.log('✅ Phase 4 Migration completed successfully!');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(console.error);
