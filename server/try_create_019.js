const { pool } = require('./db');

async function run() {
    try {
        console.log('🧪 Testing 019 SQL...');
        
        await pool.query('DROP TABLE IF EXISTS patient_insurance CASCADE');
        await pool.query('DROP TABLE IF EXISTS tpa_providers CASCADE');
        
        console.log('Creating tpa_providers...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tpa_providers (
                id SERIAL PRIMARY KEY,
                code VARCHAR(30) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                short_name VARCHAR(20),
                logo_url VARCHAR(255),
                integration_type VARCHAR(20) NOT NULL DEFAULT 'api',
                api_base_url VARCHAR(255),
                sandbox_url VARCHAR(255),
                supports_eligibility BOOLEAN DEFAULT true,
                supports_preauth BOOLEAN DEFAULT true,
                supports_eclaim BOOLEAN DEFAULT true,
                supports_cashless BOOLEAN DEFAULT true,
                supports_reimbursement BOOLEAN DEFAULT true,
                api_config JSONB DEFAULT '{}',
                field_mapping JSONB DEFAULT '{}',
                support_email VARCHAR(100),
                support_phone VARCHAR(20),
                website VARCHAR(255),
                is_active BOOLEAN DEFAULT true,
                is_verified BOOLEAN DEFAULT false,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log('Creating patient_insurance...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS patient_insurance (
                id SERIAL PRIMARY KEY,
                patient_id UUID NOT NULL,
                provider_id INTEGER REFERENCES tpa_providers(id),
                policy_number VARCHAR(50) NOT NULL,
                member_id VARCHAR(50),
                group_id VARCHAR(50),
                policy_start_date DATE,
                policy_end_date DATE,
                sum_insured DECIMAL(12, 2),
                balance_sum_insured DECIMAL(12, 2),
                policyholder_name VARCHAR(100),
                relation_to_patient VARCHAR(20),
                is_verified BOOLEAN DEFAULT false,
                verified_at TIMESTAMP,
                verification_response JSONB,
                is_primary BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log('Creating Index...');
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_patient_insurance_patient ON patient_insurance(patient_id);`);

        console.log('✅ Success!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

run();
