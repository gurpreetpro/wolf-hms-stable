// Fix doctors and add wards for Dr. Parveen Hospital
require('dotenv').config();
const { pool } = require('./db');
const bcrypt = require('bcryptjs');

async function fixDrParveen() {
    console.log('Fixing Dr. Parveen Hospital...\n');
    const hospitalId = 3;

    try {
        // 1. Add/Fix Doctors
        console.log('1. Adding doctors...');
        const hashedPassword = await bcrypt.hash('doctor123', 10);
        
        const doctors = [
            { username: 'dr_parveen_gupta', name: 'Dr. Parveen Gupta', email: 'parveen@guptahospital.in' },
            { username: 'dr_rajni_garg', name: 'Dr. Rajni Garg', email: 'rajni@guptahospital.in' },
            { username: 'dr_raminder_sharma', name: 'Dr. Raminder Sharma', email: 'raminder@guptahospital.in' }
        ];

        for (const doc of doctors) {
            // First delete if exists
            await pool.query('DELETE FROM users WHERE username = $1', [doc.username]);
            
            // Then insert fresh
            await pool.query(`
                INSERT INTO users (username, name, email, password, role, hospital_id, is_active)
                VALUES ($1, $2, $3, $4, 'doctor', $5, true)
            `, [doc.username, doc.name, doc.email, hashedPassword, hospitalId]);
            console.log('   ✅ ' + doc.name);
        }

        // 2. Add wards
        console.log('\n2. Adding wards...');
        await pool.query('DELETE FROM wards WHERE hospital_id = $1', [hospitalId]);
        
        const wards = [
            ['General Ward 1', 4, 2000],
            ['General Ward 2', 5, 2000],
            ['General Ward 3', 8, 2000],
            ['Semi Deluxe', 2, 3000],
            ['Deluxe', 4, 4000],
            ['Super Deluxe', 2, 5000],
            ['ICU', 4, 6500],
            ['ICU with Ventilator', 2, 7500]
        ];

        for (const [name, beds, rate] of wards) {
            await pool.query(`
                INSERT INTO wards (name, total_beds, occupied_beds, daily_rate, hospital_id)
                VALUES ($1, $2, 0, $3, $4)
            `, [name, beds, rate, hospitalId]);
            console.log(`   ✅ ${name}: ${beds} beds @ ₹${rate}/day`);
        }

        // 3. Add settings
        console.log('\n3. Adding settings...');
        await pool.query('DELETE FROM hospital_settings WHERE hospital_id = $1', [hospitalId]);
        
        const settings = [
            ['24hr_normal_charge', '2000'],
            ['24hr_icu_charge', '6500'],
            ['24hr_ventilator_charge', '7500'],
            ['oxygen_charge', '2300'],
            ['semi_deluxe_rent', '3000'],
            ['deluxe_rent', '4000'],
            ['super_deluxe_rent', '5000'],
            ['hospital_name', 'Dr. Parveen Gupta Multispeciality Hospital']
        ];

        for (const [key, value] of settings) {
            await pool.query(`
                INSERT INTO hospital_settings (key, value, hospital_id) VALUES ($1, $2, $3)
            `, [key, value, hospitalId]);
        }
        console.log('   ✅ 8 settings added');

        // Verify
        console.log('\n--- VERIFICATION ---');
        const h = await pool.query("SELECT name, address, phone FROM hospitals WHERE id=$1", [hospitalId]);
        console.log('Hospital:', h.rows[0]);
        
        const docs = await pool.query("SELECT name FROM users WHERE hospital_id=$1 AND role='doctor'", [hospitalId]);
        console.log('Doctors:', docs.rows.length);
        docs.rows.forEach(d => console.log('  - ' + d.name));

        const w = await pool.query("SELECT name, total_beds, daily_rate FROM wards WHERE hospital_id=$1 ORDER BY daily_rate", [hospitalId]);
        console.log('Wards:', w.rows.length);
        w.rows.forEach(x => console.log(`  - ${x.name}: ${x.total_beds} beds @ ₹${x.daily_rate}`));

        console.log('\n✅ Configuration complete!');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

fixDrParveen();
