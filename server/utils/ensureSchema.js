/**
 * Schema Migrations — runs on server startup
 * Safely adds missing columns using IF NOT EXISTS (no-op if already present)
 */
const { pool } = require('../db');

async function ensureSchema() {
    const tag = '[Schema]';
    console.log(`${tag} Running startup migrations...`);
    
    const migrations = [
        // hospitals table
        `ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS logo_url TEXT`,
        `ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#0d6efd'`,
        `ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(20) DEFAULT '#6c757d'`,
        `ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS tagline TEXT`,
        `ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS app_display_name TEXT`,

        // users table (doctor fields)
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS specialization TEXT`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS qualification TEXT`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_years INTEGER`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS consultation_fee DECIMAL(10,2)`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS available_days TEXT`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT`,

        // payments
        `DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
                EXECUTE 'ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()';
                
                -- Check if patient_id is not uuid, then change it (ignoring existing data if it's test data)
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'patient_id' AND data_type != 'uuid') THEN
                    EXECUTE 'ALTER TABLE payments ALTER COLUMN patient_id TYPE UUID USING NULL';
                END IF;
            END IF;
        END $$;`,

        // patients table
        `ALTER TABLE patients ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
        `ALTER TABLE patients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,

        // admissions table
        `CREATE TABLE IF NOT EXISTS admissions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            patient_id UUID
        )`,
        `ALTER TABLE admissions ADD COLUMN IF NOT EXISTS hospital_id INTEGER`,
        `ALTER TABLE admissions ADD COLUMN IF NOT EXISTS bed_number VARCHAR(50)`,
        `ALTER TABLE admissions ADD COLUMN IF NOT EXISTS treating_doctor_id INTEGER`,
        `ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admission_date TIMESTAMP DEFAULT NOW()`,
        `ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_date TIMESTAMP`,
        `ALTER TABLE admissions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Admitted'`,
        `ALTER TABLE admissions ADD COLUMN IF NOT EXISTS diagnosis TEXT`,
        `ALTER TABLE admissions ADD COLUMN IF NOT EXISTS notes TEXT`,
        `ALTER TABLE admissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
        `ALTER TABLE admissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,
        
        // wards table
        `CREATE TABLE IF NOT EXISTS wards (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100),
            hospital_id INTEGER
        )`,
        
        // beds table
        `CREATE TABLE IF NOT EXISTS beds (
            id SERIAL PRIMARY KEY,
            bed_number VARCHAR(50),
            ward_id INTEGER,
            bed_type VARCHAR(50),
            daily_rate DECIMAL(10,2),
            status VARCHAR(20) DEFAULT 'Available'
        )`,
        
        // vitals_logs
        `CREATE TABLE IF NOT EXISTS vitals_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            patient_id UUID,
            recorded_at TIMESTAMP DEFAULT NOW(),
            temperature DECIMAL(4,1),
            pulse INTEGER,
            bp_systolic INTEGER,
            bp_diastolic INTEGER,
            respiratory_rate INTEGER,
            spo2 INTEGER,
            blood_sugar DECIMAL(5,1),
            weight DECIMAL(5,1),
            notes TEXT
        )`,
        
        // care_tasks
        `CREATE TABLE IF NOT EXISTS care_tasks (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            admission_id UUID,
            patient_id UUID,
            task_type VARCHAR(50),
            description TEXT,
            scheduled_time TIMESTAMP,
            status VARCHAR(20) DEFAULT 'Pending',
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )`,
        
        // care_plans
        `CREATE TABLE IF NOT EXISTS care_plans (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            admission_id UUID,
            patient_id UUID,
            dietary_restrictions TEXT,
            allergy_notes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )`,
        
        // pending_charges
        `CREATE TABLE IF NOT EXISTS pending_charges (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            admission_id UUID,
            charge_type VARCHAR(50),
            description TEXT,
            amount DECIMAL(10,2),
            quantity INTEGER DEFAULT 1,
            total_amount DECIMAL(10,2),
            status VARCHAR(20) DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT NOW()
        )`,

        // delta_check_rules
        `CREATE TABLE IF NOT EXISTS delta_check_rules (
            id SERIAL PRIMARY KEY,
            test_type_id INTEGER NOT NULL REFERENCES lab_test_types(id) ON DELETE CASCADE,
            parameter_name VARCHAR(100) NOT NULL,
            max_percent_change DECIMAL(5, 2) NOT NULL,
            max_absolute_change DECIMAL(10, 4) NOT NULL,
            time_window_hours INTEGER DEFAULT 72,
            is_active BOOLEAN DEFAULT TRUE,
            hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(test_type_id, parameter_name, hospital_id)
        )`,

        // lab_qc_violations
        `CREATE TABLE IF NOT EXISTS lab_qc_violations (
            id SERIAL PRIMARY KEY,
            result_id INTEGER NOT NULL REFERENCES lab_qc_results(id) ON DELETE CASCADE,
            material_id INTEGER NOT NULL REFERENCES lab_qc_materials(id) ON DELETE CASCADE,
            rule_violated VARCHAR(50) NOT NULL,
            type VARCHAR(20) NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            acknowledged BOOLEAN DEFAULT FALSE,
            acknowledged_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            acknowledged_at TIMESTAMP,
            notes TEXT,
            hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE
        )`,

        // instrument_calibrations
        `CREATE TABLE IF NOT EXISTS instrument_calibrations (
            id SERIAL PRIMARY KEY,
            instrument_id INTEGER NOT NULL REFERENCES lab_instruments(id) ON DELETE CASCADE,
            performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            performed_at TIMESTAMP DEFAULT NOW(),
            status VARCHAR(50) NOT NULL,
            parameters_log JSONB,
            next_due DATE NOT NULL,
            notes TEXT,
            hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE
        )`,
    ];

    // Conditional migrations (table may or may not exist)
    const conditionalMigrations = [
        {
            check: `SELECT 1 FROM information_schema.tables WHERE table_name = 'opd_visits'`,
            sqls: [
                `ALTER TABLE opd_visits ADD COLUMN IF NOT EXISTS notes TEXT`,
                `ALTER TABLE opd_visits ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'scheduled'`,
            ]
        },
        {
            check: `SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments'`,
            sqls: [
                `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes TEXT`,
                `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'scheduled'`,
                `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_type VARCHAR(20) DEFAULT 'in-person'`,
            ]
        },
        {
            check: `SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_qc_materials'`,
            sqls: [
                `ALTER TABLE lab_qc_materials ADD COLUMN IF NOT EXISTS target_value DECIMAL(10, 2)`,
                `ALTER TABLE lab_qc_materials ADD COLUMN IF NOT EXISTS sd_value DECIMAL(10, 2)`,
            ]
        },
        {
            check: `SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_qc_results'`,
            sqls: [
                `ALTER TABLE lab_qc_results ADD COLUMN IF NOT EXISTS qc_material_id INTEGER REFERENCES lab_qc_materials(id)`,
                `ALTER TABLE lab_qc_results ADD COLUMN IF NOT EXISTS value DECIMAL(10, 2)`,
                `ALTER TABLE lab_qc_results ADD COLUMN IF NOT EXISTS westgard_rule VARCHAR(50)`,
                `ALTER TABLE lab_qc_results ADD COLUMN IF NOT EXISTS deviation_sd DECIMAL(10, 4)`,
            ]
        },
        {
            check: `SELECT 1 FROM information_schema.tables WHERE table_name = 'reagent_usage_log'`,
            sqls: [
                `ALTER TABLE reagent_usage_log ADD COLUMN IF NOT EXISTS notes TEXT`,
                `ALTER TABLE reagent_usage_log ADD COLUMN IF NOT EXISTS lab_request_id INTEGER REFERENCES lab_requests(id)`,
            ]
        },
        {
            check: `SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_instruments'`,
            sqls: [
                `ALTER TABLE lab_instruments ADD COLUMN IF NOT EXISTS hospital_id INTEGER REFERENCES hospitals(id) ON DELETE SET NULL`,
            ]
        },
        {
            check: `SELECT 1 FROM information_schema.tables WHERE table_name = 'instrument_logs'`,
            sqls: [
                `ALTER TABLE instrument_logs ADD COLUMN IF NOT EXISTS hospital_id INTEGER REFERENCES hospitals(id) ON DELETE SET NULL`,
            ]
        },
        // HORIZON 1: ICU & MATERNITY CORE SCHEMAS
        {
            check: `SELECT 1 FROM information_schema.tables WHERE table_name = 'icu_ventilator_logs'`,
            sqls: []
        }
    ];

    const horizon1TableMigrations = [
        `CREATE TABLE IF NOT EXISTS icu_ventilator_logs (
            id SERIAL PRIMARY KEY,
            admission_id INTEGER NOT NULL,
            ventilator_mode VARCHAR(50),
            peep DOUBLE PRECISION,
            fio2 DOUBLE PRECISION,
            respiratory_rate INTEGER,
            tidal_volume DOUBLE PRECISION,
            peak_pressure DOUBLE PRECISION,
            plateau_pressure DOUBLE PRECISION,
            sp02 DOUBLE PRECISION,
            ie_ratio VARCHAR(20),
            recorded_by INTEGER,
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_icu_vent_admission ON icu_ventilator_logs(admission_id)`,
        `CREATE INDEX IF NOT EXISTS idx_icu_vent_hospital ON icu_ventilator_logs(hospital_id)`,

        `CREATE TABLE IF NOT EXISTS icu_fluid_io_charting (
            id SERIAL PRIMARY KEY,
            admission_id INTEGER NOT NULL,
            chart_time TIMESTAMP NOT NULL,
            iv_fluids_ml DOUBLE PRECISION DEFAULT 0.0,
            blood_products_ml DOUBLE PRECISION DEFAULT 0.0,
            oral_intake_ml DOUBLE PRECISION DEFAULT 0.0,
            enteral_feeding_ml DOUBLE PRECISION DEFAULT 0.0,
            total_intake_ml DOUBLE PRECISION DEFAULT 0.0,
            urine_output_ml DOUBLE PRECISION DEFAULT 0.0,
            drain_output_ml DOUBLE PRECISION DEFAULT 0.0,
            stool_output_ml DOUBLE PRECISION DEFAULT 0.0,
            emesis_ml DOUBLE PRECISION DEFAULT 0.0,
            total_output_ml DOUBLE PRECISION DEFAULT 0.0,
            hourly_balance_ml DOUBLE PRECISION DEFAULT 0.0,
            cumulative_balance_ml DOUBLE PRECISION DEFAULT 0.0,
            notes TEXT,
            recorded_by INTEGER,
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_icu_io_admission ON icu_fluid_io_charting(admission_id)`,
        `CREATE INDEX IF NOT EXISTS idx_icu_io_hospital ON icu_fluid_io_charting(hospital_id)`,
        `CREATE INDEX IF NOT EXISTS idx_icu_io_chart_time ON icu_fluid_io_charting(chart_time)`,

        `CREATE TABLE IF NOT EXISTS maternity_antenatal_profiles (
            id SERIAL PRIMARY KEY,
            patient_id UUID NOT NULL,
            gravidity INTEGER DEFAULT 1,
            parity INTEGER DEFAULT 0,
            abortions INTEGER DEFAULT 0,
            living_children INTEGER DEFAULT 0,
            lmp DATE,
            edd DATE,
            gestational_age_weeks DOUBLE PRECISION,
            risk_category VARCHAR(50) DEFAULT 'LOW_RISK',
            blood_group VARCHAR(10),
            rh_factor VARCHAR(10),
            special_notes TEXT,
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_maternity_antenatal_patient ON maternity_antenatal_profiles(patient_id)`,
        `CREATE INDEX IF NOT EXISTS idx_maternity_antenatal_hospital ON maternity_antenatal_profiles(hospital_id)`,

        `CREATE TABLE IF NOT EXISTS maternity_labor_partographs (
            id SERIAL PRIMARY KEY,
            antenatal_profile_id INTEGER,
            admission_id INTEGER,
            patient_id UUID NOT NULL,
            recorded_at TIMESTAMP DEFAULT NOW(),
            cervical_dilation_cm DOUBLE PRECISION NOT NULL,
            fetal_heart_rate_bpm INTEGER NOT NULL,
            fhr_pattern VARCHAR(50),
            contractions_per_10min INTEGER NOT NULL,
            contraction_duration_sec INTEGER NOT NULL,
            amniotic_fluid_status VARCHAR(50),
            maternal_bp_systolic INTEGER,
            maternal_bp_diastolic INTEGER,
            maternal_pulse_bpm INTEGER,
            oxytocin_units_min DOUBLE PRECISION DEFAULT 0.0,
            alert_zone_triggered BOOLEAN DEFAULT FALSE,
            action_zone_triggered BOOLEAN DEFAULT FALSE,
            recorded_by INTEGER,
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_maternity_parto_patient ON maternity_labor_partographs(patient_id)`,
        `CREATE INDEX IF NOT EXISTS idx_maternity_parto_profile ON maternity_labor_partographs(antenatal_profile_id)`,
        `CREATE INDEX IF NOT EXISTS idx_maternity_parto_hospital ON maternity_labor_partographs(hospital_id)`,

        `CREATE TABLE IF NOT EXISTS maternity_delivery_registry (
            id SERIAL PRIMARY KEY,
            patient_id UUID NOT NULL,
            admission_id INTEGER,
            antenatal_profile_id INTEGER,
            delivery_timestamp TIMESTAMP NOT NULL,
            delivery_type VARCHAR(50) NOT NULL,
            indication_for_lscs TEXT,
            obstetrician_id INTEGER,
            pediatrician_id INTEGER,
            newborn_gender VARCHAR(20) NOT NULL,
            newborn_weight_kg DOUBLE PRECISION NOT NULL,
            apgar_1min INTEGER NOT NULL,
            apgar_5min INTEGER NOT NULL,
            apgar_10min INTEGER,
            birth_certificate_number VARCHAR(100) UNIQUE,
            complications TEXT,
            blood_loss_ml DOUBLE PRECISION,
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_maternity_delivery_patient ON maternity_delivery_registry(patient_id)`,
        `CREATE INDEX IF NOT EXISTS idx_maternity_delivery_hospital ON maternity_delivery_registry(hospital_id)`
    ];

    const horizon2TableMigrations = [
        // DENTAL MODULE
        `CREATE TABLE IF NOT EXISTS dental_visits (
            id SERIAL PRIMARY KEY,
            patient_id UUID NOT NULL,
            admission_id INTEGER,
            visit_date TIMESTAMP DEFAULT NOW(),
            chief_complaint TEXT,
            diagnosis TEXT,
            treatment_plan TEXT,
            notes TEXT,
            odontogram JSONB DEFAULT '{}',
            tooth_chart_url TEXT,
            doctor_id INTEGER,
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_dental_visits_patient ON dental_visits(patient_id)`,
        `CREATE INDEX IF NOT EXISTS idx_dental_visits_hospital ON dental_visits(hospital_id)`,

        `CREATE TABLE IF NOT EXISTS dental_procedures (
            id SERIAL PRIMARY KEY,
            visit_id INTEGER,
            patient_id UUID NOT NULL,
            procedure_name VARCHAR(255) NOT NULL,
            tooth_number VARCHAR(50),
            quadrant VARCHAR(20),
            surface VARCHAR(50),
            procedure_code VARCHAR(50),
            fee DECIMAL(10, 2),
            discount DECIMAL(10, 2) DEFAULT 0,
            net_amount DECIMAL(10, 2),
            status VARCHAR(50) DEFAULT 'Completed',
            performed_by INTEGER,
            performed_at TIMESTAMP,
            notes TEXT,
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_dental_procedures_visit ON dental_procedures(visit_id)`,
        `CREATE INDEX IF NOT EXISTS idx_dental_procedures_patient ON dental_procedures(patient_id)`,
        `CREATE INDEX IF NOT EXISTS idx_dental_procedures_hospital ON dental_procedures(hospital_id)`,

        `CREATE TABLE IF NOT EXISTS dental_inventory (
            id SERIAL PRIMARY KEY,
            item_name VARCHAR(255) NOT NULL,
            category VARCHAR(100),
            brand VARCHAR(255),
            batch_number VARCHAR(50),
            expiry_date DATE,
            stock_quantity INTEGER DEFAULT 0,
            reorder_level INTEGER DEFAULT 5,
            unit_price DECIMAL(10, 2),
            supplier_name VARCHAR(255),
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_dental_inventory_hospital ON dental_inventory(hospital_id)`,
        `CREATE INDEX IF NOT EXISTS idx_dental_inventory_category ON dental_inventory(category)`,

        `CREATE TABLE IF NOT EXISTS dental_lab_orders (
            id SERIAL PRIMARY KEY,
            patient_id UUID NOT NULL,
            visit_id INTEGER,
            lab_type VARCHAR(100) NOT NULL,
            tooth_number VARCHAR(50),
            shade VARCHAR(20),
            material VARCHAR(100),
            instructions TEXT,
            due_date DATE,
            status VARCHAR(50) DEFAULT 'Pending',
            completed_at TIMESTAMP,
            cost DECIMAL(10, 2),
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_dental_lab_orders_patient ON dental_lab_orders(patient_id)`,
        `CREATE INDEX IF NOT EXISTS idx_dental_lab_orders_hospital ON dental_lab_orders(hospital_id)`,

        // OPHTHALMOLOGY MODULE
        `CREATE TABLE IF NOT EXISTS ophthalmology_visits (
            id SERIAL PRIMARY KEY,
            patient_id UUID NOT NULL,
            admission_id INTEGER,
            visit_date TIMESTAMP DEFAULT NOW(),
            chief_complaint TEXT,
            vision_od_unaided VARCHAR(20),
            vision_os_unaided VARCHAR(20),
            vision_od_best VARCHAR(20),
            vision_os_best VARCHAR(20),
            iop_od DECIMAL(5, 1),
            iop_os DECIMAL(5, 1),
            refraction_sphere_od DECIMAL(5, 2),
            refraction_sphere_os DECIMAL(5, 2),
            refraction_cylinder_od DECIMAL(5, 2),
            refraction_cylinder_os DECIMAL(5, 2),
            refraction_axis_od INTEGER,
            refraction_axis_os INTEGER,
            diagnosis TEXT,
            treatment_plan TEXT,
            doctor_id INTEGER,
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_ophth_visits_patient ON ophthalmology_visits(patient_id)`,
        `CREATE INDEX IF NOT EXISTS idx_ophth_visits_hospital ON ophthalmology_visits(hospital_id)`,

        `CREATE TABLE IF NOT EXISTS ophthalmology_procedures (
            id SERIAL PRIMARY KEY,
            visit_id INTEGER,
            patient_id UUID NOT NULL,
            procedure_name VARCHAR(255) NOT NULL,
            eye VARCHAR(10) NOT NULL,
            procedure_code VARCHAR(50),
            surgeon_id INTEGER,
            surgery_date TIMESTAMP,
            iol_implanted BOOLEAN DEFAULT FALSE,
            iol_power DECIMAL(5, 2),
            iol_model VARCHAR(255),
            fee DECIMAL(10, 2),
            discount DECIMAL(10, 2) DEFAULT 0,
            net_amount DECIMAL(10, 2),
            status VARCHAR(50) DEFAULT 'Completed',
            complications TEXT,
            notes TEXT,
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_ophth_procedures_visit ON ophthalmology_procedures(visit_id)`,
        `CREATE INDEX IF NOT EXISTS idx_ophth_procedures_patient ON ophthalmology_procedures(patient_id)`,
        `CREATE INDEX IF NOT EXISTS idx_ophth_procedures_hospital ON ophthalmology_procedures(hospital_id)`,

        `CREATE TABLE IF NOT EXISTS ophthalmology_biometry (
            id SERIAL PRIMARY KEY,
            patient_id UUID NOT NULL,
            visit_id INTEGER,
            eye VARCHAR(10) NOT NULL,
            axial_length_mm DECIMAL(5, 2),
            k1_d DECIMAL(6, 2),
            k2_d DECIMAL(6, 2),
            acd_mm DECIMAL(5, 2),
            lens_thickness_mm DECIMAL(5, 2),
            wtw_mm DECIMAL(5, 2),
            iol_formula VARCHAR(50),
            target_refraction DECIMAL(5, 2),
            iol_power_se DECIMAL(5, 2),
            iol_power_te DECIMAL(5, 2),
            iol_power_ae DECIMAL(5, 2),
            measured_by INTEGER,
            measured_at TIMESTAMP,
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_ophth_biometry_patient ON ophthalmology_biometry(patient_id)`,
        `CREATE INDEX IF NOT EXISTS idx_ophth_biometry_hospital ON ophthalmology_biometry(hospital_id)`,

        `CREATE TABLE IF NOT EXISTS ophthalmology_inventory (
            id SERIAL PRIMARY KEY,
            item_name VARCHAR(255) NOT NULL,
            category VARCHAR(100),
            brand VARCHAR(255),
            model VARCHAR(255),
            diopter_range VARCHAR(50),
            batch_number VARCHAR(50),
            expiry_date DATE,
            stock_quantity INTEGER DEFAULT 0,
            reorder_level INTEGER DEFAULT 5,
            unit_price DECIMAL(10, 2),
            supplier_name VARCHAR(255),
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_ophth_inventory_hospital ON ophthalmology_inventory(hospital_id)`,
        `CREATE INDEX IF NOT EXISTS idx_ophth_inventory_category ON ophthalmology_inventory(category)`,

        // ORTHOPEDIC MODULE
        `CREATE TABLE IF NOT EXISTS orthopedic_visits (
            id SERIAL PRIMARY KEY,
            patient_id UUID NOT NULL,
            admission_id INTEGER,
            visit_date TIMESTAMP DEFAULT NOW(),
            chief_complaint TEXT,
            injury_mechanism TEXT,
            affected_joint VARCHAR(100),
            affected_side VARCHAR(20),
            pain_score_nrs INTEGER,
            swelling_present BOOLEAN DEFAULT FALSE,
            deformity_present BOOLEAN DEFAULT FALSE,
            range_of_motion_json JSONB DEFAULT '{}',
            xray_findings TEXT,
            mri_findings TEXT,
            diagnosis TEXT,
            treatment_plan TEXT,
            doctor_id INTEGER,
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_ortho_visits_patient ON orthopedic_visits(patient_id)`,
        `CREATE INDEX IF NOT EXISTS idx_ortho_visits_hospital ON orthopedic_visits(hospital_id)`,

        `CREATE TABLE IF NOT EXISTS orthopedic_procedures (
            id SERIAL PRIMARY KEY,
            visit_id INTEGER,
            patient_id UUID NOT NULL,
            procedure_name VARCHAR(255) NOT NULL,
            procedure_code VARCHAR(50),
            joint VARCHAR(100),
            side VARCHAR(20),
            approach VARCHAR(100),
            surgeon_id INTEGER,
            surgery_date TIMESTAMP,
            implants_used_json JSONB DEFAULT '[]',
            bone_cement_used BOOLEAN DEFAULT FALSE,
            tourniquet_time_min INTEGER,
            blood_loss_ml INTEGER,
            fee DECIMAL(10, 2),
            discount DECIMAL(10, 2) DEFAULT 0,
            net_amount DECIMAL(10, 2),
            status VARCHAR(50) DEFAULT 'Completed',
            complications TEXT,
            notes TEXT,
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_ortho_procedures_visit ON orthopedic_procedures(visit_id)`,
        `CREATE INDEX IF NOT EXISTS idx_ortho_procedures_patient ON orthopedic_procedures(patient_id)`,
        `CREATE INDEX IF NOT EXISTS idx_ortho_procedures_hospital ON orthopedic_procedures(hospital_id)`,

        `CREATE TABLE IF NOT EXISTS orthopedic_implants (
            id SERIAL PRIMARY KEY,
            implant_name VARCHAR(255) NOT NULL,
            category VARCHAR(100),
            manufacturer VARCHAR(255),
            model_number VARCHAR(100),
            lot_number VARCHAR(100),
            batch_number VARCHAR(50),
            expiry_date DATE,
            size VARCHAR(50),
            material VARCHAR(100),
            stock_quantity INTEGER DEFAULT 0,
            reorder_level INTEGER DEFAULT 2,
            unit_price DECIMAL(10, 2),
            supplier_name VARCHAR(255),
            is_sterile BOOLEAN DEFAULT TRUE,
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_ortho_implants_hospital ON orthopedic_implants(hospital_id)`,
        `CREATE INDEX IF NOT EXISTS idx_ortho_implants_category ON orthopedic_implants(category)`,
        `CREATE INDEX IF NOT EXISTS idx_ortho_implants_lot ON orthopedic_implants(lot_number)`,

        `CREATE TABLE IF NOT EXISTS orthopedic_physio_orders (
            id SERIAL PRIMARY KEY,
            patient_id UUID NOT NULL,
            procedure_id INTEGER,
            visit_id INTEGER,
            physio_type VARCHAR(100) NOT NULL,
            frequency VARCHAR(50),
            duration_weeks INTEGER,
            sessions_per_week INTEGER,
            total_sessions INTEGER,
            completed_sessions INTEGER DEFAULT 0,
            weight_bearing_status VARCHAR(50),
            rom_goals_json JSONB DEFAULT '{}',
            precautions TEXT,
            status VARCHAR(50) DEFAULT 'Active',
            ordered_by INTEGER,
            hospital_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_ortho_physio_patient ON orthopedic_physio_orders(patient_id)`,
        `CREATE INDEX IF NOT EXISTS idx_ortho_physio_hospital ON orthopedic_physio_orders(hospital_id)`
    ];

    migrations.push(...horizon1TableMigrations, ...horizon2TableMigrations);

    let ok = 0, fail = 0;

    // Run direct migrations
    for (const sql of migrations) {
        try {
            await pool.query(sql);
            ok++;
        } catch (err) {
            console.error(`${tag} Migration failed: ${err.message} | SQL: ${sql.slice(0, 80)}`);
            fail++;
        }
    }

    // Run conditional migrations
    for (const cm of conditionalMigrations) {
        try {
            const check = await pool.query(cm.check);
            if (check.rows.length > 0) {
                for (const sql of cm.sqls) {
                    try {
                        await pool.query(sql);
                        ok++;
                    } catch (err) {
                        console.error(`${tag} Conditional migration failed: ${err.message}`);
                        fail++;
                    }
                }
            }
        } catch (_) {
            // Table doesn't exist, skip
        }
    }

    console.log(`${tag} ✅ Migrations complete: ${ok} applied, ${fail} failed`);
}

module.exports = { ensureSchema };
