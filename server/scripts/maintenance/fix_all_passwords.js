/**
 * Emergency Fix Script - Reset ALL User Passwords
 * This script will:
 * 1. Connect to the database
 * 2. List all existing users
 * 3. Reset all passwords to 'password123' with proper bcrypt hash
 * 4. Ensure ward_incharge role exists and create user
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function fixAllUsersPasswords() {
    try {
        console.log('🔧 Emergency Password Reset Script\n');
        console.log('Connecting to database...');

        // Test connection
        const testResult = await pool.query('SELECT NOW()');
        console.log('✅ Database connected at:', testResult.rows[0].now);

        // List all users
        const users = await pool.query('SELECT id, username, role FROM users ORDER BY role, username');
        console.log('\n📋 Found', users.rows.length, 'users:');
        users.rows.forEach(u => console.log(`   - ${u.username} (${u.role})`));

        if (users.rows.length === 0) {
            console.log('\n⚠️  No users found! Creating demo users...');
            await createDemoUsers();
        } else {
            // Reset all passwords
            console.log('\n🔄 Resetting all passwords to "password123"...');
            const hash = await bcrypt.hash('password123', 10);

            const updateResult = await pool.query(
                'UPDATE users SET password = $1 RETURNING username',
                [hash]
            );

            console.log('✅ Reset passwords for', updateResult.rows.length, 'users');
        }

        // Ensure ward_incharge role exists
        console.log('\n🏥 Checking ward_incharge role...');
        try {
            await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
            await pool.query(`
                ALTER TABLE users ADD CONSTRAINT users_role_check 
                CHECK (role IN ('admin', 'doctor', 'nurse', 'receptionist', 'lab_tech', 'pharmacist', 'anaesthetist', 'ward_incharge', 'billing'))
            `);
            console.log('✅ Role constraint updated');
        } catch (e) {
            console.log('   Role constraint already exists or updated');
        }

        // Create ward_incharge user if not exists
        const wardUser = await pool.query("SELECT id FROM users WHERE role = 'ward_incharge'");
        if (wardUser.rows.length === 0) {
            const hash = await bcrypt.hash('password123', 10);
            await pool.query(
                "INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING",
                ['ward_incharge_user', hash, 'ward_incharge@hms.com', 'ward_incharge']
            );
            console.log('✅ Created ward_incharge_user');
        } else {
            console.log('✅ ward_incharge user exists');
        }

        // Final user list
        const finalUsers = await pool.query('SELECT username, role FROM users ORDER BY role');
        console.log('\n=== Login Credentials (All passwords: password123) ===');
        finalUsers.rows.forEach(u => console.log(`   ${u.username} / password123 (${u.role})`));

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        console.error('Full error:', err);
    } finally {
        pool.end();
        console.log('\n✅ Done!');
    }
}

async function createDemoUsers() {
    const hash = await bcrypt.hash('password123', 10);
    const users = [
        ['admin', 'admin@hms.com', 'admin'],
        ['doctor_user', 'doctor@hms.com', 'doctor'],
        ['nurse_user', 'nurse@hms.com', 'nurse'],
        ['receptionist_user', 'receptionist@hms.com', 'receptionist'],
        ['lab_tech_user', 'lab@hms.com', 'lab_tech'],
        ['pharmacist_user', 'pharmacy@hms.com', 'pharmacist'],
        ['ward_incharge_user', 'ward_incharge@hms.com', 'ward_incharge'],
    ];

    for (const [username, email, role] of users) {
        try {
            await pool.query(
                'INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4)',
                [username, hash, email, role]
            );
            console.log(`   Created ${username} (${role})`);
        } catch (e) {
            console.log(`   ${username} exists or error: ${e.message}`);
        }
    }
}

fixAllUsersPasswords();
