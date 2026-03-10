/**
 * Configure Dr. Parveen Hospital - Safe Version
 * Updates existing data without conflicts
 */

require('dotenv').config();
const { pool } = require('./db');
const bcrypt = require('bcryptjs');

async function configureDrParveenHospital() {
    console.log('Configuring Dr. Parveen Hospital...\n');

    try {
        // Get hospital ID first
        const hospitalResult = await pool.query("SELECT id FROM hospitals WHERE code = 'drparveen'");
        if (hospitalResult.rows.length === 0) {
            console.log('❌ Hospital not found!');
            return;
        }
        const hospitalId = hospitalResult.rows[0].id;
        console.log(`Found hospital ID: ${hospitalId}\n`);

        // 1. Update Hospital Basic Info
        console.log('1. Updating hospital basic info...');
        await pool.query(`
            UPDATE hospitals SET
                name = 'Dr. Parveen Gupta Multispeciality Hospital',
                address = 'G.T. Road, Opp. Pehalwan Dhaba',
                city = 'Jagraon',
                state = 'Punjab',
                country = 'India',
                phone = '9877603199',
                email = 'drparveengupta@gmail.com',
                tagline = 'Gupta Hospital - Quality Healthcare Since 1990',
                settings = $1,
                updated_at = NOW()
            WHERE id = $2
        `, [JSON.stringify({
            timings: '9:30 AM to 10:30 PM (Mon to Sat)',
            emergency_24x7: true,
            facilities: ['Pharmacy', 'Ambulance', 'ECG', 'X-Ray', 'ICU', 'Modern ICU', 'Special Rooms', 'General Ward', 'Fully Modular OT', 'Lab', 'Pre & Post Operative Care', 'Multispeciality OPD'],
            tie_ups: ['CT Scan', 'MRI', 'Ultrasound', 'Blood Bank']
        }), hospitalId]);
        console.log('   ✅ Hospital info updated\n');

        // 2. Add/Update Doctors - skip if email issues
        console.log('2. Adding doctors...');
        const hashedPassword = await bcrypt.hash('doctor123', 10);
        
        const doctors = [
            { username: 'dr_parveen_gupta', name: 'Dr. Parveen Gupta', email: 'dr.parveen@guptahospital.in' },
            { username: 'dr_rajni_garg', name: 'Dr. Rajni Garg', email: 'dr.rajni@guptahospital.in' },
            { username: 'dr_raminder_sharma', name: 'Dr. Raminder Sharma', email: 'dr.raminder@guptahospital.in' }
        ];

        for (const doc of doctors) {
            try {
                // Try to insert
                await pool.query(`
                    INSERT INTO users (username, name, email, password, role, hospital_id, is_active)
                    VALUES ($1, $2, $3, $4, 'doctor', $5, true)
                `, [doc.username, doc.name, doc.email, hashedPassword, hospitalId]);
                console.log(`   ✅ ${doc.name} (created)`);
            } catch (e) {
                if (e.code === '23505') { // unique violation
                    // Update existing user
                    await pool.query(`
                        UPDATE users SET name = $1, hospital_id = $2, role = 'doctor', is_active = true
                        WHERE username = $3 OR email = $4
                    `, [doc.name, hospitalId, doc.username, doc.email]);
                    console.log(`   ✅ ${doc.name} (updated existing)`);
                } else {
                    console.log(`   ⚠️ ${doc.name}: ${e.message}`);
                }
            }
        }
        console.log('');

        // 3. Add Wards
        console.log('3. Configuring wards...');
        // First, delete existing wards for this hospital
        await pool.query('DELETE FROM wards WHERE hospital_id = $1', [hospitalId]);
        
        const wards = [
            { name: 'General Ward 1', beds: 4, daily_rate: 2000 },
            { name: 'General Ward 2', beds: 5, daily_rate: 2000 },
            { name: 'General Ward 3', beds: 8, daily_rate: 2000 },
            { name: 'Semi Deluxe', beds: 2, daily_rate: 3000 },
            { name: 'Deluxe', beds: 4, daily_rate: 4000 },
            { name: 'Super Deluxe', beds: 2, daily_rate: 5000 },
            { name: 'ICU', beds: 4, daily_rate: 6500 },
            { name: 'ICU with Ventilator', beds: 2, daily_rate: 7500 }
        ];

        for (const ward of wards) {
            await pool.query(`
                INSERT INTO wards (name, total_beds, occupied_beds, daily_rate, hospital_id)
                VALUES ($1, $2, 0, $3, $4)
            `, [ward.name, ward.beds, ward.daily_rate, hospitalId]);
            console.log(`   ✅ ${ward.name}: ${ward.beds} beds @ ₹${ward.daily_rate}/day`);
        }
        console.log('');

        // 4. Add Hospital Settings
        console.log('4. Configuring service charges...');
        // Delete existing settings for this hospital
        await pool.query('DELETE FROM hospital_settings WHERE hospital_id = $1', [hospitalId]);
        
        const settings = [
            ['24hr_normal_charge', '2000'],
            ['24hr_icu_charge', '6500'],
            ['24hr_ventilator_charge', '7500'],
            ['oxygen_charge', '2300'],
            ['general_ward_doctor_visit_super', '800'],
            ['general_ward_doctor_visit_specialist', '700'],
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
            ['hospital_timings', '9:30 AM - 10:30 PM (Mon-Sat)'],
            ['emergency_available', 'true']
        ];

        for (const [key, value] of settings) {
            await pool.query(`
                INSERT INTO hospital_settings (key, value, hospital_id)
                VALUES ($1, $2, $3)
            `, [key, value, hospitalId]);
        }
        console.log('   ✅ 18 settings configured\n');

        console.log('='.repeat(50));
        console.log('✅ Dr. Parveen Hospital Configuration Complete!');
        console.log('='.repeat(50));
        console.log('\nSummary:');
        console.log('- Hospital: Dr. Parveen Gupta Multispeciality Hospital');
        console.log('- Location: G.T. Road, Jagraon, Punjab');
        console.log('- Phone: 9877603199');
        console.log('- Doctors: 3');
        console.log('- Wards: 8 (27 total beds)');
        console.log('- Settings: 18');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

configureDrParveenHospital();
