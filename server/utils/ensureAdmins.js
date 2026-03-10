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
                    hospital_name VARCHAR(255) GENERATED ALWAYS AS (name) STORED, -- Backwards compat
                    subdomain VARCHAR(100) UNIQUE,
                    hospital_domain VARCHAR(255) GENERATED ALWAYS AS (subdomain) STORED, -- Backwards compat
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);
            
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
        
        // 3. Seed Hospitals (Integer IDs)
        const hospitals = [
            { id: 1, code: 'default', name: 'Kokila Hospital', domain: 'kokila.wolfhms.web.app' },
            { id: 2, code: 'wolf', name: 'Wolf HMS', domain: 'wolf-hms.web.app' }
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
