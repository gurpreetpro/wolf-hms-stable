const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CLOUD_URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app';
const SECRET = 'WolfHMS_Migration_Secret_2026';

const OT_ROOMS_SCHEMA = `
CREATE TABLE IF NOT EXISTS ot_rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Available',
    equipment JSONB DEFAULT '{}',
    hospital_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

async function fixOtRooms() {
    console.log('=== FIXING OT_ROOMS & SYNCING ===\n');
    
    try {
        // 1. Check/Create ot_rooms
        console.log('1. Checking ot_rooms table...');
        await axios.post(`${CLOUD_URL}/api/sync/sql`, {
            secret: SECRET,
            sql: OT_ROOMS_SCHEMA
        });
        console.log('   ✅ ot_rooms table ensured (Created/Exists)');

        // 2. Truncate ot_rooms to be safe
        console.log('2. Truncating ot_rooms...');
        try {
            await axios.post(`${CLOUD_URL}/api/sync/sql`, {
                secret: SECRET,
                sql: `TRUNCATE TABLE ot_rooms RESTART IDENTITY CASCADE;`
            });
            console.log('   ✅ Truncated ot_rooms');
        } catch (e) {
            console.log('   ⚠️ Truncate warning:', e.message);
        }

    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) console.error('Response:', err.response.data);
    }
}

fixOtRooms();
