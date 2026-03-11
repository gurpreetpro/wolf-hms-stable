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
            END IF;
        END $$;`,

        // patients table
        `ALTER TABLE patients ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
        `ALTER TABLE patients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,

        // admissions table
        `CREATE TABLE IF NOT EXISTS admissions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            patient_id UUID,
            hospital_id INTEGER,
            bed_number VARCHAR(50),
            treating_doctor_id INTEGER,
            admission_date TIMESTAMP DEFAULT NOW(),
            discharge_date TIMESTAMP,
            status VARCHAR(20) DEFAULT 'Admitted',
            diagnosis TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`,
        
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
    ];

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
