// Temporary script to seed cloud database
const { Pool } = require('pg');

const pool = new Pool({
    host: '34.93.195.4',
    user: 'postgres',
    password: '3d0e1afd',
    database: 'hospital_db',
    port: 5432,
    ssl: { rejectUnauthorized: false }
});

async function seedCloudDB() {
    console.log('🌱 Seeding Cloud Database...\n');
    
    try {
        // 1. Create lab categories if they don't exist
        const categories = [
            'Haematology', 'Biochemistry', 'Microbiology', 'Serology', 
            'Endocrinology', 'Radiology', 'Cardiology', 'Parasitology', 'Histopathology'
        ];
        
        for (const cat of categories) {
            await pool.query(
                'INSERT INTO lab_test_categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
                [cat]
            );
        }
        console.log('✅ Lab categories seeded');
        
        // 2. Seed lab test types
        const labTests = [
            { name: 'Complete Blood Count (CBC)', category: 'Haematology', price: 350 },
            { name: 'Liver Function Test (LFT)', category: 'Biochemistry', price: 850 },
            { name: 'Kidney Function Test (RFT)', category: 'Biochemistry', price: 600 },
            { name: 'Lipid Profile', category: 'Biochemistry', price: 800 },
            { name: 'Thyroid Profile (T3, T4, TSH)', category: 'Endocrinology', price: 700 },
            { name: 'HbA1c', category: 'Biochemistry', price: 550 },
            { name: 'Blood Sugar Fasting', category: 'Biochemistry', price: 80 },
            { name: 'Blood Sugar PP', category: 'Biochemistry', price: 80 },
            { name: 'Urine Routine', category: 'Microbiology', price: 150 },
            { name: 'Stool Routine', category: 'Microbiology', price: 150 },
            { name: 'Chest X-Ray', category: 'Radiology', price: 400 },
            { name: 'ECG', category: 'Cardiology', price: 300 },
            { name: 'Uric Acid', category: 'Biochemistry', price: 250 },
            { name: 'Serum Creatinine', category: 'Biochemistry', price: 200 },
            { name: 'ESR', category: 'Haematology', price: 100 },
            { name: 'PT INR', category: 'Haematology', price: 450 },
            { name: 'Vitamin D', category: 'Biochemistry', price: 1200 },
            { name: 'Vitamin B12', category: 'Biochemistry', price: 900 },
            { name: 'Dengue NS1', category: 'Serology', price: 800 },
            { name: 'Malaria Antigen', category: 'Parasitology', price: 400 },
            { name: 'Troponin I', category: 'Cardiology', price: 1500 },
            { name: 'HIV 1&2 Antibody', category: 'Serology', price: 350 },
            { name: 'HBsAg (Hepatitis B)', category: 'Serology', price: 400 },
            { name: 'Anti-HCV (Hepatitis C)', category: 'Serology', price: 600 },
            { name: 'CRP (C-Reactive Protein)', category: 'Biochemistry', price: 500 },
            { name: 'Procalcitonin', category: 'Biochemistry', price: 1800 },
            { name: 'D-Dimer', category: 'Haematology', price: 1200 },
            { name: 'Blood Group & Rh', category: 'Haematology', price: 200 },
            { name: 'Platelet Count', category: 'Haematology', price: 100 },
            { name: 'Hemoglobin', category: 'Haematology', price: 80 }
        ];
        
        for (const test of labTests) {
            const catRes = await pool.query('SELECT id FROM lab_test_categories WHERE name = $1', [test.category]);
            const categoryId = catRes.rows[0]?.id || null;
            
            await pool.query(
                `INSERT INTO lab_test_types (name, category_id, price, hospital_id) 
                 VALUES ($1, $2, $3, 2) 
                 ON CONFLICT DO NOTHING`,
                [test.name, categoryId, test.price]
            );
        }
        console.log('✅ Lab test types seeded:', labTests.length);
        
        // 3. Seed pharmacy inventory
        const medicines = [
            { name: 'Paracetamol 500mg', generic: 'Acetaminophen', category: 'Analgesic', price: 2, stock: 1000 },
            { name: 'Paracetamol 650mg', generic: 'Acetaminophen', category: 'Analgesic', price: 3, stock: 800 },
            { name: 'Dolo 650', generic: 'Paracetamol', category: 'Analgesic', price: 3.5, stock: 500 },
            { name: 'Crocin 500mg', generic: 'Paracetamol', category: 'Analgesic', price: 2.5, stock: 600 },
            { name: 'Ibuprofen 400mg', generic: 'Ibuprofen', category: 'NSAID', price: 4, stock: 500 },
            { name: 'Brufen 400', generic: 'Ibuprofen', category: 'NSAID', price: 5, stock: 400 },
            { name: 'Amoxicillin 500mg', generic: 'Amoxicillin', category: 'Antibiotic', price: 8, stock: 300 },
            { name: 'Augmentin 625mg', generic: 'Amoxicillin+Clavulanate', category: 'Antibiotic', price: 25, stock: 200 },
            { name: 'Azithromycin 500mg', generic: 'Azithromycin', category: 'Antibiotic', price: 45, stock: 200 },
            { name: 'Zithromax 250mg', generic: 'Azithromycin', category: 'Antibiotic', price: 40, stock: 150 },
            { name: 'Ciprofloxacin 500mg', generic: 'Ciprofloxacin', category: 'Antibiotic', price: 12, stock: 300 },
            { name: 'Metformin 500mg', generic: 'Metformin', category: 'Antidiabetic', price: 3, stock: 800 },
            { name: 'Glimepiride 2mg', generic: 'Glimepiride', category: 'Antidiabetic', price: 4, stock: 500 },
            { name: 'Amlodipine 5mg', generic: 'Amlodipine', category: 'Antihypertensive', price: 5, stock: 600 },
            { name: 'Losartan 50mg', generic: 'Losartan', category: 'Antihypertensive', price: 8, stock: 400 },
            { name: 'Telmisartan 40mg', generic: 'Telmisartan', category: 'Antihypertensive', price: 10, stock: 350 },
            { name: 'Atorvastatin 10mg', generic: 'Atorvastatin', category: 'Statin', price: 6, stock: 500 },
            { name: 'Rosuvastatin 10mg', generic: 'Rosuvastatin', category: 'Statin', price: 12, stock: 300 },
            { name: 'Omeprazole 20mg', generic: 'Omeprazole', category: 'PPI', price: 4, stock: 700 },
            { name: 'Pantoprazole 40mg', generic: 'Pantoprazole', category: 'PPI', price: 5, stock: 600 },
            { name: 'Ranitidine 150mg', generic: 'Ranitidine', category: 'H2 Blocker', price: 3, stock: 400 },
            { name: 'Cetirizine 10mg', generic: 'Cetirizine', category: 'Antihistamine', price: 2, stock: 800 },
            { name: 'Montelukast 10mg', generic: 'Montelukast', category: 'Anti-asthmatic', price: 8, stock: 300 },
            { name: 'Salbutamol Inhaler', generic: 'Salbutamol', category: 'Bronchodilator', price: 120, stock: 100 },
            { name: 'Aspirin 75mg', generic: 'Aspirin', category: 'Antiplatelet', price: 2, stock: 500 },
            { name: 'Clopidogrel 75mg', generic: 'Clopidogrel', category: 'Antiplatelet', price: 12, stock: 300 },
            { name: 'Diclofenac 50mg', generic: 'Diclofenac', category: 'NSAID', price: 3, stock: 600 },
            { name: 'Tramadol 50mg', generic: 'Tramadol', category: 'Opioid', price: 8, stock: 200 },
            { name: 'Alprazolam 0.5mg', generic: 'Alprazolam', category: 'Anxiolytic', price: 5, stock: 200 },
            { name: 'Multivitamin Tablet', generic: 'Multivitamin', category: 'Supplement', price: 5, stock: 1000 }
        ];
        
        for (const med of medicines) {
            await pool.query(
                `INSERT INTO inventory_items (name, generic_name, category, price_per_unit, stock_quantity, hospital_id) 
                 VALUES ($1, $2, $3, $4, $5, 2) 
                 ON CONFLICT DO NOTHING`,
                [med.name, med.generic, med.category, med.price, med.stock]
            );
        }
        console.log('✅ Medicines seeded:', medicines.length);
        
        // 4. Verify counts
        const labCount = await pool.query('SELECT COUNT(*) FROM lab_test_types');
        const invCount = await pool.query('SELECT COUNT(*) FROM inventory_items');
        
        console.log('\n📊 Final Counts:');
        console.log('   Lab Test Types:', labCount.rows[0].count);
        console.log('   Inventory Items:', invCount.rows[0].count);
        
        console.log('\n🎉 Cloud Database Seeding Complete!');
        
    } catch (err) {
        console.error('Seeding error:', err.message);
    } finally {
        pool.end();
    }
}

seedCloudDB();
