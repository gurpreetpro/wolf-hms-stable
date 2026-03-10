const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../config/db');

async function fixOTSchema() {
    console.log('🔧 Fixing OT Schema...\n');
    
    try {
        // 1. Drop legacy tables if they exist
        console.log('1. Cleaning up legacy tables...');
        await pool.query('DROP TABLE IF EXISTS surgery_checklists CASCADE');
        await pool.query('DROP TABLE IF EXISTS surgeries CASCADE');
        await pool.query('DROP TABLE IF EXISTS ot_rooms CASCADE');
        await pool.query('DROP TABLE IF EXISTS theaters CASCADE'); // From old migration
        console.log('   ✅ Legacy tables dropped\n');

        // 2. Create ot_rooms table with hospital_id
        console.log('2. Creating ot_rooms table...');
        await pool.query(`
            CREATE TABLE ot_rooms (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                type VARCHAR(50) DEFAULT 'General',
                status VARCHAR(50) DEFAULT 'Available',
                equipment JSONB DEFAULT '{}',
                hospital_id INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ ot_rooms table created\n');

        // 3. Create surgeries table with hospital_id
        console.log('3. Creating surgeries table...');
        await pool.query(`
            CREATE TABLE surgeries (
                id SERIAL PRIMARY KEY,
                patient_id INTEGER,
                doctor_id VARCHAR(255),
                ot_room_id INTEGER REFERENCES ot_rooms(id),
                procedure_name VARCHAR(255) NOT NULL,
                priority VARCHAR(50) DEFAULT 'Scheduled',
                status VARCHAR(50) DEFAULT 'Scheduled',
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP NOT NULL,
                notes TEXT,
                hospital_id INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ surgeries table created\n');

        // 4. Create surgery_checklists table
        console.log('4. Creating surgery_checklists table...');
        await pool.query(`
            CREATE TABLE surgery_checklists (
                id SERIAL PRIMARY KEY,
                surgery_id INTEGER REFERENCES surgeries(id),
                stage VARCHAR(50) NOT NULL,
                checklist_data JSONB NOT NULL DEFAULT '{}',
                completed_by VARCHAR(255),
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                hospital_id INTEGER DEFAULT 1,
                UNIQUE(surgery_id, stage)
            )
        `);
        console.log('   ✅ surgery_checklists table created\n');

        // 5. Seed default OT rooms
        console.log('5. Seeding default OT rooms...');
        await pool.query(`
            INSERT INTO ot_rooms (name, type, status, hospital_id) VALUES
            ('OT-1 (General)', 'Major', 'Available', 1),
            ('OT-2 (Ortho)', 'Major', 'Available', 1),
            ('OT-3 (Minor)', 'Minor', 'Available', 1),
            ('OT-4 (Emergency)', 'Emergency', 'Available', 1)
        `);
        console.log('   ✅ 4 OT rooms seeded\n');

        // Verify
        const rooms = await pool.query('SELECT COUNT(*) FROM ot_rooms');
        console.log(`✅ OT Schema Fix Complete! ${rooms.rows[0].count} rooms available.\n`);

    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
    } finally {
        pool.end();
    }
}

fixOTSchema();
