const { pool } = require('./db');

async function seedPharmacyData() {
    try {
        console.log('Seeding pharmacy test data...\n');
        
        // Get a patient with phone
        const patientResult = await pool.query(`
            SELECT id, name, phone FROM patients WHERE phone IS NOT NULL LIMIT 1
        `);
        
        if (patientResult.rows.length === 0) {
            console.log('No patient found!');
            process.exit(1);
        }
        
        const patient = patientResult.rows[0];
        console.log('Using patient:', patient.name, '| Phone:', patient.phone);
        
        // Get some inventory items
        const items = await pool.query(`
            SELECT id, name, generic_name, price_per_unit, is_controlled
            FROM inventory_items 
            LIMIT 5
        `);
        console.log('Found', items.rows.length, 'inventory items');
        
        // Create dispense logs for this patient
        const dispenseDates = [
            'NOW() - INTERVAL \'2 days\'',
            'NOW() - INTERVAL \'5 days\'',
            'NOW() - INTERVAL \'10 days\''
        ];
        
        const dosageNotes = [
            'Take 1 tablet twice daily after meals',
            'Take 1 tablet at bedtime',
            'Take as needed for pain, maximum 4 tablets per day'
        ];
        
        for (let i = 0; i < Math.min(items.rows.length, 3); i++) {
            const item = items.rows[i];
            
            // Check if already exists
            const existing = await pool.query(`
                SELECT id FROM dispense_logs 
                WHERE patient_id = $1 AND item_id = $2
            `, [patient.id, item.id]);
            
            if (existing.rows.length > 0) {
                console.log(`⏭️ Skipped ${item.name} - already dispensed`);
                continue;
            }
            
            await pool.query(`
                INSERT INTO dispense_logs 
                (item_id, item_name, quantity, patient_id, patient_name, dispensed_by, dispensed_at, notes)
                VALUES ($1, $2, $3, $4, $5, 1, ${dispenseDates[i]}, $6)
            `, [
                item.id,
                item.name,
                (i + 1) * 10, // 10, 20, 30 qty
                patient.id,
                patient.name,
                dosageNotes[i]
            ]);
            
            console.log(`✅ Dispensed: ${item.name} (Qty: ${(i+1)*10})`);
        }
        
        // Verify
        const count = await pool.query('SELECT COUNT(*) FROM dispense_logs WHERE patient_id = $1', [patient.id]);
        console.log('\n✅ Total dispenses for patient:', count.rows[0].count);
        console.log('Phone for patient app:', patient.phone);
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

seedPharmacyData();
