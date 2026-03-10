/**
 * Cloud Database Reset and Seed Script
 * This endpoint allows full database reset for testing environments
 * DANGER: This will DROP ALL DATA - only use for testing/staging
 */

const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const SETUP_KEY = 'WolfSetup2024!';

const resetAndSeedCloud = async (req, res) => {
    const { setupKey } = req.body;
    
    if (setupKey !== SETUP_KEY) {
        return res.status(403).json({ error: 'Invalid setup key' });
    }
    
    console.log('[SETUP] Starting FULL database reset and seed...');
    
    try {
        // Step 1: Drop all tables
        console.log('[1/4] Dropping all tables...');
        await pool.query(`
            DO $$ DECLARE
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                END LOOP;
            END $$;
        `);
        console.log('  ✓ All tables dropped');
        
        // Step 2: Create essential tables
        console.log('[2/4] Creating core tables...');
        
        // Hospitals table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS hospitals (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                code VARCHAR(50) UNIQUE NOT NULL,
                subdomain VARCHAR(100) UNIQUE,
                address TEXT,
                phone VARCHAR(20),
                email VARCHAR(255),
                logo_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255),
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'staff',
                department VARCHAR(100),
                hospital_id INTEGER REFERENCES hospitals(id),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Hospital Settings
        await pool.query(`
            CREATE TABLE IF NOT EXISTS hospital_settings (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER REFERENCES hospitals(id),
                setting_key VARCHAR(100) NOT NULL,
                setting_value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(hospital_id, setting_key)
            );
        `);
        
        // Emergency Logs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS emergency_logs (
                id SERIAL PRIMARY KEY,
                code VARCHAR(20) NOT NULL,
                location VARCHAR(255),
                triggered_by INTEGER REFERENCES users(id),
                status VARCHAR(20) DEFAULT 'Active',
                triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP,
                resolved_by INTEGER,
                hospital_id INTEGER REFERENCES hospitals(id)
            );
        `);
        
        console.log('  ✓ Core tables created');
        
        // Step 3: Seed Hospitals
        console.log('[3/4] Seeding hospitals...');
        await pool.query(`
            INSERT INTO hospitals (name, code, subdomain) VALUES
            ('Kokila Hospital', 'kokila', 'kokila.wolfsecurity.in'),
            ('Wolf HMS Demo', 'taneja', 'wolfhms.web.app'),
            ('Dr. Parveen Clinic', 'drparveen', 'drparveen.wolfsecurity.in')
            ON CONFLICT (code) DO NOTHING;
        `);
        console.log('  ✓ 3 hospitals seeded');
        
        // Step 4: Seed Users
        console.log('[4/4] Seeding users...');
        const passwordHash = await bcrypt.hash('Wolf@2024!', 10);
        
        const users = [
            { username: 'admin_kokila', role: 'admin', hospital_id: 1 },
            { username: 'admin_taneja', role: 'admin', hospital_id: 2 },
            { username: 'admin_parveen', role: 'admin', hospital_id: 3 },
            { username: 'doctor_user', role: 'doctor', hospital_id: 1 },
            { username: 'nurse_user', role: 'nurse', hospital_id: 1 },
            { username: 'receptionist_user', role: 'receptionist', hospital_id: 1 },
            { username: 'pharmacy_user', role: 'pharmacist', hospital_id: 1 },
            { username: 'lab_user', role: 'lab_tech', hospital_id: 1 },
            { username: 'ward_user', role: 'ward_incharge', hospital_id: 1 },
            { username: 'billing_user', role: 'billing', hospital_id: 1 },
            { username: 'gurpreetpro', role: 'super_admin', hospital_id: null },
        ];
        
        for (const u of users) {
            await pool.query(`
                INSERT INTO users (username, email, password_hash, role, hospital_id)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (username) DO NOTHING
            `, [u.username, `${u.username}@wolfhms.com`, passwordHash, u.role, u.hospital_id]);
        }
        console.log(`  ✓ ${users.length} users seeded (password: Wolf@2024!)`);
        
        console.log('\n[SETUP] Database reset and seed COMPLETE!');
        
        res.json({
            success: true,
            message: 'Database reset and seeded successfully',
            hospitals: 3,
            users: users.length,
            defaultPassword: 'Wolf@2024!'
        });
        
    } catch (error) {
        console.error('[SETUP] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { resetAndSeedCloud };
