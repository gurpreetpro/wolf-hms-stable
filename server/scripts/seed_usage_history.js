const pool = require('./config/db');

async function seedHistory() {
    try {
        console.log('Seeding Usage History (Last 30 Days)...');

        // Clean up previous history for demo
        await pool.query("DELETE FROM care_tasks WHERE type = 'Medication' AND status = 'Completed' AND description LIKE '%(Demo)%'");

        // Fetch Valid IDs
        const patientRes = await pool.query("SELECT id FROM patients LIMIT 1");
        if (patientRes.rows.length === 0) {
            console.error("No patients found. Cannot seed.");
            process.exit(1);
        }
        const patientId = patientRes.rows[0].id; // Use real ID
        console.log(`Using Patient ID: ${patientId}`);
        const doctorId = 1;

        // Fetch Item Names
        const pResult = await pool.query("SELECT name FROM inventory_items WHERE name ILIKE '%Paracetamol%' LIMIT 1");
        const aResult = await pool.query("SELECT name FROM inventory_items WHERE name ILIKE '%Amoxicillin%' LIMIT 1");

        if (pResult.rows.length === 0 || aResult.rows.length === 0) {
            console.error("Critical items not found. Cannot seed.");
            process.exit(1);
        }

        const paracetamol = pResult.rows[0].name;
        const amoxicillin = aResult.rows[0].name;

        // Target: Paracetamol ~360, Amoxicillin ~120
        const items = [
            { name: paracetamol, total: 360 },
            { name: amoxicillin, total: 120 }
        ];

        for (const item of items) {
            console.log(`Preparing ${item.total} records for ${item.name}...`);
            let values = [];

            for (let i = 0; i < item.total; i++) {
                const daysAgo = Math.floor(Math.random() * 30);
                const desc = `${item.name} - 1-0-1 (Demo)`;
                // Escape simple quotes if any in name (Paracetamol usually safe)
                // Using template literal for VALUES
                values.push(`(${patientId}, ${doctorId}, 'Medication', '${desc}', 'Completed', NOW() - INTERVAL '${daysAgo} days', NOW() - INTERVAL '${daysAgo} days', 1)`);
            }

            // Bulk Insert in chunks of 50 to stay safe
            const chunkSize = 50;
            for (let i = 0; i < values.length; i += chunkSize) {
                const chunk = values.slice(i, i + chunkSize);
                const query = `
                    INSERT INTO care_tasks (patient_id, doctor_id, type, description, status, created_at, completed_at, completed_by)
                    VALUES ${chunk.join(', ')}
                `;
                await pool.query(query);
            }
        }

        console.log('✅ Usage History Bulk Seeded Successfully');
        // Double Check Count
        const countRes = await pool.query("SELECT COUNT(*) FROM care_tasks WHERE description LIKE '%(Demo)%'");
        console.log("Total Seeded Records:", countRes.rows[0].count);

        process.exit();
    } catch (err) {
        console.error("Seeding Error:", err);
        process.exit(1);
    }
}

seedHistory();
