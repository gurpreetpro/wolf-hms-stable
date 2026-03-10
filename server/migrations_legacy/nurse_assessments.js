/**
 * Gold Standard Phase 3 Migration - Nurse Dashboard Tables
 * Creates wound_assessments and fall_risk_assessments tables
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function migrate() {
    const client = await pool.connect();
    
    try {
        console.log('🏥 Gold Standard Phase 3 Migration');
        console.log('━'.repeat(50));

        // 1. Create wound_assessments table
        console.log('1️⃣ Creating wound_assessments table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS wound_assessments (
                id SERIAL PRIMARY KEY,
                admission_id INTEGER NOT NULL,
                patient_id INTEGER NOT NULL,
                location VARCHAR(255) NOT NULL,
                type VARCHAR(100),
                size_cm VARCHAR(50),
                appearance VARCHAR(50),
                drainage VARCHAR(50),
                dressing_type VARCHAR(255),
                notes TEXT,
                assessed_by INTEGER,
                assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ wound_assessments table created');

        // 2. Create fall_risk_assessments table
        console.log('2️⃣ Creating fall_risk_assessments table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS fall_risk_assessments (
                id SERIAL PRIMARY KEY,
                admission_id INTEGER NOT NULL,
                patient_id INTEGER NOT NULL,
                score INTEGER NOT NULL,
                risk_level VARCHAR(20) NOT NULL,
                history_of_falling INTEGER DEFAULT 0,
                secondary_diagnosis INTEGER DEFAULT 0,
                ambulatory_aid INTEGER DEFAULT 0,
                iv_therapy INTEGER DEFAULT 0,
                gait INTEGER DEFAULT 0,
                mental_status INTEGER DEFAULT 0,
                assessed_by INTEGER,
                assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ fall_risk_assessments table created');

        // 3. Create indexes
        console.log('3️⃣ Creating indexes...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_wound_admission ON wound_assessments(admission_id);
            CREATE INDEX IF NOT EXISTS idx_fall_admission ON fall_risk_assessments(admission_id);
        `);
        console.log('   ✅ Indexes created');

        console.log('━'.repeat(50));
        console.log('✅ Migration completed successfully!');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(console.error);
