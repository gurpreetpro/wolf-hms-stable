const pool = require('./config/db');

async function dumpData() {
    try {
        console.log('='.repeat(60));
        console.log('🏥 HOSPITALS');
        console.log('='.repeat(60));
        
        const hospitals = await pool.query('SELECT * FROM hospitals ORDER BY id');
        if (hospitals.rows.length === 0) {
            console.log('⚠️ No hospitals found.');
        } else {
            hospitals.rows.forEach(h => {
                console.log(`[${h.id}] ${h.name || h.hospital_name} | Code: ${h.code || 'N/A'} | Domain: ${h.subdomain || h.hospital_domain}`);
            });
        }

        console.log('\n' + '='.repeat(60));
        console.log('👥 USERS (Admins & Super Admins)');
        console.log('='.repeat(60));
        
        const users = await pool.query(`
            SELECT u.id, u.username, u.email, u.role, u.hospital_id, u.is_active,
                   h.name as hospital_name
            FROM users u
            LEFT JOIN hospitals h ON u.hospital_id = h.id
            WHERE u.role IN ('admin', 'super_admin', 'platform_owner')
            ORDER BY u.hospital_id, u.role DESC
        `);
        
        if (users.rows.length === 0) {
            console.log('⚠️ No admin users found.');
        } else {
            users.rows.forEach(u => {
                const mfa = u.is_mfa_enabled ? '🔐MFA' : '';
                console.log(`[Hospital ${u.hospital_id}] ${u.role.padEnd(12)} | ${u.username.padEnd(20)} | ${u.email} ${mfa}`);
            });
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('🔑 DEFAULT PASSWORD: password123');
        console.log('='.repeat(60));
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

dumpData();
