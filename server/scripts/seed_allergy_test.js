const pool = require('./config/db');

async function seed() {
    try {
        console.log('Seeding Allergy Test Data...');

        // 0. Get a Valid User ID (Pharmacist)
        const userRes = await pool.query("SELECT id FROM users WHERE role = 'pharmacist' LIMIT 1");
        const userId = userRes.rows[0]?.id || 1; // Fallback to 1 if no pharmacist (admin)

        // 1. Ensure Paracetamol exists
        let itemRes = await pool.query("SELECT * FROM inventory_items WHERE name = 'Paracetamol'");
        if (itemRes.rows.length === 0) {
            await pool.query("INSERT INTO inventory_items (name, category, price_per_unit, stock_quantity) VALUES ('Paracetamol', 'Analgesic', 5.00, 100)");
        }

        // 2. Create Allergy Patient
        const patientRes = await pool.query(`
            INSERT INTO patients (name, history_json) 
            VALUES ('Allergy Test Patient ' || floor(random() * 1000), '{"allergies": ["Paracetamol"]}')
            RETURNING id
        `);
        const patientId = patientRes.rows[0].id;

        // 3. Create Prescription Task
        await pool.query(`
            INSERT INTO care_tasks (patient_id, type, description, status, doctor_id)
            VALUES ($1, 'Medication', 'Paracetamol - 500mg - TDS', 'Pending', $2)
        `, [patientId, userId]);

        console.log('✅ Seeded Patient with Paracetamol Allergy & Prescription');
        process.exit();
    } catch (err) {
        console.error('SEED ERROR:', err.message, err.detail);
        process.exit(1);
    }
}

seed();
