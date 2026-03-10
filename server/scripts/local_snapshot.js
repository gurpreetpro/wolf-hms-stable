const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../config/db');

async function getLocalDataCounts() {
    console.log('=== LOCAL DATABASE SNAPSHOT ===\n');
    
    const tables = [
        'users',
        'hospitals',
        'patients',
        'admissions',
        'appointments',
        'wards',
        'beds',
        'surgeries',
        'ot_rooms',
        'lab_tests',
        'prescriptions',
        'pharmacy_inventory',
        'equipment_types',
        'hospital_settings'
    ];
    
    try {
        console.log('TABLE                    | COUNT');
        console.log('-------------------------|-------');
        
        for (const table of tables) {
            try {
                const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                const count = result.rows[0].count;
                console.log(`${table.padEnd(25)}| ${count}`);
            } catch (err) {
                console.log(`${table.padEnd(25)}| ERROR: ${err.message.split('\n')[0]}`);
            }
        }

        // Get all unique users
        console.log('\n--- USERS BREAKDOWN ---');
        const users = await pool.query(`
            SELECT role, COUNT(*) as count 
            FROM users 
            GROUP BY role 
            ORDER BY count DESC
        `);
        users.rows.forEach(r => console.log(`  ${r.role}: ${r.count}`));

        // Get all unique hospitals
        console.log('\n--- HOSPITALS ---');
        const hospitals = await pool.query('SELECT id, code, name FROM hospitals ORDER BY id');
        hospitals.rows.forEach(h => console.log(`  [${h.id}] ${h.code} - ${h.name}`));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        pool.end();
    }
}

getLocalDataCounts();
