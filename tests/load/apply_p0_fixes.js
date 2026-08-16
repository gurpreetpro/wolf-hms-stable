const { pool } = require('../../server/db');

const fixSql = `
-- Fix surgeries table types
ALTER TABLE surgeries ALTER COLUMN patient_id TYPE UUID USING patient_id::text::uuid;
ALTER TABLE surgeries ALTER COLUMN doctor_id TYPE INTEGER USING doctor_id::integer;

-- Fix surgery_blood_requirements table type
ALTER TABLE surgery_blood_requirements ALTER COLUMN patient_id TYPE UUID USING patient_id::text::uuid;

-- Create care_contexts table for ABDM M2
CREATE TABLE IF NOT EXISTS care_contexts (
    id SERIAL PRIMARY KEY,
    care_context_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    abha_number VARCHAR(20),
    reference_type VARCHAR(30) NOT NULL,
    reference_id INTEGER NOT NULL,
    display_text VARCHAR(255) NOT NULL,
    fhir_bundle_json JSONB,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    hospital_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

pool.query(fixSql)
    .then(() => {
        console.log('✅ P0 Schema Fixes applied:');
        console.log('   • surgeries.patient_id → UUID');
        console.log('   • surgeries.doctor_id → INTEGER');
        console.log('   • surgery_blood_requirements.patient_id → UUID');
        console.log('   • care_contexts table created (ABDM M2)');
        process.exit(0);
    })
    .catch(e => {
        console.error('❌ Migration failed:', e.message);
        process.exit(1);
    });
