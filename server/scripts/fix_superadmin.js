const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../config/db');

async function fixSuperAdmins() {
    console.log('=== Fixing Super Admin Hospital Access ===\n');
    
    try {
        // Update super_admin users to have NULL hospital_id
        const result = await pool.query(`
            UPDATE users 
            SET hospital_id = NULL 
            WHERE role = 'super_admin'
            RETURNING id, username, email, role, hospital_id
        `);
        
        console.log(`✅ Fixed ${result.rowCount} super_admin user(s):\n`);
        result.rows.forEach(u => {
            console.log(`   [${u.id}] ${u.username} | ${u.email} | hospital_id = NULL (Platform-wide)`);
        });

        // Verify the fix
        console.log('\n--- Verification ---');
        const verify = await pool.query(`
            SELECT id, username, email, role, hospital_id 
            FROM users 
            WHERE role = 'super_admin'
        `);
        verify.rows.forEach(u => {
            console.log(`   [${u.id}] ${u.username} | hospital_id: ${u.hospital_id === null ? 'NULL ✓' : u.hospital_id}`);
        });

        console.log('\n✅ Super admins can now login from ANY hospital domain!');
        console.log('\n📋 Login Credentials:');
        console.log('   Username: gurpreetpro@gmail.com');
        console.log('   Password: password123');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        pool.end();
    }
}

fixSuperAdmins();
