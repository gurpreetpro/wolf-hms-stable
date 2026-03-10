// Lab Dashboard Phase 2 Database Migrations
// Run: node run_lab_phase2.js

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: String(process.env.DB_PASSWORD || 'password'),
    port: process.env.DB_PORT || 5432,
});

async function addColumn(client, table, column, type) {
    try {
        await client.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        console.log(`   + Added ${column}`);
    } catch (e) {
        if (e.message.includes('already exists')) {
            console.log(`   ✓ ${column} already exists`);
        } else {
            console.error(`   ✗ Error adding ${column}:`, e.message);
        }
    }
}

async function runMigrations() {
    const client = await pool.connect();

    try {
        console.log('\n📊 Lab Dashboard Phase 2 Migrations\n');
        console.log('='.repeat(45));

        // 1. Add verification columns to lab_results
        console.log('\n1️⃣ Adding verification columns to lab_results...');
        await addColumn(client, 'lab_results', 'verified_by', 'INTEGER');
        await addColumn(client, 'lab_results', 'verified_at', 'TIMESTAMP');
        await addColumn(client, 'lab_results', 'amendment_count', 'INTEGER DEFAULT 0');

        // 2. Create lab_result_versions table
        console.log('\n2️⃣ Creating lab_result_versions table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS lab_result_versions (
                id SERIAL PRIMARY KEY,
                result_id INTEGER,
                version INTEGER NOT NULL,
                result_json JSONB,
                amendment_reason TEXT,
                amended_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_result_versions ON lab_result_versions(result_id)`);
        console.log('   ✅ lab_result_versions ready');

        // 3. Create lab_critical_alerts table
        console.log('\n3️⃣ Creating lab_critical_alerts table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS lab_critical_alerts (
                id SERIAL PRIMARY KEY,
                lab_request_id INTEGER,
                patient_id INTEGER,
                doctor_id INTEGER,
                parameter VARCHAR(100),
                value DECIMAL(10,2),
                unit VARCHAR(20),
                alert_type VARCHAR(20),
                acknowledged BOOLEAN DEFAULT FALSE,
                acknowledged_by INTEGER,
                acknowledged_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_critical_alerts_request ON lab_critical_alerts(lab_request_id)`);
        console.log('   ✅ lab_critical_alerts ready');

        // 4. Verify tables
        console.log('\n4️⃣ Verifying tables...');
        const tables = await client.query(`
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('lab_result_versions', 'lab_critical_alerts')
        `);
        console.log(`   ✅ Found ${tables.rowCount} Phase 2 tables`);

        // 5. Check lab_results columns
        const cols = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'lab_results' 
            AND column_name IN ('verified_by', 'verified_at', 'amendment_count')
        `);
        console.log(`   ✅ ${cols.rowCount} verification columns in lab_results`);

        console.log('\n' + '='.repeat(45));
        console.log('🎉 Phase 2 Migrations Complete!\n');

    } catch (error) {
        console.error('\n❌ Migration Error:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations();
