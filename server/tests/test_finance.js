const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: 'Hospital456!',
    port: 5432
});

const API_URL = 'http://localhost:5000/api';
let token = '';

async function runTests() {
    try {
        // 1. Login as Admin
        console.log('1. Logging in as Admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin_user',
            password: 'password123'
        });
        token = loginRes.data.token;
        console.log('✅ Login successful');

        // 2. Insert Test Data (Directly to DB to ensure "Today" and specific values)
        console.log('\n2. Seeding Test Financial Data...');
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Create a dummy invoice for today
            const invRes = await client.query(`
                INSERT INTO invoices (total_amount, status, generated_at) 
                VALUES ($1, $2, CURRENT_DATE) RETURNING id
            `, [1000, 'Pending']);
            const invId = invRes.rows[0].id;

            // Add items
            await client.query(`
                INSERT INTO invoice_items (invoice_id, description, total_price) VALUES 
                ($1, 'Lab Charges - CBC', 200),
                ($1, 'Pharmacy Charges - Meds', 300),
                ($1, 'Room Charges', 500)
            `, [invId]);

            await client.query('COMMIT');
            console.log('✅ Test Data Seeded (Invoice ID: ' + invId + ')');

            // 3. Fetch Stats
            console.log('\n3. Fetching Revenue Stats...');
            const statsRes = await axios.get(`${API_URL}/finance/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const stats = statsRes.data;
            console.log('Stats Received:', stats);

            // 4. Verify
            if (stats.pendingBills >= 1) console.log('✅ Pending Bills Count Verified');
            else throw new Error('Pending Bills Count Mismatch');

            if (stats.totalRevenueToday >= 1000) console.log('✅ Total Revenue Verified');
            else throw new Error('Total Revenue Mismatch');

            if (stats.breakdown['Lab Tests'] >= 200 &&
                stats.breakdown['Pharmacy Sales'] >= 300 &&
                stats.breakdown['OPD Consultations'] >= 500) {
                console.log('✅ Revenue Breakdown Verified');
            } else {
                throw new Error('Breakdown Mismatch');
            }

            // Cleanup
            await pool.query('DELETE FROM invoices WHERE id = $1', [invId]);
            console.log('✅ Cleanup Complete');

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runTests();
