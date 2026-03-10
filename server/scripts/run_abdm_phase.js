/**
 * WOLF HMS - ABDM/ABHA Phase Migration
 * Run: node server/run_abdm_phase.js
 */

const pool = require('./config/db');

const runABDMPhase = async () => {
    console.log('🏥 WOLF HMS ABDM/ABHA Phase Migration Starting...\n');

    try {
        // ABHA LINKED PATIENTS
        console.log('📱 Creating ABHA Tables...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS abha_linked_patients (
                id SERIAL PRIMARY KEY,
                patient_id UUID UNIQUE,
                abha_number VARCHAR(17) NOT NULL,
                abha_address VARCHAR(100),
                health_id VARCHAR(100),
                name VARCHAR(200),
                gender VARCHAR(10),
                date_of_birth DATE,
                mobile VARCHAR(15),
                email VARCHAR(100),
                address TEXT,
                photo_url TEXT,
                kyc_verified BOOLEAN DEFAULT false,
                kyc_method VARCHAR(50),
                linked_at TIMESTAMP DEFAULT NOW(),
                last_verified TIMESTAMP,
                verification_token TEXT,
                status VARCHAR(20) DEFAULT 'active',
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✓ abha_linked_patients');

        // CONSENT REQUESTS
        await pool.query(`
            CREATE TABLE IF NOT EXISTS consent_requests (
                id SERIAL PRIMARY KEY,
                consent_id VARCHAR(100) UNIQUE,
                patient_id UUID,
                abha_number VARCHAR(17),
                requester_name VARCHAR(200),
                requester_id VARCHAR(100),
                purpose VARCHAR(100) NOT NULL,
                purpose_code VARCHAR(50),
                hi_types TEXT[],
                permission_from DATE,
                permission_to DATE,
                data_erase_at TIMESTAMP,
                status VARCHAR(30) DEFAULT 'pending',
                granted_at TIMESTAMP,
                revoked_at TIMESTAMP,
                expiry_at TIMESTAMP,
                hip_id VARCHAR(100),
                hip_name VARCHAR(200),
                callback_url TEXT,
                consent_artefact JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✓ consent_requests');

        // HEALTH RECORDS (FHIR)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS health_records_fhir (
                id SERIAL PRIMARY KEY,
                patient_id UUID,
                abha_number VARCHAR(17),
                record_type VARCHAR(50) NOT NULL,
                fhir_resource_type VARCHAR(50) NOT NULL,
                fhir_bundle JSONB NOT NULL,
                source_system VARCHAR(100) DEFAULT 'WOLF_HMS',
                care_context_reference VARCHAR(100),
                care_context_display VARCHAR(200),
                encounter_id INTEGER,
                admission_id INTEGER,
                visit_id INTEGER,
                created_by INTEGER,
                shared_via_hiu BOOLEAN DEFAULT false,
                shared_at TIMESTAMP,
                status VARCHAR(30) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✓ health_records_fhir');

        // CARE CONTEXTS
        await pool.query(`
            CREATE TABLE IF NOT EXISTS care_contexts (
                id SERIAL PRIMARY KEY,
                patient_id UUID,
                abha_number VARCHAR(17),
                care_context_reference VARCHAR(100) UNIQUE,
                care_context_display VARCHAR(200),
                context_type VARCHAR(50),
                admission_id INTEGER,
                visit_id INTEGER,
                department VARCHAR(100),
                doctor_name VARCHAR(200),
                start_date DATE,
                end_date DATE,
                linked_to_abha BOOLEAN DEFAULT false,
                linked_at TIMESTAMP,
                status VARCHAR(30) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✓ care_contexts');

        // ABDM TRANSACTIONS LOG
        await pool.query(`
            CREATE TABLE IF NOT EXISTS abdm_transactions (
                id SERIAL PRIMARY KEY,
                transaction_id VARCHAR(100),
                request_id VARCHAR(100),
                transaction_type VARCHAR(50),
                direction VARCHAR(10),
                endpoint VARCHAR(255),
                request_body JSONB,
                response_body JSONB,
                status_code INTEGER,
                status VARCHAR(30),
                error_message TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✓ abdm_transactions');

        // INDEXES
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_abha_patient ON abha_linked_patients(patient_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_abha_number ON abha_linked_patients(abha_number)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_consent_patient ON consent_requests(patient_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_consent_status ON consent_requests(status)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_fhir_patient ON health_records_fhir(patient_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_fhir_type ON health_records_fhir(record_type)`);
        console.log('  ✓ Indexes created');

        // SEED SAMPLE HI TYPES
        console.log('\n📋 ABDM Health Information Types Reference:');
        console.log('  - Prescription');
        console.log('  - DiagnosticReport');
        console.log('  - OPConsultation');
        console.log('  - DischargeSummary');
        console.log('  - ImmunizationRecord');
        console.log('  - HealthDocumentRecord');
        console.log('  - WellnessRecord');

        console.log('\n✅ ABDM Phase Migration Complete!');
        console.log('\n📋 Summary:');
        console.log('  - ABHA linking table created');
        console.log('  - Consent requests table created');
        console.log('  - FHIR health records table created');
        console.log('  - Care contexts table created');
        console.log('  - Transaction log table created');

        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
};

runABDMPhase();
