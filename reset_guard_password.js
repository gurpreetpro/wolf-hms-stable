const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function resetGuardPassword() {
    const client = new Client({
        host: '127.0.0.1',
        port: 5433,  // PROD database via Cloud SQL Proxy
        database: 'hospital_db',
        user: 'postgres',
        password: 'Hospital456!'
    });

    try {
        await client.connect();
        console.log('Connected to PROD database');
        
        // Hash the new password
        const newPassword = 'password123';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        console.log('Generated new password hash');
        
        // Update the password for guard_user
        const result = await client.query(`
            UPDATE users 
            SET password = $1
            WHERE username = 'guard_user'
            RETURNING id, username, role
        `, [hashedPassword]);
        
        if (result.rowCount > 0) {
            console.log(`\n✅ Password reset successful for: ${result.rows[0].username}`);
            console.log(`   User ID: ${result.rows[0].id}`);
            console.log(`   Role: ${result.rows[0].role}`);
            console.log(`   New password: ${newPassword}`);
        } else {
            console.log('❌ No user found with username guard_user');
        }
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

resetGuardPassword();
