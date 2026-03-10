const { pool } = require('../db');

async function createEquipmentSchema() {
    console.log('Creating equipment billing schema...\n');

    try {
        // 1. Create equipment_types table
        console.log('1. Creating equipment_types table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS equipment_types (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50),
                rate_per_24hr DECIMAL(10,2) DEFAULT 0,
                billing_type VARCHAR(20) DEFAULT 'duration',
                description TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('   ✅ equipment_types table created');

        // 2. Create equipment_assignments table
        console.log('2. Creating equipment_assignments table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS equipment_assignments (
                id SERIAL PRIMARY KEY,
                admission_id INTEGER,
                patient_id UUID,
                bed_id INTEGER,
                equipment_type_id INTEGER REFERENCES equipment_types(id),
                assigned_by INTEGER,
                assigned_by_role VARCHAR(50),
                assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
                removed_at TIMESTAMP,
                removed_by INTEGER,
                cycles_charged INTEGER DEFAULT 0,
                total_amount DECIMAL(10,2) DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('   ✅ equipment_assignments table created');

        // 3. Create equipment_change_requests table
        console.log('3. Creating equipment_change_requests table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS equipment_change_requests (
                id SERIAL PRIMARY KEY,
                equipment_type_id INTEGER,
                action VARCHAR(20) NOT NULL,
                name VARCHAR(100),
                category VARCHAR(50),
                rate_per_24hr DECIMAL(10,2),
                description TEXT,
                requested_by INTEGER,
                status VARCHAR(20) DEFAULT 'Pending',
                admin_id INTEGER,
                denial_reason TEXT,
                requested_at TIMESTAMP DEFAULT NOW(),
                resolved_at TIMESTAMP
            )
        `);
        console.log('   ✅ equipment_change_requests table created');

        // 4. Create indexes
        console.log('4. Creating indexes...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_equipment_assignments_admission 
            ON equipment_assignments(admission_id)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_equipment_assignments_active 
            ON equipment_assignments(removed_at) WHERE removed_at IS NULL
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_equipment_change_requests_status 
            ON equipment_change_requests(status)
        `);
        console.log('   ✅ Indexes created');

        // 5. Seed 10 common equipment types
        console.log('5. Seeding equipment types...');
        
        const equipmentTypes = [
            { name: 'Ventilator', category: 'Respiratory', rate: 4000, desc: 'Mechanical ventilation support' },
            { name: 'Oxygen Concentrator', category: 'Respiratory', rate: 1200, desc: 'Continuous oxygen delivery' },
            { name: 'BiPAP Machine', category: 'Respiratory', rate: 2500, desc: 'Bilevel positive airway pressure' },
            { name: 'CPAP Machine', category: 'Respiratory', rate: 2000, desc: 'Continuous positive airway pressure' },
            { name: 'Cardiac Monitor', category: 'Monitoring', rate: 800, desc: 'ECG and vital signs monitoring' },
            { name: 'Infusion Pump', category: 'IV/Medication', rate: 400, desc: 'IV fluid and medication delivery' },
            { name: 'Syringe Pump', category: 'IV/Medication', rate: 300, desc: 'Precise medication delivery' },
            { name: 'Nebulizer', category: 'Respiratory', rate: 150, desc: 'Medication inhalation therapy' },
            { name: 'Suction Machine', category: 'Respiratory', rate: 400, desc: 'Airway secretion removal' },
            { name: 'Feeding Pump', category: 'Nutrition', rate: 500, desc: 'Enteral feeding delivery' }
        ];

        for (const eq of equipmentTypes) {
            await pool.query(`
                INSERT INTO equipment_types (name, category, rate_per_24hr, description)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT DO NOTHING
            `, [eq.name, eq.category, eq.rate, eq.desc]);
        }
        console.log('   ✅ 10 equipment types seeded');

        console.log('\n✅ Equipment schema created successfully!');

    } catch (err) {
        console.error('❌ Error:', err.message);
    }

    process.exit();
}

createEquipmentSchema();
