const path = require('path');
const dotenv = require('dotenv');
// Load .env from server root (one level up from scripts)
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = require('../config/db');
const bcrypt = require('bcryptjs'); // Switched to bcrypt per package.json

const createTestGuard = async () => {
    try {
        console.log('Connecting to DB:', process.env.DB_HOST);
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        // 1. Create or Update User
        const userRes = await pool.query(
            `INSERT INTO users (username, password, role, email)
             VALUES ($1, $2, 'security_guard', 'guard1@wolfsecurity.com')
             ON CONFLICT (email) DO UPDATE 
             SET password = $2
             RETURNING id, username, role`,
            ['Guard One', hashedPassword]
        );
        
        console.log('✅ User Created/Updated:', userRes.rows[0]);
        console.log('User ID:', userRes.rows[0].id);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed:', err);
        process.exit(1);
    }
};

createTestGuard();
