const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

const dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
};

async function testQuery() {
    const pool = new Pool(dbConfig);
    try {
        console.log('Inserting mock blood_request to diagnose error...');
        const result = await pool.query(
            `INSERT INTO blood_requests (
                patient_id, patient_blood_group, requested_by, department, blood_group_required, component_type_id, units_required, status, hospital_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [
                '0c22c541-870d-4e6c-a6a6-387e4b9a8991', // patient_id UUID
                'A+',
                1, // requested_by
                'Surgical Department',
                'A+',
                2, // component_type_id
                1, // units_required
                'Pending',
                1
            ]
        );
        console.log('Result:', result.rows);
    } catch (e) {
        console.error('💥 SQL Error:', e.message);
        console.error('Full Error Object:', e);
    } finally {
        await pool.end();
    }
}

testQuery();
