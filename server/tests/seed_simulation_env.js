const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function seed() {
    try {
        console.log('🌱 Seeding Simulation Environment...');

        // 1. Users
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('password123', salt);
        const users = [
            { u: 'admin_user', r: 'admin' },
            { u: 'doctor_user', r: 'doctor' },
            { u: 'nurse_user', r: 'nurse' },
            { u: 'receptionist_user', r: 'receptionist' },
            { u: 'pharmacist_user', r: 'pharmacist' },
            { u: 'lab_tech_user', r: 'lab_tech' },
            { u: 'anaesthetist_user', r: 'anaesthetist' }
        ];

        for (const user of users) {
            await pool.query(
                `INSERT INTO users (username, password, email, role) 
                 VALUES ($1, $2, $3, $4) 
                 ON CONFLICT (username) DO NOTHING`,
                [user.u, hash, `${user.u}@hms.com`, user.r]
            );
        }
        console.log('✅ Users seeded');

        // 2. Wards & Beds
        // Check if Ward exists
        let wardRes = await pool.query("SELECT id FROM wards WHERE name = 'ICU'");
        let wardId;
        if (wardRes.rows.length === 0) {
            wardRes = await pool.query("INSERT INTO wards (name, type, capacity) VALUES ('ICU', 'ICU', 10) RETURNING id");
        }
        wardId = wardRes.rows[0].id;

        // Ensure Beds exist
        const beds = ['A-01', 'A-02', 'ICU-1'];
        for (const b of beds) {
            await pool.query(
                `INSERT INTO beds (ward_id, bed_number, status) 
                 VALUES ($1, $2, 'Available') 
                 ON CONFLICT DO NOTHING`,
                [wardId, b] // Note: constraint might not exist, but duplicates usually okay or ignored if no unique constraint on bed_number
            );
            // reset status
            await pool.query("UPDATE beds SET status = 'Available' WHERE bed_number = $1", [b]);
        }
        console.log('✅ Wards & Beds seeded');

        // 3. Inventory
        await pool.query(
            `INSERT INTO inventory_items (name, stock_quantity, price_per_unit, expiry_date) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (name) DO UPDATE SET stock_quantity = $2`,
            ['Paracetamol 500mg', 1000, 2.00, '2026-12-31']
        );
        console.log('✅ Inventory seeded');

        // 4. Lab Tests
        await pool.query(
            `INSERT INTO lab_test_types (name, price, normal_range) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (name) DO NOTHING`,
            ['CBC', 50.00, 'Hemoglobin: 13-17']
        );
        console.log('✅ Lab Tests seeded');

    } catch (err) {
        console.error('❌ User Seed Failed:', err);
    } finally {
        pool.end();
    }
}

seed();
