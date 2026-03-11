const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const ADMIN_USERS = [
    { username: 'admin_taneja', email: 'admin@taneja.com', hospitalName: 'Kokila' },
    { username: 'admin_user', email: 'admin@wolf-hms.com', hospitalName: 'Kokila' }
];

// Security: Use environment variable for default password
// In production, set ADMIN_DEFAULT_PASSWORD to a strong unique value
const DEFAULT_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || (() => {
    if (process.env.NODE_ENV === 'production') {
        console.warn('⚠️  [SECURITY] ADMIN_DEFAULT_PASSWORD not set in production! Using fallback.');
    }
    return 'password123'; // Fallback for development only
})();

async function ensureAdminUsers() {
    try {
        console.log('🔐 [Auth] verifying admin users...');

        // 1. CRITICAL: Schema Health Check (Integer Standard)
        // Detect if we are stuck on UUID Schema (which conflicts with migrations)
        try {
            const schemaCheck = await pool.query(`
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'hospitals' AND column_name = 'id'
            `);

            if (schemaCheck.rows.length > 0) {
                const idType = schemaCheck.rows[0].data_type;
                if (idType === 'uuid') {
                    console.warn(`   ⚠️ [SCHEMA MISMATCH] 'hospitals.id' is UUID, expected INTEGER.`);
                    console.warn(`   ☢️ [NUCLEAR FIX] Dropping UUID tables to enforce Integer schema...`);
                    await pool.query('DROP TABLE IF EXISTS users CASCADE');
                    await pool.query('DROP TABLE IF EXISTS hospitals CASCADE');
                }
            }
        } catch (checkErr) {
            console.warn(`   ⚠️ Schema check skipped: ${checkErr.message}`);
        }

        // 2. Ensure Schema Exists (Integer Standard)
        try {
            // Mirrors 070_multi_tenancy_foundation.sql
            await pool.query(`
                CREATE TABLE IF NOT EXISTS hospitals (
                    id SERIAL PRIMARY KEY, 
                    code VARCHAR(50) UNIQUE NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    subdomain VARCHAR(100) UNIQUE,
                    custom_domain VARCHAR(255),
                    logo_url VARCHAR(500),
                    primary_color VARCHAR(20),
                    secondary_color VARCHAR(20),
                    address TEXT,
                    city VARCHAR(100),
                    state VARCHAR(100),
                    country VARCHAR(100) DEFAULT 'India',
                    phone VARCHAR(50),
                    email VARCHAR(255),
                    tagline VARCHAR(500),
                    settings JSONB DEFAULT '{}',
                    subscription_tier VARCHAR(50) DEFAULT 'basic',
                    subscription_plan VARCHAR(50) DEFAULT 'basic',
                    status VARCHAR(20) DEFAULT 'active',
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);

            // Patch missing columns on existing hospitals table
            const hospCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'hospitals'");
            const hospColNames = hospCols.rows.map(r => r.column_name);
            if (!hospColNames.includes('settings')) {
                await pool.query("ALTER TABLE hospitals ADD COLUMN settings JSONB DEFAULT '{}'");
                console.log("   🔧 [PATCH] Added 'settings' to hospitals");
            }
            if (!hospColNames.includes('custom_domain')) {
                await pool.query("ALTER TABLE hospitals ADD COLUMN custom_domain VARCHAR(255)");
            }
            if (!hospColNames.includes('is_active')) {
                await pool.query("ALTER TABLE hospitals ADD COLUMN is_active BOOLEAN DEFAULT true");
            }
            if (!hospColNames.includes('status')) {
                await pool.query("ALTER TABLE hospitals ADD COLUMN status VARCHAR(20) DEFAULT 'active'");
            }

            // Mirrors 001_initial_schema.sql + 071_add_hospital_id_core.sql
            await pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    full_name VARCHAR(255),
                    role VARCHAR(50) DEFAULT 'admin',
                    department VARCHAR(100),
                    hospital_id INT REFERENCES hospitals(id),
                    is_active BOOLEAN DEFAULT TRUE,
                    approval_status VARCHAR(50) DEFAULT 'APPROVED',
                    security_question VARCHAR(255),
                    security_answer VARCHAR(255),
                    security_question_2 VARCHAR(255),
                    security_answer_2 VARCHAR(255),
                    security_question_3 VARCHAR(255),
                    security_answer_3 VARCHAR(255),
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);

            // [ROBUST FIX] Check for missing columns (e.g. if table existed but was old)
            const userColumns = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
            const existingCols = userColumns.rows.map(r => r.column_name);

            if (!existingCols.includes('hospital_id')) {
                console.warn("   ⚠️ [SCHEMA PATCH] Adding missing 'hospital_id' (INT) to users...");
                await pool.query("ALTER TABLE users ADD COLUMN hospital_id INT REFERENCES hospitals(id)");
            }
            if (!existingCols.includes('full_name')) {
                console.warn("   🔧 [PATCH] Adding missing 'full_name'...");
                await pool.query('ALTER TABLE users ADD COLUMN full_name VARCHAR(255)');
            }

        } catch (schemaErr) {
            console.warn(`   ⚠️ Schema create warning: ${schemaErr.message} (Proceeding best-effort)`);
        }

        // 2a. Ensure critical columns exist on core tables
        try {
            // Soft-delete support
            await pool.query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP');
            await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP');
            // OPD visits complaint field
            await pool.query('ALTER TABLE opd_visits ADD COLUMN IF NOT EXISTS complaint TEXT');
            // Admissions columns
            await pool.query('ALTER TABLE admissions ADD COLUMN IF NOT EXISTS ipd_number VARCHAR(50)');
            await pool.query('ALTER TABLE admissions ADD COLUMN IF NOT EXISTS current_diet TEXT');
            await pool.query('ALTER TABLE admissions ADD COLUMN IF NOT EXISTS last_round_at TIMESTAMP');
            console.log('   ✅ [Seed] Critical column patches verified');
        } catch (delErr) {
            console.warn(`   ⚠️ Column patch: ${delErr.message}`);
        }

        // 2b. Ensure refresh_tokens table exists (Required by Auth Controller)
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS refresh_tokens (
                    id SERIAL PRIMARY KEY,
                    user_id INT REFERENCES users(id) ON DELETE CASCADE,
                    token TEXT NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    is_revoked BOOLEAN DEFAULT FALSE,
                    replaced_by TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);
            console.log('   ✅ [Seed] refresh_tokens table verified');
        } catch (rtErr) {
            console.warn(`   ⚠️ refresh_tokens table warning: ${rtErr.message}`);
        }

        // 2c. Ensure hospital_settings table exists (Required by Settings Controller)
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS hospital_settings (
                    id SERIAL PRIMARY KEY,
                    key VARCHAR(255) NOT NULL,
                    value TEXT,
                    hospital_id INT REFERENCES hospitals(id),
                    created_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(key, hospital_id)
                );
            `);
            console.log('   ✅ [Seed] hospital_settings table verified');
        } catch (hsErr) {
            console.warn(`   ⚠️ hospital_settings table warning: ${hsErr.message}`);
        }

        // 3. Seed Hospitals (Integer IDs)
        const hospitals = [
            { id: 1, code: 'default', name: 'Kokila Hospital', domain: 'kokila.wolfhms.web.app' },
            { id: 2, code: 'wolf', name: 'Wolf HMS', domain: 'wolf-hms.web.app' },
            { id: 3, code: 'ACE', name: 'Ace Heart & Vascular Institute', domain: 'ace' }
        ];

        for (const h of hospitals) {
            try {
                await pool.query(`
                   INSERT INTO hospitals (id, code, name, subdomain)
                   VALUES ($1, $2, $3, $4)
                   ON CONFLICT (id) DO UPDATE 
                   SET name = EXCLUDED.name, subdomain = EXCLUDED.subdomain
                `, [h.id, h.code, h.name, h.domain]);
                console.log(`   ✅ [Seed] Verified Hospital: ${h.name} (ID: ${h.id})`);
            } catch (err) {
                // Try code conflict
                await pool.query(`
                   INSERT INTO hospitals (code, name, subdomain)
                   VALUES ($1, $2, $3)
                   ON CONFLICT (code) DO NOTHING
                `, [h.code, h.name, h.domain]);
            }
        }

        // 4. Seed Users with Specific Hospital Links
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

        // Define users with their target Hospital ID
        const TARGET_USERS = [
            {
                username: 'admin_taneja',
                email: 'admin@taneja.com',
                full_name: 'Dr. Taneja (Admin)',
                role: 'admin',
                hospital_id: 1 // Kokila
            },
            {
                username: 'admin_user',
                email: 'admin@wolf-hms.com',
                full_name: 'System Admin',
                role: 'admin',
                hospital_id: 1 // Kokila 
            },
            {
                username: 'gurpreetpro',
                email: 'gurpreetpro@gmail.com',
                full_name: 'WOLF TECHNOLOGIES INDIA',
                role: 'super_admin',
                hospital_id: 2, // Wolf HMS (The Platform Tenant)
                mfa: true
            },
            {
                username: 'ace_admin',
                email: 'admin@aceheartinstitute.com',
                full_name: 'Ace Hospital Admin',
                role: 'admin',
                hospital_id: 3 // Ace Heart & Vascular Institute
            }
        ];

        for (const user of TARGET_USERS) {
            console.log(`   👤 Processing: ${user.username}...`);

            const existing = await pool.query(
                'SELECT id, hospital_id FROM users WHERE username = $1 OR email = $2',
                [user.username, user.email]
            );

            if (existing.rows.length === 0) {
                try {
                    await pool.query(`
                        INSERT INTO users (username, email, password, role, hospital_id, is_active, approval_status, full_name, is_mfa_enabled)
                        VALUES ($1, $2, $3, $4, $5, true, 'APPROVED', $6, $7)
                    `, [user.username, user.email, hashedPassword, user.role, user.hospital_id, user.full_name, user.mfa || false]);
                    console.log(`      ✨ Created: ${user.username} (Hospital ${user.hospital_id})`);
                } catch (insertErr) {
                    console.error(`      ⚠️ Failed to create ${user.username}: ${insertErr.message}`);
                }
            } else {
                // Fix if pointing to wrong hospital or inactive
                const currentUser = existing.rows[0];
                await pool.query(
                    'UPDATE users SET password = $1, is_active = true, hospital_id = $2, role = $3, full_name = $4, is_mfa_enabled = $5 WHERE id = $6',
                    [hashedPassword, user.hospital_id, user.role, user.full_name, user.mfa || false, currentUser.id]
                );
                console.log(`      ✅ Verified/Updated: ${user.username} (Hospital ${user.hospital_id})`);
            }
        }

        console.log('✅ [Seed] Admin User Verification Complete.');

    } catch (error) {
        console.error('❌ [Seed] ensureAdminUsers Failed:', error.message);
    }
}

module.exports = { ensureAdminUsers };
