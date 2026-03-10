const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function createAdmin() {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await pool.query(`
            INSERT INTO users (username, password, role, email, full_name, department)
            VALUES ($1, $2, 'security_manager', 'admin@wolfsecurity.in', 'Dispatch Admin', 'Security')
            ON CONFLICT (username) 
            DO UPDATE SET role = 'security_manager', password = $2
        `, ['dispatch_admin', hashedPassword]);

        console.log('✅ Admin User "dispatch_admin" created/updated.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed:', err);
        process.exit(1);
    }
}

createAdmin();
