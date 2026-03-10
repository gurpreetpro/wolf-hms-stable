const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../config/db');

async function fixSchema() {
    try {
        console.log('Starting Blood Bank Schema Fix...');

        // 1. Drop Tables (Order: Child -> Parent)
        const tablesToDrop = [
            'transfusion_reactions',
            'blood_transfusions',
            'blood_cross_matches',
            'surgery_blood_prepared',
            'surgery_blood_requirements',
            'blood_requests',
            'blood_units',
            'blood_donors',
            'blood_component_types'
        ];

        for (const table of tablesToDrop) {
            console.log(`Dropping table: ${table}...`);
            await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        }

        // 2. Recreate Tables (Order: Parent -> Child)
        
        console.log('Creating table: blood_component_types...');
        await pool.query(`
            CREATE TABLE blood_component_types (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                code VARCHAR(20) NOT NULL,
                shelf_life_days INTEGER DEFAULT 35,
                storage_temp_min NUMERIC(5,2),
                storage_temp_max NUMERIC(5,2),
                is_active BOOLEAN DEFAULT true,
                hospital_id INTEGER
            )
        `);

        console.log('Creating table: blood_donors...');
        await pool.query(`
            CREATE TABLE blood_donors (
                id SERIAL PRIMARY KEY,
                donor_id VARCHAR(50) UNIQUE,
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(100),
                blood_group VARCHAR(5) NOT NULL,
                rh_factor VARCHAR(10) DEFAULT 'Positive',
                date_of_birth DATE,
                gender VARCHAR(20),
                address TEXT,
                city VARCHAR(100),
                weight NUMERIC(5,2),
                hemoglobin NUMERIC(5,2),
                blood_pressure VARCHAR(20),
                pulse INTEGER,
                last_donation_date DATE,
                total_donations INTEGER DEFAULT 0,
                is_eligible BOOLEAN DEFAULT true,
                is_voluntary BOOLEAN DEFAULT true,
                deferral_reason TEXT,
                deferral_until DATE,
                medical_history JSONB DEFAULT '{}',
                emergency_contact_name VARCHAR(100),
                emergency_contact_phone VARCHAR(20),
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                hospital_id INTEGER
            )
        `);

        console.log('Creating table: blood_units...');
        await pool.query(`
            CREATE TABLE blood_units (
                id SERIAL PRIMARY KEY,
                unit_id VARCHAR(50) UNIQUE,
                bag_number VARCHAR(50),
                donor_id INTEGER REFERENCES blood_donors(id),
                blood_group VARCHAR(5),
                rh_factor VARCHAR(10),
                component_type_id INTEGER REFERENCES blood_component_types(id),
                parent_unit_id INTEGER,
                volume_ml INTEGER,
                collection_date DATE,
                expiry_date DATE,
                collection_type VARCHAR(50) DEFAULT 'Voluntary',
                storage_location VARCHAR(100),
                refrigerator_id VARCHAR(50),
                shelf_number VARCHAR(50),
                current_temperature NUMERIC(5,2),
                temperature_log JSONB DEFAULT '[]',
                status VARCHAR(50) DEFAULT 'Quarantine',
                tested_status VARCHAR(50) DEFAULT 'Pending',
                tti_results JSONB DEFAULT '{}',
                blood_group_confirmed BOOLEAN DEFAULT false,
                special_testing JSONB DEFAULT '{}',
                reserved_for_patient UUID, 
                reserved_until TIMESTAMP,
                issued_to_patient UUID,
                issued_date TIMESTAMP,
                issued_by INTEGER,
                discard_reason TEXT,
                discarded_by INTEGER,
                discarded_at TIMESTAMP,
                notes TEXT,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                donation_date TIMESTAMP,
                hospital_id INTEGER
            )
        `);
        // Note: reserved_for_patient and issued_to_patient are UUIDs referencing patients(id) usually, assuming patients.id is typically integer in this system based on other tables but let's check. 
        // Checking schema_output.txt.. wait, patients table wasn't there. 
        // In check_blood_counts.js, patients wasn't checked. 
        // In other controllers (e.g. Appointment), patient_id is often integer or uuid. 
        // Looking at server/controllers/bloodBankController.js: `const result = await db.pool.query('SELECT * FROM patients WHERE id = $1', [patient_id]);`
        // Let's assume INTEGER for patients(id) for now to be safe with standard Wolf HMS which typically uses Postgres SERIAL for IDs. 
        // Actually, looking at `blood_requests` keys in schema_output.txt would have helped if I had it.
        // Let's use INTEGER for patient_id references to be consistent with new standard.

        // Re-defining blood_units with INTEGER for patient refs if they are FKs, but here they are just columns. 
        // I will set them to INTEGER to match typical SERIAL IDs.

        console.log('Re-creating table: blood_units (correction)...');
        await pool.query(`DROP TABLE IF EXISTS blood_units CASCADE`);
        await pool.query(`
             CREATE TABLE blood_units (
                id SERIAL PRIMARY KEY,
                unit_id VARCHAR(50),
                bag_number VARCHAR(50),
                donor_id INTEGER REFERENCES blood_donors(id),
                blood_group VARCHAR(5),
                rh_factor VARCHAR(10),
                component_type_id INTEGER REFERENCES blood_component_types(id),
                parent_unit_id INTEGER,
                volume_ml INTEGER,
                collection_date DATE,
                expiry_date DATE,
                collection_type VARCHAR(50) DEFAULT 'Voluntary',
                storage_location VARCHAR(100),
                refrigerator_id VARCHAR(50),
                shelf_number VARCHAR(50),
                current_temperature NUMERIC(5,2),
                temperature_log JSONB DEFAULT '[]',
                status VARCHAR(50) DEFAULT 'Quarantine',
                tested_status VARCHAR(50) DEFAULT 'Pending',
                tti_results JSONB DEFAULT '{}',
                blood_group_confirmed BOOLEAN DEFAULT false,
                special_testing JSONB DEFAULT '{}',
                reserved_for_patient INTEGER,
                reserved_until TIMESTAMP,
                issued_to_patient INTEGER,
                issued_date TIMESTAMP,
                issued_by INTEGER,
                discard_reason TEXT,
                discarded_by INTEGER,
                discarded_at TIMESTAMP,
                notes TEXT,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                donation_date TIMESTAMP,
                hospital_id INTEGER
            )
        `);


        console.log('Creating table: blood_requests...');
        await pool.query(`
            CREATE TABLE blood_requests (
                id SERIAL PRIMARY KEY,
                request_id VARCHAR(50),
                patient_id INTEGER NOT NULL,
                patient_blood_group VARCHAR(5),
                requested_by INTEGER,
                department VARCHAR(100),
                ward_id INTEGER,
                bed_number VARCHAR(20),
                admission_id INTEGER,
                surgery_id INTEGER,
                blood_group_required VARCHAR(5) NOT NULL,
                component_type_id INTEGER REFERENCES blood_component_types(id),
                units_required INTEGER DEFAULT 1,
                units_issued INTEGER DEFAULT 0,
                priority VARCHAR(20) DEFAULT 'Normal',
                indication TEXT,
                diagnosis TEXT,
                hemoglobin_level NUMERIC(5,2),
                platelet_count INTEGER,
                inr_value NUMERIC(5,2),
                previous_transfusion BOOLEAN DEFAULT false,
                previous_reaction BOOLEAN DEFAULT false,
                reaction_history TEXT,
                cross_match_required BOOLEAN DEFAULT true,
                expected_date TIMESTAMP,
                urgency_notes TEXT,
                status VARCHAR(50) DEFAULT 'Pending',
                rejection_reason TEXT,
                approved_by INTEGER,
                approved_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                hospital_id INTEGER
            )
        `);

        console.log('Creating table: surgery_blood_requirements...');
        await pool.query(`
            CREATE TABLE surgery_blood_requirements (
                id SERIAL PRIMARY KEY,
                surgery_id INTEGER,
                patient_id INTEGER,
                blood_request_id INTEGER REFERENCES blood_requests(id),
                blood_group_required VARCHAR(5),
                estimated_blood_loss_ml INTEGER,
                prbc_units_required INTEGER DEFAULT 0,
                ffp_units_required INTEGER DEFAULT 0,
                platelet_units_required INTEGER DEFAULT 0,
                cryo_units_required INTEGER DEFAULT 0,
                notes TEXT,
                blood_typed_and_screened BOOLEAN DEFAULT false,
                cross_match_completed BOOLEAN DEFAULT false,
                blood_reserved BOOLEAN DEFAULT false,
                consent_signed BOOLEAN DEFAULT false,
                checked_by INTEGER,
                checked_at TIMESTAMP,
                status VARCHAR(50) DEFAULT 'Pending',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                hospital_id INTEGER
            )
        `);

        console.log('Creating table: surgery_blood_prepared...');
        await pool.query(`
            CREATE TABLE surgery_blood_prepared (
                id SERIAL PRIMARY KEY,
                surgery_blood_req_id INTEGER REFERENCES surgery_blood_requirements(id),
                unit_id INTEGER REFERENCES blood_units(id),
                cross_match_id INTEGER,
                component_type VARCHAR(20),
                prepared_by INTEGER,
                prepared_at TIMESTAMP DEFAULT NOW(),
                hospital_id INTEGER
            )
        `);

        console.log('Creating table: blood_cross_matches...');
        await pool.query(`
            CREATE TABLE blood_cross_matches (
                id SERIAL PRIMARY KEY,
                request_id INTEGER REFERENCES blood_requests(id),
                unit_id INTEGER REFERENCES blood_units(id),
                patient_id INTEGER,
                patient_sample_id VARCHAR(50),
                performed_by INTEGER,
                performed_at TIMESTAMP DEFAULT NOW(),
                method VARCHAR(50),
                immediate_spin VARCHAR(20),
                incubation_37c VARCHAR(20),
                ags_phase VARCHAR(20),
                result VARCHAR(50),
                antibody_detected BOOLEAN,
                reaction_strength VARCHAR(20),
                ai_compatibility_score INTEGER,
                interpretation TEXT,
                valid_until TIMESTAMP,
                hospital_id INTEGER
            )
        `);

        console.log('Creating table: blood_transfusions...');
        await pool.query(`
            CREATE TABLE blood_transfusions (
                id SERIAL PRIMARY KEY,
                transfusion_id VARCHAR(50),
                unit_id INTEGER REFERENCES blood_units(id),
                request_id INTEGER REFERENCES blood_requests(id),
                cross_match_id INTEGER REFERENCES blood_cross_matches(id),
                patient_id INTEGER,
                administered_by INTEGER,
                ward_id INTEGER,
                bed_number VARCHAR(20),
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                vitals_baseline JSONB DEFAULT '{}',
                vitals_15min JSONB DEFAULT '{}',
                vitals_30min JSONB DEFAULT '{}',
                vitals_1hour JSONB DEFAULT '{}',
                vitals_end JSONB DEFAULT '{}',
                rate_ml_per_hour INTEGER,
                volume_transfused INTEGER,
                reaction_occurred BOOLEAN DEFAULT false,
                reaction_time TIMESTAMP,
                reaction_type VARCHAR(100),
                reaction_severity VARCHAR(50),
                transfusion_stopped BOOLEAN DEFAULT false,
                outcome VARCHAR(50),
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                hospital_id INTEGER
            )
        `);

        console.log('Creating table: transfusion_reactions...');
        await pool.query(`
            CREATE TABLE transfusion_reactions (
                id SERIAL PRIMARY KEY,
                transfusion_id INTEGER REFERENCES blood_transfusions(id),
                unit_id INTEGER REFERENCES blood_units(id),
                patient_id INTEGER,
                reported_by INTEGER,
                reaction_type VARCHAR(100),
                severity VARCHAR(50),
                onset_time TIMESTAMP,
                symptoms JSONB DEFAULT '[]',
                vital_signs JSONB DEFAULT '{}',
                management_given TEXT,
                blood_bank_notified BOOLEAN DEFAULT false,
                investigation_results TEXT,
                conclusion TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                hospital_id INTEGER
            )
        `);

        // 3. Seed Data
        console.log('Seeding blood_component_types...');
        const components = [
            { name: 'Whole Blood', code: 'WB', shelf_life: 35, temp_min: 2, temp_max: 6 },
            { name: 'Packed Red Blood Cells', code: 'PRBC', shelf_life: 42, temp_min: 2, temp_max: 6 },
            { name: 'Fresh Frozen Plasma', code: 'FFP', shelf_life: 365, temp_min: -30, temp_max: -18 },
            { name: 'Platelet Concentrate', code: 'RDP', shelf_life: 5, temp_min: 20, temp_max: 24 },
            { name: 'Cryoprecipitate', code: 'CRYO', shelf_life: 365, temp_min: -30, temp_max: -18 },
            { name: 'Single Donor Platelet', code: 'SDP', shelf_life: 5, temp_min: 20, temp_max: 24 }
        ];

        for (const comp of components) {
            await pool.query(`
                INSERT INTO blood_component_types (name, code, shelf_life_days, storage_temp_min, storage_temp_max, hospital_id)
                VALUES ($1, $2, $3, $4, $5, 1)
            `, [comp.name, comp.code, comp.shelf_life, comp.temp_min, comp.temp_max]);
        }

        console.log('✅ Blood Bank Schema Fixed and Seeded successfully!');

    } catch (err) {
        console.error('❌ Error fixing schema:', err);
    } finally {
        pool.end();
    }
}

fixSchema();
