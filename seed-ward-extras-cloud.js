/**
 * Seed Consumables, Charges, and Equipment data to cloud
 * For Ward Incharge Dashboard
 */
const axios = require('axios');
const CLOUD_URL = 'https://wolfhms-fdurncganq-el.a.run.app';

async function execSql(query) {
    try {
        const res = await axios.post(`${CLOUD_URL}/api/health/exec-sql`, { 
            sql: query,
            setupKey: 'WolfSetup2024!'
        });
        return res.data;
    } catch (e) {
        console.error('SQL Error:', e.response?.data || e.message);
        return { error: e.message };
    }
}

async function seed() {
    console.log('🌱 Seeding Consumables, Charges & Equipment...\n');

    try {
        // 1. WARD CONSUMABLES
        console.log('📌 Seeding Ward Consumables...');
        const consumables = [
            { name: 'Surgical Gloves (Pair)', category: 'Disposables', price: 15, stock: 500 },
            { name: 'Syringes 5ml', category: 'Disposables', price: 8, stock: 1000 },
            { name: 'Syringes 10ml', category: 'Disposables', price: 12, stock: 800 },
            { name: 'IV Cannula 20G', category: 'IV Supplies', price: 45, stock: 200 },
            { name: 'IV Cannula 22G', category: 'IV Supplies', price: 42, stock: 200 },
            { name: 'Normal Saline 500ml', category: 'IV Fluids', price: 65, stock: 150 },
            { name: 'Dextrose 5% 500ml', category: 'IV Fluids', price: 70, stock: 100 },
            { name: 'Ringer Lactate 500ml', category: 'IV Fluids', price: 75, stock: 120 },
            { name: 'Cotton Roll 500g', category: 'Dressings', price: 120, stock: 50 },
            { name: 'Bandage Crepe 4inch', category: 'Dressings', price: 35, stock: 100 },
            { name: 'Gauze Pad Sterile', category: 'Dressings', price: 25, stock: 300 },
            { name: 'Surgical Tape', category: 'Dressings', price: 40, stock: 80 },
            { name: 'Betadine Solution 100ml', category: 'Antiseptics', price: 95, stock: 60 },
            { name: 'Spirit 500ml', category: 'Antiseptics', price: 85, stock: 40 },
            { name: 'Hand Sanitizer 500ml', category: 'Antiseptics', price: 150, stock: 100 },
            { name: 'Face Mask N95', category: 'PPE', price: 50, stock: 500 },
            { name: 'Face Mask Surgical', category: 'PPE', price: 10, stock: 1000 },
            { name: 'Disposable Gown', category: 'PPE', price: 120, stock: 200 },
            { name: 'Oxygen Mask Adult', category: 'Respiratory', price: 85, stock: 50 },
            { name: 'Nasal Cannula', category: 'Respiratory', price: 45, stock: 100 }
        ];

        for (const c of consumables) {
            await execSql(`
                INSERT INTO ward_consumables (name, category, price, stock_quantity, hospital_id, active)
                VALUES ('${c.name}', '${c.category}', ${c.price}, ${c.stock}, 1, true)
                ON CONFLICT DO NOTHING
            `);
        }
        console.log(`  ✅ ${consumables.length} consumables seeded`);

        // 2. WARD SERVICE CHARGES
        console.log('\n📌 Seeding Ward Service Charges...');
        const charges = [
            { name: 'General Ward Bed Charges (per day)', category: 'Bed Charges', price: 1500 },
            { name: 'ICU Bed Charges (per day)', category: 'Bed Charges', price: 8000 },
            { name: 'Private Room Charges (per day)', category: 'Bed Charges', price: 4500 },
            { name: 'Maternity Ward (per day)', category: 'Bed Charges', price: 3500 },
            { name: 'Pediatric Ward (per day)', category: 'Bed Charges', price: 2000 },
            { name: 'Nursing Charges (per day)', category: 'Nursing', price: 500 },
            { name: 'Special Nursing Care', category: 'Nursing', price: 1200 },
            { name: 'IV Administration', category: 'Procedures', price: 200 },
            { name: 'Catheterization', category: 'Procedures', price: 350 },
            { name: 'Dressing Change', category: 'Procedures', price: 150 },
            { name: 'Nebulization', category: 'Procedures', price: 100 },
            { name: 'Oxygen Therapy (per hour)', category: 'Respiratory', price: 250 },
            { name: 'Ventilator Charges (per hour)', category: 'Respiratory', price: 1500 },
            { name: 'ECG Monitoring', category: 'Monitoring', price: 300 },
            { name: 'Pulse Oximetry', category: 'Monitoring', price: 150 },
            { name: 'Blood Pressure Monitoring', category: 'Monitoring', price: 100 },
            { name: 'Diet - Regular', category: 'Diet', price: 350 },
            { name: 'Diet - Diabetic', category: 'Diet', price: 400 },
            { name: 'Diet - Liquid', category: 'Diet', price: 250 },
            { name: 'Attendant Bed Charges', category: 'Miscellaneous', price: 300 }
        ];

        for (const c of charges) {
            await execSql(`
                INSERT INTO ward_service_charges (name, category, price, hospital_id, active)
                VALUES ('${c.name}', '${c.category}', ${c.price}, 1, true)
                ON CONFLICT DO NOTHING
            `);
        }
        console.log(`  ✅ ${charges.length} service charges seeded`);

        // 3. EQUIPMENT TYPES
        console.log('\n📌 Seeding Equipment Types...');
        const equipment = [
            { name: 'Wheelchair', category: 'Mobility', description: 'Standard folding wheelchair' },
            { name: 'Stretcher', category: 'Mobility', description: 'Patient transport stretcher' },
            { name: 'Walker', category: 'Mobility', description: 'Folding walker for patient mobility' },
            { name: 'Oxygen Cylinder', category: 'Respiratory', description: 'Portable oxygen cylinder' },
            { name: 'Oxygen Concentrator', category: 'Respiratory', description: 'Electric oxygen concentrator' },
            { name: 'Nebulizer', category: 'Respiratory', description: 'Portable nebulizer machine' },
            { name: 'Suction Machine', category: 'Respiratory', description: 'Portable suction apparatus' },
            { name: 'ECG Machine', category: 'Cardiac', description: '12-lead ECG machine' },
            { name: 'Defibrillator', category: 'Cardiac', description: 'AED defibrillator' },
            { name: 'Pulse Oximeter', category: 'Monitoring', description: 'Fingertip pulse oximeter' },
            { name: 'BP Monitor', category: 'Monitoring', description: 'Digital blood pressure monitor' },
            { name: 'Thermometer Digital', category: 'Monitoring', description: 'Digital thermometer' },
            { name: 'Glucometer', category: 'Monitoring', description: 'Blood glucose monitor' },
            { name: 'Infusion Pump', category: 'IV Equipment', description: 'Electronic infusion pump' },
            { name: 'Syringe Pump', category: 'IV Equipment', description: 'Precision syringe driver' },
            { name: 'IV Stand', category: 'IV Equipment', description: 'Adjustable IV pole stand' },
            { name: 'Patient Monitor', category: 'ICU', description: 'Multi-parameter patient monitor' },
            { name: 'Ventilator', category: 'ICU', description: 'Mechanical ventilator' },
            { name: 'CPAP Machine', category: 'ICU', description: 'CPAP/BiPAP machine' },
            { name: 'Hospital Bed Electric', category: 'Beds', description: 'Electric adjustable bed' }
        ];

        for (const e of equipment) {
            await execSql(`
                INSERT INTO equipment_types (name, category, description, hospital_id, is_active)
                VALUES ('${e.name}', '${e.category}', '${e.description}', 1, true)
                ON CONFLICT DO NOTHING
            `);
        }
        console.log(`  ✅ ${equipment.length} equipment types seeded`);

        // 4. Seed some equipment inventory items
        console.log('\n📌 Seeding Equipment Inventory...');
        // Get first few equipment type IDs
        const eqTypes = await execSql("SELECT id, name FROM equipment_types LIMIT 5");
        if (eqTypes.rows && eqTypes.rows.length > 0) {
            for (const eq of eqTypes.rows) {
                for (let i = 1; i <= 3; i++) {
                    await execSql(`
                        INSERT INTO equipment_inventory (equipment_type_id, serial_number, status, location, hospital_id)
                        VALUES (${eq.id}, '${eq.name.substring(0,3).toUpperCase()}-00${i}', 'Available', 'General Ward A', 1)
                        ON CONFLICT DO NOTHING
                    `);
                }
            }
            console.log('  ✅ Equipment inventory items created');
        }

        // Final counts
        console.log('\n📊 Final Counts:');
        const consCount = await execSql("SELECT COUNT(*) as cnt FROM ward_consumables WHERE hospital_id = 1");
        console.log('  Consumables:', consCount.rows?.[0]?.cnt || 0);
        const chargeCount = await execSql("SELECT COUNT(*) as cnt FROM ward_service_charges WHERE hospital_id = 1");
        console.log('  Service Charges:', chargeCount.rows?.[0]?.cnt || 0);
        const eqCount = await execSql("SELECT COUNT(*) as cnt FROM equipment_types WHERE hospital_id = 1");
        console.log('  Equipment Types:', eqCount.rows?.[0]?.cnt || 0);

        console.log('\n🎉 Done!');

    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

seed();
