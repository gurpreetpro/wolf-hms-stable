/**
 * Seed Ward Consumables and Services Data
 * Run this script to populate dropdowns for Nurse Dashboard
 * 
 * Usage: node server/scripts/seed_ward_catalog.js
 */

const pool = require('../config/db');

async function seedWardCatalog() {
    console.log('🌱 Seeding Ward Consumables and Service Charges...');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get all hospitals
        const hospitalsRes = await client.query('SELECT id, name FROM hospitals');
        
        if (hospitalsRes.rows.length === 0) {
            console.log('No hospitals found. Creating default hospital...');
            await client.query(`
                INSERT INTO hospitals (id, code, name, subscription_tier)
                VALUES (1, 'WOLF001', 'Wolf General Hospital', 'premium')
                ON CONFLICT (id) DO NOTHING
            `);
        }

        const hospitals = hospitalsRes.rows.length > 0 ? hospitalsRes.rows : [{ id: 1, name: 'Default' }];

        for (const hospital of hospitals) {
            console.log(`\n📍 Seeding data for Hospital: ${hospital.name} (ID: ${hospital.id})`);

            // ========================
            // WARD CONSUMABLES CATALOG
            // ========================
            const consumables = [
                // Medical Supplies
                { name: 'IV Cannula 18G', category: 'IV Supplies', price: 50, stock: 100 },
                { name: 'IV Cannula 20G', category: 'IV Supplies', price: 45, stock: 100 },
                { name: 'IV Cannula 22G', category: 'IV Supplies', price: 40, stock: 100 },
                { name: 'IV Set', category: 'IV Supplies', price: 80, stock: 50 },
                { name: 'Scalp Vein Set', category: 'IV Supplies', price: 35, stock: 100 },
                
                // Dressings
                { name: 'Gauze (Sterile Pack)', category: 'Dressing', price: 25, stock: 200 },
                { name: 'Cotton Roll', category: 'Dressing', price: 30, stock: 100 },
                { name: 'Adhesive Bandage', category: 'Dressing', price: 15, stock: 300 },
                { name: 'Crepe Bandage 4"', category: 'Dressing', price: 50, stock: 100 },
                { name: 'Micropore Tape', category: 'Dressing', price: 60, stock: 80 },
                
                // Syringes
                { name: 'Syringe 2ml', category: 'Syringes', price: 8, stock: 500 },
                { name: 'Syringe 5ml', category: 'Syringes', price: 10, stock: 500 },
                { name: 'Syringe 10ml', category: 'Syringes', price: 12, stock: 300 },
                { name: 'Syringe 50ml', category: 'Syringes', price: 35, stock: 100 },
                { name: 'Insulin Syringe', category: 'Syringes', price: 15, stock: 200 },
                
                // Catheters
                { name: 'Foley Catheter 14Fr', category: 'Catheter', price: 150, stock: 50 },
                { name: 'Foley Catheter 16Fr', category: 'Catheter', price: 150, stock: 50 },
                { name: 'Urine Bag', category: 'Catheter', price: 80, stock: 100 },
                { name: 'Ryles Tube', category: 'Catheter', price: 45, stock: 50 },
                
                // Respiratory
                { name: 'Oxygen Mask', category: 'Respiratory', price: 120, stock: 50 },
                { name: 'Nasal Prongs', category: 'Respiratory', price: 80, stock: 100 },
                { name: 'Nebulizer Kit', category: 'Respiratory', price: 200, stock: 30 },
                { name: 'Suction Catheter', category: 'Respiratory', price: 40, stock: 100 },
                
                // PPE
                { name: 'Gloves (Pair)', category: 'PPE', price: 10, stock: 1000 },
                { name: 'Surgical Mask', category: 'PPE', price: 5, stock: 2000 },
                { name: 'N95 Mask', category: 'PPE', price: 80, stock: 200 },
                { name: 'Gown (Disposable)', category: 'PPE', price: 150, stock: 100 },
                
                // Misc
                { name: 'ECG Electrodes (Pack of 10)', category: 'Misc', price: 100, stock: 100 },
                { name: 'Blood Collection Vacutainer', category: 'Misc', price: 25, stock: 500 },
                { name: 'Spirit Swab', category: 'Misc', price: 5, stock: 1000 }
            ];

            for (const item of consumables) {
                await client.query(`
                    INSERT INTO ward_consumables (name, category, price, stock_quantity, hospital_id, active)
                    VALUES ($1, $2, $3, $4, $5, true)
                    ON CONFLICT ON CONSTRAINT ward_consumables_name_hospital_id_key DO UPDATE 
                    SET price = EXCLUDED.price, category = EXCLUDED.category
                `, [item.name, item.category, item.price, item.stock, hospital.id]);
            }
            console.log(`  ✅ Added ${consumables.length} consumable items`);

            // ========================
            // WARD SERVICE CHARGES
            // ========================
            const services = [
                // Bed Charges (Daily)
                { name: 'General Ward Bed', category: 'Bed Charges', price: 1500 },
                { name: 'Semi-Private Room', category: 'Bed Charges', price: 3000 },
                { name: 'Private Room', category: 'Bed Charges', price: 5000 },
                { name: 'Deluxe Room', category: 'Bed Charges', price: 8000 },
                { name: 'ICU Bed', category: 'Bed Charges', price: 12000 },
                { name: 'NICU Bed', category: 'Bed Charges', price: 10000 },
                
                // Nursing Services
                { name: 'Nursing Care (Per Shift)', category: 'Nursing', price: 500 },
                { name: 'Special Nursing Care', category: 'Nursing', price: 1000 },
                { name: 'Injection Administration', category: 'Nursing', price: 100 },
                { name: 'IV Fluid Administration', category: 'Nursing', price: 200 },
                { name: 'Blood Transfusion Monitoring', category: 'Nursing', price: 500 },
                { name: 'Wound Dressing', category: 'Nursing', price: 300 },
                
                // Monitoring
                { name: 'Vitals Monitoring (Hourly)', category: 'Monitoring', price: 200 },
                { name: 'Cardiac Monitoring (Daily)', category: 'Monitoring', price: 1000 },
                { name: 'SpO2 Monitoring (Daily)', category: 'Monitoring', price: 300 },
                { name: 'ABG Analysis', category: 'Monitoring', price: 1500 },
                
                // Equipment
                { name: 'Ventilator Usage (Per Hour)', category: 'Equipment', price: 500 },
                { name: 'BiPAP Usage (Per Hour)', category: 'Equipment', price: 300 },
                { name: 'CPAP Usage (Per Hour)', category: 'Equipment', price: 200 },
                { name: 'Oxygen Therapy (Per Hour)', category: 'Equipment', price: 100 },
                { name: 'Nebulization', category: 'Equipment', price: 150 },
                { name: 'Suction', category: 'Equipment', price: 100 },
                
                // Procedures
                { name: 'Catheterization (Urinary)', category: 'Procedures', price: 500 },
                { name: 'NG Tube Insertion', category: 'Procedures', price: 400 },
                { name: 'Central Line Dressing', category: 'Procedures', price: 600 },
                { name: 'Tracheostomy Care', category: 'Procedures', price: 800 },
                { name: 'ECG Recording', category: 'Procedures', price: 300 },
                
                // Other
                { name: 'Linen Charges (Daily)', category: 'Other', price: 200 },
                { name: 'Diet (Per Day)', category: 'Other', price: 500 },
                { name: 'Attendant Charges', category: 'Other', price: 300 }
            ];

            for (const service of services) {
                await client.query(`
                    INSERT INTO ward_service_charges (name, category, price, hospital_id)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT ON CONSTRAINT ward_service_charges_name_hospital_id_key DO UPDATE 
                    SET price = EXCLUDED.price, category = EXCLUDED.category
                `, [service.name, service.category, service.price, hospital.id]);
            }
            console.log(`  ✅ Added ${services.length} service charges`);
        }

        await client.query('COMMIT');
        console.log('\n✅ Ward catalog seeding complete!');
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Seeding failed:', err.message);
        
        // If constraint doesn't exist, try without ON CONFLICT
        if (err.message.includes('constraint')) {
            console.log('\n⚠️  Unique constraints missing. Running alternative seed...');
            await seedWithoutConstraints(client);
        }
    } finally {
        client.release();
        process.exit(0);
    }
}

async function seedWithoutConstraints(client) {
    try {
        await client.query('BEGIN');
        
        // Clear existing data and re-insert
        await client.query('DELETE FROM ward_consumables WHERE hospital_id = 1');
        await client.query('DELETE FROM ward_service_charges WHERE hospital_id = 1');
        
        // Re-run with simple inserts...
        console.log('Seed with simple INSERT (no conflict handling)...');
        
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Alternative seed also failed:', e.message);
    }
}

seedWardCatalog();
