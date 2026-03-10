const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const readline = require('readline');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createHospital() {
    try {
        console.log('🏥 Wolf HMS: Create New Hospital Tenant\n');

        const hospitalName = await question('Enter Hospital Name: ');
        const hospitalDomain = await question('Enter Domain (e.g., city.wolfhms.com): ');
        const adminEmail = await question('Enter Admin Email: ');
        const adminPass = await question('Enter Admin Password: ');

        if (!hospitalName || !hospitalDomain || !adminEmail || !adminPass) {
            console.error('❌ All fields are required.');
            process.exit(1);
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Create Hospital
            const hospRes = await client.query(`
                INSERT INTO hospitals (hospital_name, hospital_domain, status, subscription_plan, created_at)
                VALUES ($1, $2, 'active', 'enterprise', NOW())
                RETURNING id;
            `, [hospitalName, hospitalDomain]);

            const hospitalId = hospRes.rows[0].id;
            console.log(`✅ Hospital Created. ID: ${hospitalId}`);

            // 2. Create Settings
            await client.query(`
                INSERT INTO hospital_settings (key, value, hospital_id)
                VALUES 
                ('hospital_name', $1, $2),
                ('hospital_email', $3, $2),
                ('theme', 'wolf-dark', $2)
            `, [hospitalName, hospitalId, adminEmail]);

            // 3. Create Admin User
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminPass, salt);

            await client.query(`
                INSERT INTO users (username, email, password, role, hospital_id, is_active, created_at)
                VALUES ($1, $2, $3, 'admin', $4, true, NOW())
            `, [adminEmail.split('@')[0], adminEmail, hashedPassword, hospitalId]);

            console.log(`✅ Admin User Created: ${adminEmail.split('@')[0]}`);

            await client.query('COMMIT');
            console.log('\n🎉 Onboarding Complete!');

        } catch (e) {
            await client.query('ROLLBACK');
            console.error('❌ Transaction Failed:', e.message);
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
        rl.close();
    }
}

createHospital();
