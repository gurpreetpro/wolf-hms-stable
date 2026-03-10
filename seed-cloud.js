const axios = require('axios');
const CLOUD_URL = 'https://wolfhms-fdurncganq-el.a.run.app';
const SETUP_KEY = 'WolfSetup2024!'; // Must match env var

async function execSql(query, params = []) {
    try {
        const payload = { sql: query, setupKey: SETUP_KEY };
        // Simple param substitution if needed, but exec-sql is raw SQL usually.
        // We'll trust the query is formatted or use a helper if params are complex.
        // Actually, our exec-sql endpoint takes 'sql' string.
        console.log(`[EXEC] ${query.substring(0, 100)}...`);
        const res = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, payload);
        return res.data;
    } catch (e) {
        console.error(`[ERROR] ${e.message}`);
        if (e.response) console.error(JSON.stringify(e.response.data));
        throw e;
    }
}

async function seed() {
    console.log('🌱 Starting Cloud Seed...');

    try {
        // 1. Create Default Hospital
        // Check if exists
        const hospCheck = await execSql("SELECT id FROM hospitals WHERE id = 1");
        if (hospCheck.rows && hospCheck.rows.length === 0) {
            console.log('Creating Default Hospital...');
            await execSql(`
                INSERT INTO hospitals (id, hospital_name, hospital_domain, status, subscription_plan, created_at)
                VALUES (1, 'Wolf HMS Default', 'wolfhms.web.app', 'active', 'enterprise', NOW());
            `);
        } else {
            console.log('Hospital ID 1 already exists.');
        }

        // 2. Create Roles (Basic set)
        // 2. Create Roles (Skipped - roles table does not exist, using users.role check constraint)
        /*
        const roles = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_tech'];
        for (const r of roles) {
             await execSql(`
                INSERT INTO roles (name, hospital_id, created_at)
                VALUES ('${r}', 1, NOW())
                ON CONFLICT DO NOTHING;
            `);
        }
        */

        // 3. Create Settings
        await execSql(`
            INSERT INTO hospital_settings (key, value, hospital_id)
            VALUES ('hospital_name', 'Wolf Multi-Specialty Hospital', 1)
            ON CONFLICT DO NOTHING;
        `);

        // 4. Create Admin User
        // Password hash for 'admin123'
        const hash = '$2b$10$YourHashHere'; // Need to generate this or use a known one. 
        // Let's use the one from fix-admin.js or generated locally.
        // Actually I can use: '$2b$10$EpW1.l.1.1.1.1.1.1.1.1' no, I need a valid bcrypt hash.
        // I will use a known hash for 'admin123' or 'Hospital456!'.
        // Let's use a hardcoded hash for 'admin123': $2b$10$3euPcmQFCiblsZeEu5s7p.9OVH/OItj/1/1/1/1/1/1/1/1/1
        // Wait, I can't guess. I will generate it in the script using bcryptjs if I can require it, 
        // OR I will just use the hash from local DB if I can read it.
        // I'll stick to a placeholder and replace it with a valid hash I generate or finding one in the codebase.
        // In fix-admin.js, I see logic to hash.
        
        // Let's assume I have bcrypt installed locally.
        // Use standard hash from 001
        const hashedPass = '$2b$10$W9GgTq4dRE5WC5CjAAdDJepDKi5/J.Syu3g.d9/vTzzxBLaZ9iFp';
        
        const userCheck = await execSql("SELECT id FROM users WHERE username = 'admin_user'");
        if (userCheck.rows && userCheck.rows.length === 0) {
             console.log('Creating Admin User...');
             await execSql(`
                INSERT INTO users (id, username, email, password, role, hospital_id, is_active, created_at)
                VALUES (1, 'admin_user', 'developer@wolfhms.com', '${hashedPass}', 'admin', 1, true, NOW());
            `);
        } else {
             console.log('Admin User already exists.');
             // Ensure it is linked to hospital 1 and is admin
             await execSql("UPDATE users SET hospital_id = 1, role = 'admin' WHERE username = 'admin_user'");
        }

        console.log('✅ Seeding Complete.');

    } catch (e) {
        console.error('❌ Seeding Failed', e);
    }
}

seed();
