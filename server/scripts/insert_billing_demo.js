/**
 * Direct SQL Insert via exec-sql endpoint
 * Uses the server's existing debug SQL endpoint
 * Run with: node scripts/insert_billing_demo.js
 */

const http = require('http');

const API_BASE = 'http://localhost:8080';
const SETUP_KEY = 'WolfSetup2024!';

function execSQL(sql) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ sql });
        const options = {
            method: 'POST',
            hostname: 'localhost',
            port: 8080,
            path: '/api/health/exec-sql',
            headers: {
                'Content-Type': 'application/json',
                'X-Wolf-Admin-Key': SETUP_KEY,
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function main() {
    console.log('🏥 Inserting Billing Demo Data via exec-sql...\n');

    const demoData = [
        { name: "Rahul Sharma (Billing Demo)", phone: "9988200001", days: 3 },
        { name: "Priya Singh (Billing Demo)", phone: "9988200002", days: 5 },
        { name: "Amit Kumar (Billing Demo)", phone: "9988200003", days: 2 },
        { name: "Sunita Devi (Billing Demo)", phone: "9988200004", days: 7 }
    ];

    for (const p of demoData) {
        const rate = 1500;
        const total = rate * p.days;
        
        // Combined SQL to insert patient, admission, invoice, and invoice_item
        const sql = `
            WITH new_patient AS (
                INSERT INTO patients (name, phone, gender, dob, hospital_id)
                VALUES ('${p.name}', '${p.phone}', 'M', '1985-01-01', 1)
                RETURNING id
            ),
            new_admission AS (
                INSERT INTO admissions (patient_id, ward, bed_number, status, admission_date, hospital_id)
                SELECT id, 'General Ward', 'Demo-${p.phone.slice(-2)}', 'Discharged', NOW() - INTERVAL '${p.days} days', 1
                FROM new_patient
                RETURNING id, patient_id
            ),
            new_invoice AS (
                INSERT INTO invoices (patient_id, admission_id, total_amount, amount_paid, status, generated_by, hospital_id, generated_at)
                SELECT patient_id, id, ${total}, 0, 'Pending', 1, 1, NOW()
                FROM new_admission
                RETURNING id
            )
            INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price, hospital_id)
            SELECT id, 'General Ward Bed Charges (${p.days} days)', ${p.days}, ${rate}, ${total}, 1
            FROM new_invoice
            RETURNING 'Created invoice for ${p.name}' as result;
        `;

        try {
            const res = await execSQL(sql);
            if (res.status === 200) {
                console.log(`✅ ${p.name}: ₹${total} (${p.days} days)`);
            } else {
                console.log(`❌ ${p.name}: ${JSON.stringify(res.data)}`);
            }
        } catch (err) {
            console.log(`❌ ${p.name}: ${err.message}`);
        }
    }

    console.log('\n🎉 Done! Refresh the billing dashboard.');
}

main();
