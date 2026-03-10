/**
 * Seed OT Users Script
 * Run this to create/update users with access to OT Module
 */

const bcrypt = require('bcryptjs');
const { pool } = require('./db');

async function seedOTUsers() {
    console.log('🔧 Seeding OT/Surgical Users...\n');

    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const users = [
        { username: 'admin', email: 'admin@wolfhms.com', role: 'admin', department: 'Administration' },
        { username: 'surgeon', email: 'surgeon@wolfhms.com', role: 'doctor', department: 'Surgery' },
        { username: 'ot_nurse', email: 'ot_nurse@wolfhms.com', role: 'nurse', department: 'Operation Theatre' },
        { username: 'anaesthetist', email: 'anaes@wolfhms.com', role: 'anaesthetist', department: 'Anaesthesiology' },
    ];

    for (const user of users) {
        try {
            // Upsert logic
            const result = await pool.query(`
                INSERT INTO users (username, password, email, role, department)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (username) DO UPDATE SET password = $2
                RETURNING id, username, role
            `, [user.username, hashedPassword, user.email, user.role, user.department]);

            console.log(`✅ User '${result.rows[0].username}' ready (Role: ${result.rows[0].role})`);
        } catch (err) {
            // Try simpler upsert if department column doesn't exist
            try {
                const result = await pool.query(`
                    INSERT INTO users (username, password, email, role)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (username) DO UPDATE SET password = $2
                    RETURNING id, username, role
                `, [user.username, hashedPassword, user.email, user.role]);

                console.log(`✅ User '${result.rows[0].username}' ready (Role: ${result.rows[0].role})`);
            } catch (err2) {
                console.error(`❌ Failed for ${user.username}:`, err2.message);
            }
        }
    }

    console.log('\n✨ OT Users Seeded! Password for all: password123');
    console.log('\n📋 Login Credentials:');
    console.log('   - admin / password123 (Full Access)');
    console.log('   - surgeon / password123 (OT Access)');
    console.log('   - ot_nurse / password123 (OT Access)');
    console.log('   - anaesthetist / password123 (Anaesthesia Access)');

    await pool.end();
}

seedOTUsers().catch(console.error);
