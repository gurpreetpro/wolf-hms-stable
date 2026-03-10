/**
 * Audit Dr. Parveen Hospital Data - Fixed
 */

require('dotenv').config();
const { pool } = require('./db');

async function auditDrParveenHospital() {
    console.log('='.repeat(60));
    console.log('WOLF HMS - Dr. Parveen Hospital Audit');
    console.log('='.repeat(60));

    try {
        // 1. Hospital Basic Info
        console.log('\n📋 HOSPITAL INFORMATION');
        console.log('-'.repeat(40));
        const hospitalResult = await pool.query(`
            SELECT * FROM hospitals 
            WHERE code = 'drparveen' OR subdomain LIKE '%drparveen%' OR name ILIKE '%parveen%'
        `);
        
        if (hospitalResult.rows.length > 0) {
            const h = hospitalResult.rows[0];
            console.log(`  ID: ${h.id}`);
            console.log(`  Name: ${h.name || h.hospital_name || 'NOT SET'}`);
            console.log(`  Code: ${h.code || 'NOT SET'}`);
            console.log(`  Address: ${h.address || 'NOT SET'}`);
            console.log(`  City: ${h.city || 'NOT SET'}`);
            console.log(`  Phone: ${h.phone || 'NOT SET'}`);
            console.log(`  Email: ${h.email || 'NOT SET'}`);
            console.log(`  Subdomain: ${h.subdomain || 'NOT SET'}`);
            
            const hospitalId = h.id;

            // 2. Doctors/Staff
            console.log('\n👨‍⚕️ DOCTORS');
            console.log('-'.repeat(40));
            const doctorsResult = await pool.query(`
                SELECT id, username, name, email, role 
                FROM users 
                WHERE hospital_id = $1 AND role = 'doctor'
            `, [hospitalId]);
            
            if (doctorsResult.rows.length > 0) {
                doctorsResult.rows.forEach(d => {
                    console.log(`  - ${d.name || d.username} (${d.email || 'no email'})`);
                });
            } else {
                console.log('  ⚠️ No doctors found');
            }

            // 3. All Staff
            console.log('\n👥 ALL STAFF');
            console.log('-'.repeat(40));
            const staffResult = await pool.query(`
                SELECT id, username, name, role 
                FROM users 
                WHERE hospital_id = $1
                ORDER BY role, name
            `, [hospitalId]);
            
            if (staffResult.rows.length > 0) {
                staffResult.rows.forEach(s => {
                    console.log(`  - [${s.role}] ${s.name || s.username}`);
                });
            } else {
                console.log('  ⚠️ No staff found');
            }

            // 4. Wards - check schema first
            console.log('\n🛏️ WARDS');
            console.log('-'.repeat(40));
            try {
                const wardsResult = await pool.query(`
                    SELECT id, name, total_beds, occupied_beds, daily_rate
                    FROM wards 
                    WHERE hospital_id = $1 OR hospital_id IS NULL
                `, [hospitalId]);
                
                if (wardsResult.rows.length > 0) {
                    wardsResult.rows.forEach(w => {
                        console.log(`  - ${w.name}: ${w.total_beds || 0} beds, ₹${w.daily_rate || 0}/day`);
                    });
                } else {
                    console.log('  ⚠️ No wards configured');
                }
            } catch (err) {
                console.log('  ⚠️ Wards table error:', err.message);
            }

            // 5. Hospital Settings
            console.log('\n⚙️ HOSPITAL SETTINGS');
            console.log('-'.repeat(40));
            try {
                const settingsResult = await pool.query(`
                    SELECT key, value FROM hospital_settings 
                    WHERE hospital_id = $1 OR hospital_id IS NULL
                `, [hospitalId]);
                
                if (settingsResult.rows.length > 0) {
                    settingsResult.rows.forEach(s => {
                        console.log(`  - ${s.key}: ${s.value}`);
                    });
                } else {
                    console.log('  ⚠️ No settings configured');
                }
            } catch (err) {
                console.log('  ⚠️ Settings error:', err.message);
            }

        } else {
            console.log('  ❌ Dr. Parveen Hospital NOT FOUND!');
            
            const allHospitals = await pool.query('SELECT id, code, name, subdomain FROM hospitals');
            console.log('\n  Available hospitals:');
            allHospitals.rows.forEach(h => {
                console.log(`    [${h.id}] ${h.name || h.code} - ${h.subdomain || 'no subdomain'}`);
            });
        }

        console.log('\n' + '='.repeat(60));
        console.log('AUDIT COMPLETE');
        console.log('='.repeat(60));

    } catch (err) {
        console.error('Audit Error:', err.message);
    } finally {
        await pool.end();
    }
}

auditDrParveenHospital();
