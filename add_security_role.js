// Script to add security_guard role to the users table check constraint
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5433,
    database: 'hospital_db',
    user: 'postgres',
    password: 'Hospital456!'
});

async function addSecurityGuardRole() {
    const client = await pool.connect();
    try {
        console.log('Connecting to PROD database...');
        
        // First, check the current constraint
        const constraintCheck = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conname = 'users_role_check'
        `);
        
        console.log('\n=== Current Constraint ===');
        console.log(constraintCheck.rows);
        
        // Drop the old constraint and add a new one with security_guard
        console.log('\nUpdating constraint to include security_guard...');
        
        await client.query('BEGIN');
        
        // Drop the old constraint
        await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        
        // Add new constraint with security_guard
        await client.query(`
            ALTER TABLE users ADD CONSTRAINT users_role_check 
            CHECK (role IN ('admin', 'doctor', 'nurse', 'receptionist', 'lab_tech', 
                           'pharmacist', 'anaesthetist', 'ward_incharge', 'blood_bank_tech', 
                           'security_guard'))
        `);
        
        await client.query('COMMIT');
        
        console.log('✅ Successfully added security_guard role to the database!');
        
        // Verify
        const newConstraint = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conname = 'users_role_check'
        `);
        console.log('\n=== Updated Constraint ===');
        console.log(newConstraint.rows);
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

addSecurityGuardRole();
