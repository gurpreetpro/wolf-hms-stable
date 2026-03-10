// Fix the 3 failed migrations by creating missing prerequisite tables first
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: 'localhost', port: 5432,
    user: 'wolfhms', password: 'W0lfDB_2026!!Secure',
    database: 'hospital_db',
});

const fixes = [
    // Create missing cssd_batches table that 213 references
    `CREATE TABLE IF NOT EXISTS cssd_batches (
        id SERIAL PRIMARY KEY,
        batch_number VARCHAR(50),
        sterilizer_type VARCHAR(50),
        cycle_number INT,
        load_datetime TIMESTAMP DEFAULT NOW(),
        operator_name VARCHAR(100),
        status VARCHAR(30) DEFAULT 'Pending',
        hospital_id INT REFERENCES hospitals(id),
        created_at TIMESTAMP DEFAULT NOW()
    )`,
    // Create exercise_library if missing (for physio)
    `CREATE TABLE IF NOT EXISTS exercise_library (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(100),
        muscle_group VARCHAR(100),
        difficulty VARCHAR(50) DEFAULT 'Moderate',
        description TEXT,
        instructions TEXT,
        contraindications TEXT,
        hospital_id INT REFERENCES hospitals(id),
        created_at TIMESTAMP DEFAULT NOW()
    )`,
    // Create rehab_plans if missing
    `CREATE TABLE IF NOT EXISTS rehab_plans (
        id SERIAL PRIMARY KEY,
        patient_id INT REFERENCES patients(id),
        therapist_id INT REFERENCES users(id),
        diagnosis VARCHAR(500),
        goals TEXT,
        start_date DATE DEFAULT CURRENT_DATE,
        end_date DATE,
        status VARCHAR(30) DEFAULT 'Active',
        notes TEXT,
        hospital_id INT REFERENCES hospitals(id),
        created_at TIMESTAMP DEFAULT NOW()
    )`,
    // Create rehab_plan_exercises if missing
    `CREATE TABLE IF NOT EXISTS rehab_plan_exercises (
        id SERIAL PRIMARY KEY,
        plan_id INT REFERENCES rehab_plans(id),
        exercise_id INT REFERENCES exercise_library(id),
        sets INT DEFAULT 3,
        reps INT DEFAULT 10,
        duration_minutes INT,
        frequency VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    )`,
    // Create rehab_sessions if missing
    `CREATE TABLE IF NOT EXISTS rehab_sessions (
        id SERIAL PRIMARY KEY,
        plan_id INT REFERENCES rehab_plans(id),
        patient_id INT REFERENCES patients(id),
        therapist_id INT REFERENCES users(id),
        session_date DATE DEFAULT CURRENT_DATE,
        duration_minutes INT,
        exercises_completed JSONB,
        pain_level INT,
        progress_notes TEXT,
        status VARCHAR(30) DEFAULT 'Completed',
        hospital_id INT REFERENCES hospitals(id),
        created_at TIMESTAMP DEFAULT NOW()
    )`,
    // Create treatment_packages if missing
    `CREATE TABLE IF NOT EXISTS treatment_packages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        code VARCHAR(50),
        description TEXT,
        category VARCHAR(100),
        base_price DECIMAL(12,2) DEFAULT 0,
        inclusions JSONB,
        exclusions JSONB,
        validity_days INT DEFAULT 30,
        is_active BOOLEAN DEFAULT true,
        hospital_id INT REFERENCES hospitals(id),
        created_at TIMESTAMP DEFAULT NOW()
    )`,
    // Drop the restrictive care_tasks_type_check constraint again (in case it was re-created)
    `ALTER TABLE care_tasks DROP CONSTRAINT IF EXISTS care_tasks_type_check`,
    // Add missing columns that the server references
    `ALTER TABLE opd_visits ADD COLUMN IF NOT EXISTS notes TEXT`,
    `ALTER TABLE admissions ADD COLUMN IF NOT EXISTS ipd_number VARCHAR(50)`,
    // Fix the admissions sequence
    `SELECT setval('admissions_id_seq', COALESCE((SELECT MAX(id)+1 FROM admissions), 1), false)`,
    // Create refresh_tokens table
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    )`,
];

(async () => {
    console.log('Applying prerequisite fixes + missing tables...');
    let ok = 0, fail = 0;
    for (let i = 0; i < fixes.length; i++) {
        try {
            await pool.query(fixes[i]);
            console.log(`OK [${i+1}/${fixes.length}]`);
            ok++;
        } catch (e) {
            if (e.message.includes('already exists')) {
                console.log(`OK (exists) [${i+1}/${fixes.length}]`);
                ok++;
            } else {
                console.log(`FAIL [${i+1}/${fixes.length}]: ${e.message}`);
                fail++;
            }
        }
    }

    // Now retry the failed migrations
    console.log('\nRetrying failed migration files...');
    const retryFiles = [
        '211_physio_schema.sql',
        '213_tier2_3_expansion.sql',
        '215_treatment_packages.sql',
    ];
    
    for (const f of retryFiles) {
        const fp = path.join(__dirname, 'migrations', f);
        if (!fs.existsSync(fp)) { console.log(`SKIP: ${f}`); continue; }
        try {
            await pool.query(fs.readFileSync(fp, 'utf8'));
            console.log(`OK: ${f}`);
            ok++;
        } catch (e) {
            if (e.message.includes('already exists') || e.message.includes('duplicate')) {
                console.log(`OK (skip): ${f}`);
                ok++;
            } else {
                console.log(`FAIL: ${f} - ${e.message.substring(0,80)}`);
                fail++;
            }
        }
    }
    
    // Regenerate Prisma
    console.log('\nTotal: ' + ok + ' ok, ' + fail + ' fail');
    await pool.end();
})();
