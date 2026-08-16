const { pool } = require('../../server/db');

async function fix() {
    // Check patients.id type
    const colCheck = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'id'
    `);
    console.log('patients.id type:', colCheck.rows[0]?.data_type);

    // Drop and recreate with correct types
    await pool.query(`DROP TABLE IF EXISTS govt_scheme_beneficiaries CASCADE`);

    const patientIdType = colCheck.rows[0]?.data_type === 'uuid' ? 'UUID' : 'INTEGER';
    
    await pool.query(`
        CREATE TABLE IF NOT EXISTS govt_scheme_beneficiaries (
            id SERIAL PRIMARY KEY,
            patient_id ${patientIdType},
            scheme_name VARCHAR(100),
            scheme_code VARCHAR(50),
            scheme_type VARCHAR(50),
            beneficiary_id VARCHAR(100),
            card_number VARCHAR(100),
            verification_status VARCHAR(30) DEFAULT 'pending',
            is_active BOOLEAN DEFAULT true,
            status VARCHAR(30) DEFAULT 'active',
            verified_at TIMESTAMPTZ,
            hospital_id INTEGER,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);
    console.log('✅ govt_scheme_beneficiaries recreated with patient_id as', patientIdType);

    // Fix login_audit_log - add missing columns
    await pool.query(`
        ALTER TABLE login_audit_log ADD COLUMN IF NOT EXISTS details JSONB;
        ALTER TABLE login_audit_log ADD COLUMN IF NOT EXISTS device_info TEXT;
        ALTER TABLE login_audit_log ADD COLUMN IF NOT EXISTS location TEXT;
    `);
    console.log('✅ login_audit_log columns patched');

    // Fix users table - add more missing columns
    await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_failed_ip VARCHAR(45);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);
    `);
    console.log('✅ users columns patched');

    process.exit(0);
}

fix().catch(e => { console.error('❌', e.message); process.exit(1); });
