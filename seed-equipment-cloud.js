/**
 * Seed Equipment Types to cloud - Fixed schema
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
    console.log('🌱 Seeding Equipment Types with correct schema...\n');

    try {
        const equipment = [
            { name: 'Wheelchair', category: 'Mobility', description: 'Standard folding wheelchair', unit: 'per day', rate: 200 },
            { name: 'Stretcher', category: 'Mobility', description: 'Patient transport stretcher', unit: 'per use', rate: 100 },
            { name: 'Walker', category: 'Mobility', description: 'Folding walker for patient mobility', unit: 'per day', rate: 150 },
            { name: 'Oxygen Cylinder', category: 'Respiratory', description: 'Portable oxygen cylinder', unit: 'per day', rate: 500 },
            { name: 'Oxygen Concentrator', category: 'Respiratory', description: 'Electric oxygen concentrator', unit: 'per day', rate: 800 },
            { name: 'Nebulizer', category: 'Respiratory', description: 'Portable nebulizer machine', unit: 'per use', rate: 100 },
            { name: 'Suction Machine', category: 'Respiratory', description: 'Portable suction apparatus', unit: 'per day', rate: 400 },
            { name: 'ECG Machine', category: 'Cardiac', description: '12-lead ECG machine', unit: 'per use', rate: 300 },
            { name: 'Defibrillator', category: 'Cardiac', description: 'AED defibrillator', unit: 'per use', rate: 500 },
            { name: 'Pulse Oximeter', category: 'Monitoring', description: 'Fingertip pulse oximeter', unit: 'per day', rate: 50 },
            { name: 'BP Monitor', category: 'Monitoring', description: 'Digital blood pressure monitor', unit: 'per use', rate: 50 },
            { name: 'Thermometer Digital', category: 'Monitoring', description: 'Digital thermometer', unit: 'per use', rate: 20 },
            { name: 'Glucometer', category: 'Monitoring', description: 'Blood glucose monitor', unit: 'per test', rate: 50 },
            { name: 'Infusion Pump', category: 'IV Equipment', description: 'Electronic infusion pump', unit: 'per day', rate: 600 },
            { name: 'Syringe Pump', category: 'IV Equipment', description: 'Precision syringe driver', unit: 'per day', rate: 500 },
            { name: 'IV Stand', category: 'IV Equipment', description: 'Adjustable IV pole stand', unit: 'per day', rate: 50 },
            { name: 'Patient Monitor', category: 'ICU', description: 'Multi-parameter patient monitor', unit: 'per day', rate: 2000 },
            { name: 'Ventilator', category: 'ICU', description: 'Mechanical ventilator', unit: 'per day', rate: 5000 },
            { name: 'CPAP Machine', category: 'ICU', description: 'CPAP/BiPAP machine', unit: 'per day', rate: 1500 },
            { name: 'Hospital Bed Electric', category: 'Beds', description: 'Electric adjustable bed', unit: 'per day', rate: 1000 }
        ];

        for (const e of equipment) {
            await execSql(`
                INSERT INTO equipment_types (name, category, description, unit, daily_rate, is_active)
                VALUES ('${e.name}', '${e.category}', '${e.description}', '${e.unit}', ${e.rate}, true)
                ON CONFLICT DO NOTHING
            `);
        }
        console.log(`✅ ${equipment.length} equipment types seeded`);

        // Verify counts
        const count = await execSql("SELECT COUNT(*) as cnt FROM equipment_types");
        console.log('📊 Total equipment types:', count.rows?.[0]?.cnt || 0);

        console.log('\n🎉 Done!');

    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

seed();
