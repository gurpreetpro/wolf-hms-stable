const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: 'Hospital456!',
    port: 5432
});

async function createBedTables() {
    try {
        // Wards Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS wards (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                type VARCHAR(50) NOT NULL, -- General, ICU, Private, etc.
                capacity INT DEFAULT 0,
                description TEXT
            );
        `);
        console.log('✅ Created wards table');

        // Beds Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS beds (
                id SERIAL PRIMARY KEY,
                ward_id INT REFERENCES wards(id) ON DELETE CASCADE,
                bed_number VARCHAR(20) NOT NULL,
                status VARCHAR(20) DEFAULT 'Available' CHECK (status IN ('Available', 'Occupied', 'Maintenance')),
                UNIQUE(ward_id, bed_number)
            );
        `);
        console.log('✅ Created beds table');

        // Seed Data
        await pool.query(`
            INSERT INTO wards (name, type, capacity, description) VALUES
            ('General Ward Male', 'General', 20, 'General ward for male patients'),
            ('General Ward Female', 'General', 20, 'General ward for female patients'),
            ('ICU', 'ICU', 10, 'Intensive Care Unit'),
            ('Private Rooms', 'Private', 10, 'Private AC Rooms')
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✅ Seeded wards');

        // Seed Beds for ICU (Example)
        const icuRes = await pool.query("SELECT id FROM wards WHERE name = 'ICU'");
        if (icuRes.rows.length > 0) {
            const icuId = icuRes.rows[0].id;
            for (let i = 1; i <= 5; i++) {
                await pool.query(`
                    INSERT INTO beds (ward_id, bed_number, status) 
                    VALUES ($1, $2, 'Available')
                    ON CONFLICT (ward_id, bed_number) DO NOTHING
                `, [icuId, `ICU-${i}`]);
            }
            console.log('✅ Seeded ICU beds');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

createBedTables();
