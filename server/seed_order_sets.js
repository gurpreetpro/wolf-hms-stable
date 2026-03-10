// Seed Order Sets for IPD
const pool = require('./config/db');

async function seed() {
    try {
        console.log('Seeding order_sets...');
        
        // Delete existing
        await pool.query(`DELETE FROM order_sets WHERE name IN ('Sepsis Bundle', 'Post-Op Day 1 Orders', 'Chest Pain Workup', 'DKA Protocol')`);
        
        // Insert Order Sets
        await pool.query(`
            INSERT INTO order_sets (name, category, description, items_json) VALUES
            (
                'Sepsis Bundle',
                'Emergency',
                'Initial sepsis management bundle - 1 hour target',
                '[
                    {"type": "lab", "test_name": "CBC with Differential", "priority": "STAT"},
                    {"type": "lab", "test_name": "Blood Culture x2", "priority": "STAT"},
                    {"type": "lab", "test_name": "Lactate", "priority": "STAT"},
                    {"type": "medication", "drug_name": "Normal Saline", "dosage": "30ml/kg", "frequency": "IV Bolus", "duration": "STAT"},
                    {"type": "medication", "drug_name": "Ceftriaxone", "dosage": "2g", "frequency": "IV", "duration": "Once"},
                    {"type": "instruction", "instruction": "Insert Foley catheter for urine output monitoring"}
                ]'::jsonb
            ),
            (
                'Post-Op Day 1 Orders',
                'Surgery',
                'Standard post-operative care orders',
                '[
                    {"type": "medication", "drug_name": "Paracetamol", "dosage": "1g", "frequency": "Q6H PRN", "duration": "3 days"},
                    {"type": "medication", "drug_name": "Pantoprazole", "dosage": "40mg", "frequency": "OD", "duration": "5 days"},
                    {"type": "instruction", "instruction": "Clear liquids, advance diet as tolerated"},
                    {"type": "instruction", "instruction": "Ambulate TID with assistance"}
                ]'::jsonb
            ),
            (
                'Chest Pain Workup',
                'Cardiology',
                'ACS rule-out protocol',
                '[
                    {"type": "lab", "test_name": "Troponin I", "priority": "STAT"},
                    {"type": "lab", "test_name": "ECG 12-lead", "priority": "STAT"},
                    {"type": "medication", "drug_name": "Aspirin", "dosage": "325mg", "frequency": "STAT", "duration": "Once"},
                    {"type": "instruction", "instruction": "Continuous cardiac monitoring"}
                ]'::jsonb
            ),
            (
                'DKA Protocol',
                'Endocrine',
                'Diabetic Ketoacidosis management',
                '[
                    {"type": "lab", "test_name": "Blood Glucose", "priority": "STAT"},
                    {"type": "lab", "test_name": "ABG", "priority": "STAT"},
                    {"type": "medication", "drug_name": "Regular Insulin", "dosage": "0.1 units/kg/hr", "frequency": "Continuous IV", "duration": "Until resolved"},
                    {"type": "medication", "drug_name": "Normal Saline", "dosage": "1000ml/hr", "frequency": "IV", "duration": "First 2 hours"},
                    {"type": "instruction", "instruction": "Hourly blood glucose monitoring"}
                ]'::jsonb
            )
        `);
        
        // Verify
        const result = await pool.query('SELECT name, category FROM order_sets');
        console.log('\nSeeded order_sets:', result.rows.length, 'rows');
        result.rows.forEach(r => console.log('  -', r.name, '(' + r.category + ')'));
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

seed();
