const pool = require('./config/db');
const bcrypt = require('bcryptjs');

const seedUsers = async () => {
    try {
        const password = 'password123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        console.log(`🔒 Generated Hash for '${password}': ${hashedPassword}`);

        const users = [
            { username: 'admin_user', role: 'admin', email: 'admin@hms.com' },
            { username: 'doctor_user', role: 'doctor', email: 'doctor@hms.com' },
            { username: 'nurse_user', role: 'nurse', email: 'nurse@hms.com' },
            { username: 'receptionist_user', role: 'receptionist', email: 'receptionist@hms.com' },
            { username: 'lab_tech_user', role: 'lab_tech', email: 'lab@hms.com' },
            { username: 'pharmacist_user', role: 'pharmacist', email: 'pharmacy@hms.com' },
            { username: 'anaesthetist_user', role: 'anaesthetist', email: 'anaesthetist@hms.com' }
        ];

        for (const user of users) {
            // Upsert user
            await pool.query(`
                INSERT INTO users (username, password, email, role)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (username) 
                DO UPDATE SET password = $2;
            `, [user.username, hashedPassword, user.email, user.role]);

            console.log(`✅ User updated: ${user.username}`);
        }

        console.log('🎉 All users seeded with password: password123');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding users:', err);
        process.exit(1);
    }
};

seedUsers();
