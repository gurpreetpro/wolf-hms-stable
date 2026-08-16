const { pool } = require('../../server/db');

const schema = `
CREATE TABLE IF NOT EXISTS patient_abha_mapping (
    id SERIAL PRIMARY KEY,
    patient_id UUID,
    uhid VARCHAR(50),
    abha_number VARCHAR(20) NOT NULL,
    verification_type VARCHAR(30) NOT NULL,
    abdm_profile_json JSONB,
    linked_at TIMESTAMPTZ DEFAULT NOW(),
    hospital_id INTEGER NOT NULL,
    UNIQUE (abha_number, hospital_id)
);

CREATE TABLE IF NOT EXISTS consent_artifacts (
    id SERIAL PRIMARY KEY,
    consent_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    patient_id UUID,
    abha_number VARCHAR(20) NOT NULL,
    purpose_code VARCHAR(30) NOT NULL,
    hi_types JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'GRANTED',
    consent_expiry TIMESTAMPTZ NOT NULL,
    hospital_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS abdm_audit_log (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    patient_id UUID,
    abha_number VARCHAR(20),
    actor_id INTEGER,
    details_json JSONB,
    hospital_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abha_mapping_patient ON patient_abha_mapping(patient_id);
CREATE INDEX IF NOT EXISTS idx_abha_mapping_abha ON patient_abha_mapping(abha_number);
CREATE INDEX IF NOT EXISTS idx_consent_patient ON consent_artifacts(patient_id);
CREATE INDEX IF NOT EXISTS idx_consent_abha ON consent_artifacts(abha_number);
CREATE INDEX IF NOT EXISTS idx_consent_status ON consent_artifacts(status);
CREATE INDEX IF NOT EXISTS idx_abdm_audit_patient ON abdm_audit_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_abdm_audit_event ON abdm_audit_log(event_type);
`;

pool.query(schema)
    .then(() => {
        console.log('✅ ABDM Consent schemas applied:');
        console.log('   • patient_abha_mapping');
        console.log('   • consent_artifacts');
        console.log('   • abdm_audit_log');
        console.log('   • 7 indexes created');
        process.exit(0);
    })
    .catch(e => {
        console.error('❌ Schema failed:', e.message);
        process.exit(1);
    });
