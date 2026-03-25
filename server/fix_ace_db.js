/**
 * Ace Hospital DB Migration — Run from server directory
 * 
 * This script connects to the Ace Hospital database and adds
 * all missing columns that are causing 500 errors.
 * 
 * Usage: Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME env vars
 *        or edit the config below, then: node fix_ace_db.js
 */

// Use the same db connection as the server
let pool;
try {
    const db = require('./db');
    pool = db.pool;
    console.log('✅ Using server db.js pool');
} catch (e) {
    // Fallback: direct connection
    const { Pool } = require('pg');
    pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'wolfhms',
        ssl: false
    });
    console.log('⚠️ Using direct PG connection');
}

const migrations = [
    // 1. hospitals: logo_url, primary_color, secondary_color
    {
        name: 'hospitals.logo_url',
        sql: `ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS logo_url TEXT;`
    },
    {
        name: 'hospitals.primary_color',
        sql: `ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#0d6efd';`
    },
    {
        name: 'hospitals.secondary_color',
        sql: `ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(20) DEFAULT '#6c757d';`
    },
    {
        name: 'hospitals.tagline',
        sql: `ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS tagline TEXT;`
    },
    {
        name: 'hospitals.app_display_name',
        sql: `ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS app_display_name TEXT;`
    },
    
    // 2. users: specialization (for doctors)
    {
        name: 'users.specialization',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS specialization TEXT;`
    },
    {
        name: 'users.qualification',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS qualification TEXT;`
    },
    {
        name: 'users.experience_years',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_years INTEGER;`
    },
    {
        name: 'users.consultation_fee',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS consultation_fee DECIMAL(10,2);`
    },
    {
        name: 'users.profile_image',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT;`
    },
    {
        name: 'users.available_days',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS available_days TEXT;`
    },
    {
        name: 'users.bio',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;`
    },
    
    // 3. patients: created_at, updated_at  
    {
        name: 'patients.created_at',
        sql: `ALTER TABLE patients ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`
    },
    {
        name: 'patients.updated_at',
        sql: `ALTER TABLE patients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`
    },
    
    // 4. opd_visits: notes
    {
        name: 'opd_visits.notes (if table exists)',
        sql: `DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'opd_visits') THEN
                EXECUTE 'ALTER TABLE opd_visits ADD COLUMN IF NOT EXISTS notes TEXT';
                EXECUTE 'ALTER TABLE opd_visits ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT ''scheduled''';
            END IF;
        END $$;`
    },
    
    // 5. appointments: notes, status
    {
        name: 'appointments (if table exists)',
        sql: `DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
                EXECUTE 'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes TEXT';
                EXECUTE 'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT ''scheduled''';
                EXECUTE 'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_type VARCHAR(20) DEFAULT ''in-person''';
            END IF;
        END $$;`
    },
    
    // 6. ipd_admissions table (create if missing)
    {
        name: 'ipd_admissions table',
        sql: `CREATE TABLE IF NOT EXISTS ipd_admissions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            patient_id UUID,
            hospital_id INTEGER,
            bed_id INTEGER,
            doctor_id INTEGER,
            admission_date TIMESTAMP DEFAULT NOW(),
            discharge_date TIMESTAMP,
            status VARCHAR(20) DEFAULT 'admitted',
            diagnosis TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );`
    },
    
    // 7. Set Ace hospital branding defaults
    {
        name: 'Ace hospital branding',
        sql: `UPDATE hospitals SET 
            logo_url = COALESCE(logo_url, '/ace-logo.png'),
            primary_color = COALESCE(primary_color, '#c41e3a'),
            secondary_color = COALESCE(secondary_color, '#1a237e'),
            tagline = COALESCE(tagline, 'Care with Passion & Compassion'),
            app_display_name = COALESCE(app_display_name, 'Ace Care')
        WHERE id = 3;`
    },
];

async function runMigrations() {
    console.log('═'.repeat(50));
    console.log('  ACE DB MIGRATION');
    console.log('═'.repeat(50));
    
    let passed = 0, failed = 0;
    
    for (const m of migrations) {
        try {
            await pool.query(m.sql);
            console.log(`✅ ${m.name}`);
            passed++;
        } catch (err) {
            console.log(`❌ ${m.name}: ${err.message}`);
            failed++;
        }
    }
    
    console.log('\n' + '═'.repeat(50));
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('═'.repeat(50));
    
    // Verify: check what columns exist now
    console.log('\n📋 Verification — Current columns:');
    
    const checks = [
        { table: 'hospitals', cols: ['logo_url', 'primary_color', 'secondary_color', 'tagline'] },
        { table: 'users', cols: ['specialization', 'qualification', 'bio'] },
        { table: 'patients', cols: ['created_at', 'updated_at'] },
    ];
    
    for (const check of checks) {
        try {
            const r = await pool.query(
                `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = ANY($2)`,
                [check.table, check.cols]
            );
            const found = r.rows.map(row => row.column_name);
            const missing = check.cols.filter(c => !found.includes(c));
            console.log(`  ${check.table}: Found [${found.join(', ')}]${missing.length ? ` Missing [${missing.join(', ')}]` : ' ✅ All present'}`);
        } catch (e) {
            console.log(`  ${check.table}: Error - ${e.message}`);
        }
    }
    
    // Check Ace hospital branding was set
    try {
        const hosp = await pool.query('SELECT id, name, code, logo_url, primary_color, tagline FROM hospitals WHERE id = 3');
        console.log('\n🏥 Ace Hospital:', JSON.stringify(hosp.rows[0], null, 2));
    } catch (e) {
        console.log('\n🏥 Ace Hospital check error:', e.message);
    }
    
    await pool.end();
    console.log('\n✅ Migration complete!');
}

runMigrations().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
});
