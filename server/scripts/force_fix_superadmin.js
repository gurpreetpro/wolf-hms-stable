const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../config/db');

async function forceFixAndTest() {
    console.log('=== Force Fix SuperAdmin ===\n');
    
    try {
        // Direct UPDATE
        const updateResult = await pool.query(`
            UPDATE users 
            SET hospital_id = NULL 
            WHERE email = 'gurpreetpro@gmail.com' OR username = 'admin_user' OR role = 'super_admin'
            RETURNING id, username, hospital_id
        `);
        
        console.log(`✅ Updated ${updateResult.rowCount} rows`);
        updateResult.rows.forEach(r => {
            console.log(`   [${r.id}] ${r.username} -> hospital_id = ${r.hospital_id === null ? 'NULL' : r.hospital_id}`);
        });

        // Verify
        console.log('\n--- Final Check ---');
        const verify = await pool.query(`
            SELECT id, username, email, role, hospital_id 
            FROM users 
            WHERE email = 'gurpreetpro@gmail.com' OR username = 'admin_user'
        `);
        verify.rows.forEach(u => {
            console.log(`   [${u.id}] ${u.username} | ${u.role} | hospital_id: ${u.hospital_id === null ? 'NULL ✓' : u.hospital_id}`);
        });

        // Test login query
        console.log('\n--- Testing Login Query ---');
        const loginTest = await pool.query(`
            SELECT id, username, email, role, hospital_id 
            FROM users 
            WHERE (username = 'gurpreetpro@gmail.com' OR email = 'gurpreetpro@gmail.com')
            AND (hospital_id = 1 OR hospital_id IS NULL)
        `);
        
        if (loginTest.rows.length > 0) {
            console.log('✅ Login query would find user!');
            loginTest.rows.forEach(u => {
                console.log(`   [${u.id}] ${u.username} | hospital_id: ${u.hospital_id}`);
            });
        } else {
            console.log('❌ Login query still returns 0 rows!');
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

forceFixAndTest();
