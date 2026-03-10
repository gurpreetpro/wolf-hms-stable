
require('dotenv').config();
const pool = require('./config/db');

async function test() {
    const testPatientId = '90f399ee-64cd-4954-9f1f-e5c247ab32cf';
    try {
        console.log('--- RUNNING CORRECTED QUERY ---');
        console.log(`Patient ID: ${testPatientId}`);
        
        const result = await pool.query(`
            SELECT 
                p.id,
                p.amount,
                p.payment_mode,
                p.reference_number as transaction_id,
                p.status,
                p.received_at as created_at,
                v.token_number,
                v.visit_date
            FROM payments p
            LEFT JOIN opd_visits v ON p.visit_id = v.id
            WHERE p.patient_id = $1
            ORDER BY p.received_at DESC
        `, [testPatientId]);
        
        console.log(`SUCCESS! Returned ${result.rows.length} rows`);
        if (result.rows.length > 0) {
            console.log('Sample row:', JSON.stringify(result.rows[0], null, 2));
        }
    } catch (err) {
        console.log('QUERY FAILED:');
        console.log(' - Error Message:', err.message);
        console.log(' - Error Code:', err.code);
    } finally {
        pool.end();
    }
}

test();
