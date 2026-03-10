const pool = require('./config/db');

async function listCredentials() {
    try {
        console.log('🔍 Scanning for Hospitals...');
        const hospitals = await pool.query('SELECT * FROM hospitals ORDER BY id');
        
        if (hospitals.rows.length === 0) {
            console.log('⚠️ No hospitals found.');
            return;
        }

        console.log('\n🏥 Found ' + hospitals.rows.length + ' Hospitals:');
        
        for (const hospital of hospitals.rows) {
            console.log(`\n--------------------------------------------------`);
            console.log(`🏥 [ID: ${hospital.id}] ${hospital.name || hospital.hospital_name} (${hospital.code || 'N/A'})`);
            console.log(`   Domain: ${hospital.subdomain || hospital.hospital_domain}`);
            
            const users = await pool.query(`
                SELECT id, username, email, role, password 
                FROM users 
                WHERE hospital_id = $1 AND role IN ('admin', 'super_admin')
            `, [hospital.id]);
            
            if (users.rows.length > 0) {
                console.log(`   👥 Admins (${users.rows.length}):`);
                users.rows.forEach(u => {
                    console.log(`      - User: ${u.username}`);
                    console.log(`        Email: ${u.email}`);
                    console.log(`        Pass: (Reset to 'password123' if unknown)`);
                });
            } else {
                console.log(`   ⚠️ No Admins found for this hospital.`);
            }
        }
        console.log(`\n--------------------------------------------------`);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

listCredentials();
