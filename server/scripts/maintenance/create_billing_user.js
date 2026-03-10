// Script to create billing_user in the database
const bcrypt = require('bcryptjs');
const pool = require('./config/db');

async function createBillingUser() {
    try {
        // First, drop and recreate the role constraint to include 'billing'
        console.log('Updating role constraint to include billing...');
        await pool.query(`
            ALTER TABLE users 
            DROP CONSTRAINT IF EXISTS users_role_check;
        `);

        await pool.query(`
            ALTER TABLE users 
            ADD CONSTRAINT users_role_check 
            CHECK (role IN ('admin', 'doctor', 'nurse', 'receptionist', 'lab_tech', 'pharmacist', 'anaesthetist', 'billing'));
        `);
        console.log('Role constraint updated!');

        // Generate password hash
        const password = 'password123';
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Check if user exists first
        const existing = await pool.query(
            'SELECT id FROM users WHERE username = $1',
            ['billing_user']
        );

        if (existing.rows.length > 0) {
            console.log('billing_user already exists, updating...');
            await pool.query(
                'UPDATE users SET role = $1, password = $2 WHERE username = $3',
                ['billing', passwordHash, 'billing_user']
            );
        } else {
            // Insert new user with correct columns
            const result = await pool.query(
                `INSERT INTO users (username, password, email, role, is_active) 
                 VALUES ($1, $2, $3, $4, $5) RETURNING id, username, role`,
                ['billing_user', passwordHash, 'billing@hms.com', 'billing', true]
            );
            console.log('Created billing_user:', result.rows[0]);
        }

        console.log('\n✅ billing_user created successfully!');
        console.log('=====================================');
        console.log('Username: billing_user');
        console.log('Password: password123');
        console.log('Role: billing');
        console.log('=====================================');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

createBillingUser();
