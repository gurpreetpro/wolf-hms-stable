// Final complete configuration for Dr. Parveen Hospital
require('dotenv').config();
const { pool } = require('./db');

async function fullConfigure() {
    console.log('='.repeat(50));
    console.log('CONFIGURING DR. PARVEEN HOSPITAL');
    console.log('='.repeat(50));
    const hospitalId = 3;

    try {
        // First, check wards table schema
        console.log('\n1. Checking wards table columns...');
        const wardCols = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'wards' ORDER BY ordinal_position
        `);
        console.log('   Columns:', wardCols.rows.map(c => c.column_name).join(', '));

        // Insert wards with only existing columns
        console.log('\n2. Adding wards...');
        await pool.query('DELETE FROM wards WHERE hospital_id = $1', [hospitalId]);
        
        const wardColumns = wardCols.rows.map(c => c.column_name);
        
        // Build INSERT based on available columns
        if (wardColumns.includes('daily_rate')) {
            const wards = [
                ['General Ward 1', 4, 0, 2000.00],
                ['General Ward 2', 5, 0, 2000.00],
                ['General Ward 3', 8, 0, 2000.00],
                ['Semi Deluxe', 2, 0, 3000.00],
                ['Deluxe', 4, 0, 4000.00],
                ['Super Deluxe', 2, 0, 5000.00],
                ['ICU', 4, 0, 6500.00],
                ['ICU with Ventilator', 2, 0, 7500.00]
            ];
            for (const [name, beds, occ, rate] of wards) {
                await pool.query(`
                    INSERT INTO wards (name, total_beds, occupied_beds, daily_rate, hospital_id)
                    VALUES ($1, $2, $3, $4, $5)
                `, [name, beds, occ, rate, hospitalId]);
                console.log(`   ✅ ${name}`);
            }
        } else {
            // No daily_rate column - use simpler insert
            const wards = [
                ['General Ward 1', 4],
                ['General Ward 2', 5],
                ['General Ward 3', 8],
                ['Semi Deluxe', 2],
                ['Deluxe', 4],
                ['Super Deluxe', 2],
                ['ICU', 4],
                ['ICU with Ventilator', 2]
            ];
            for (const [name, beds] of wards) {
                await pool.query(`
                    INSERT INTO wards (name, total_beds, occupied_beds, hospital_id)
                    VALUES ($1, $2, 0, $3)
                `, [name, beds, hospitalId]);
                console.log(`   ✅ ${name}`);
            }
        }

        // Add settings
        console.log('\n3. Adding settings...');
        await pool.query('DELETE FROM hospital_settings WHERE hospital_id = $1', [hospitalId]);
        
        const settings = [
            ['24hr_normal_charge', '2000'],
            ['24hr_icu_charge', '6500'],
            ['24hr_ventilator_charge', '7500'],
            ['oxygen_charge', '2300'],
            ['general_ward_rent', '2000'],
            ['semi_deluxe_rent', '3000'],
            ['deluxe_rent', '4000'],
            ['super_deluxe_rent', '5000'],
            ['semi_deluxe_doctor_visit_super', '800'],
            ['semi_deluxe_doctor_visit_specialist', '700'],
            ['deluxe_doctor_visit_super', '900'],
            ['deluxe_doctor_visit_specialist', '800'],
            ['super_deluxe_doctor_visit_super', '1100'],
            ['super_deluxe_doctor_visit_specialist', '1000'],
            ['hospital_name', 'Dr. Parveen Gupta Multispeciality Hospital'],
            ['hospital_timings', '9:30 AM - 10:30 PM (Mon-Sat)']
        ];
        
        for (const [key, value] of settings) {
            await pool.query(`
                INSERT INTO hospital_settings (key, value, hospital_id) VALUES ($1, $2, $3)
            `, [key, value, hospitalId]);
        }
        console.log(`   ✅ ${settings.length} settings added`);

        // Final verification
        console.log('\n' + '='.repeat(50));
        console.log('VERIFICATION');
        console.log('='.repeat(50));
        
        const h = await pool.query('SELECT name, address, phone FROM hospitals WHERE id = $1', [hospitalId]);
        console.log('\nHospital:', h.rows[0]);
        
        const wCount = await pool.query('SELECT COUNT(*) as count FROM wards WHERE hospital_id = $1', [hospitalId]);
        console.log('Wards:', wCount.rows[0].count);
        
        const sCount = await pool.query('SELECT COUNT(*) as count FROM hospital_settings WHERE hospital_id = $1', [hospitalId]);
        console.log('Settings:', sCount.rows[0].count);

        console.log('\n✅ Configuration complete!');

    } catch (err) {
        console.error('Error:', err.message);
        console.error(err.stack);
    } finally {
        await pool.end();
    }
}

fullConfigure();
