/**
 * Seed Zybio Z3 Driver to Database
 * Run: node scripts/seed_zybio_driver.js
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

// Zybio Z3 CBC Field Mappings
const FIELD_MAPPINGS = {
    wbc: { dbColumn: 'wbc', displayName: 'WBC', unit: '10^9/L' },
    rbc: { dbColumn: 'rbc', displayName: 'RBC', unit: '10^12/L' },
    hemoglobin: { dbColumn: 'hemoglobin', displayName: 'Hemoglobin', unit: 'g/dL' },
    hematocrit: { dbColumn: 'hematocrit', displayName: 'Hematocrit', unit: '%' },
    platelets: { dbColumn: 'platelets', displayName: 'Platelets', unit: '10^9/L' },
    mcv: { dbColumn: 'mcv', displayName: 'MCV', unit: 'fL' },
    mch: { dbColumn: 'mch', displayName: 'MCH', unit: 'pg' },
    mchc: { dbColumn: 'mchc', displayName: 'MCHC', unit: 'g/dL' },
    lymphocyte_percent: { dbColumn: 'lymphocyte_percent', displayName: 'Lymphocyte %', unit: '%' },
    granulocyte_percent: { dbColumn: 'granulocyte_percent', displayName: 'Granulocyte %', unit: '%' },
    crp: { dbColumn: 'crp', displayName: 'CRP', unit: 'mg/L' }
};

// Parser config for Zybio Z3
const PARSER_CONFIG = {
    protocol: 'HL7',
    connection_type: 'TCP_IP',
    default_port: 5000,
    default_mode: 'server',
    driver_file: 'lib/drivers/zybio-z3-driver.js',
    timeout: 30000
};

async function seedZybioDriver() {
    try {
        console.log('🔬 Seeding Zybio Z3 Driver...\n');

        // Check if Zybio Z3 exists (using manufacturer + model as unique key)
        const existing = await pool.query(
            "SELECT id FROM instrument_drivers WHERE manufacturer = 'Zybio' AND model = 'Z3 CRP HS'"
        );

        if (existing.rows.length > 0) {
            // Update existing
            await pool.query(`
                UPDATE instrument_drivers SET
                    category = $1,
                    parser_config = $2,
                    field_mappings = $3,
                    verified = TRUE,
                    is_active = TRUE
                WHERE manufacturer = 'Zybio' AND model = 'Z3 CRP HS'
            `, [
                'Hematology',
                JSON.stringify(PARSER_CONFIG),
                JSON.stringify(FIELD_MAPPINGS)
            ]);
            console.log('✅ Updated existing Zybio Z3 driver');
        } else {
            // Insert new
            await pool.query(`
                INSERT INTO instrument_drivers 
                (manufacturer, model, category, parser_config, field_mappings, verified, is_active)
                VALUES ($1, $2, $3, $4, $5, TRUE, TRUE)
            `, [
                'Zybio',
                'Z3 CRP HS',
                'Hematology',
                JSON.stringify(PARSER_CONFIG),
                JSON.stringify(FIELD_MAPPINGS)
            ]);
            console.log('✅ Inserted new Zybio Z3 driver');
        }

        // Verify
        const result = await pool.query("SELECT * FROM instrument_drivers WHERE manufacturer = 'Zybio'");
        if (result.rows.length > 0) {
            console.log('\n📋 Driver Details:');
            console.log(`   Manufacturer: ${result.rows[0].manufacturer}`);
            console.log(`   Model: ${result.rows[0].model}`);
            console.log(`   Category: ${result.rows[0].category}`);
            console.log(`   Verified: ${result.rows[0].verified}`);
        }
        
        // Show all available drivers
        const allDrivers = await pool.query("SELECT manufacturer, model, category FROM instrument_drivers ORDER BY manufacturer");
        console.log('\n📋 All Available Drivers:');
        allDrivers.rows.forEach((d, i) => {
            console.log(`   ${i+1}. ${d.manufacturer} ${d.model} (${d.category})`);
        });
        
        console.log('\n🎉 Zybio Z3 driver seeded successfully!');
        console.log('\n📌 Next Steps:');
        console.log('   1. Go to Lab Dashboard → Instruments tab');
        console.log('   2. Click + Add Instrument');
        console.log('   3. Select "Zybio Z3 CRP HS" from the driver list');
        console.log('   4. Configure Host/Port and Start Listener');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

seedZybioDriver();
