const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function main() {
    try {
        console.log('Connecting to database...');
        
        console.log('\n--- Wards and Beds ---');
        const beds = await pool.query('SELECT b.*, w.name as ward_name FROM beds b LEFT JOIN wards w ON b.ward_id = w.id LIMIT 5');
        console.log(beds.rows);

        console.log('\n--- Ward Consumables ---');
        const consumables = await pool.query('SELECT * FROM ward_consumables LIMIT 5');
        console.log(consumables.rows);

        console.log('\n--- Ward Service Charges ---');
        const services = await pool.query('SELECT * FROM ward_service_charges LIMIT 5');
        console.log(services.rows);

        console.log('\n--- Blood Component Types ---');
        const bloodComps = await pool.query('SELECT * FROM blood_component_types LIMIT 5');
        console.log(bloodComps.rows);

        console.log('\n--- Users ---');
        const users = await pool.query('SELECT id, username, role FROM users LIMIT 10');
        console.log(users.rows);

    } catch (e) {
        console.error('Error executing query:', e.message);
    } finally {
        await pool.end();
    }
}

main();
