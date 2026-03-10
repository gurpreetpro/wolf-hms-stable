/**
 * Wolf HMS - Hospital Configuration Report
 * =========================================
 * Shows all hospitals and their URL/subdomain configuration.
 * 
 * Usage: node show_hospitals.js
 */

const pool = require('./config/db');

async function showHospitals() {
    console.log('🏥 Wolf HMS - Hospital Configuration');
    console.log('=====================================\n');

    try {
        // Get all hospitals
        const hospitals = await pool.query(`
            SELECT 
                id, 
                name, 
                code, 
                subdomain,
                status,
                address,
                phone,
                email,
                created_at
            FROM hospitals 
            ORDER BY id
        `);

        if (hospitals.rows.length === 0) {
            console.log('❌ No hospitals found in database.');
            process.exit(0);
        }

        console.log('📋 Registered Hospitals:\n');
        console.log('┌─────┬──────────────────────────┬──────────┬─────────────────────────┬──────────┐');
        console.log('│ ID  │ Name                     │ Code     │ Subdomain               │ Status   │');
        console.log('├─────┼──────────────────────────┼──────────┼─────────────────────────┼──────────┤');
        
        hospitals.rows.forEach(h => {
            const id = String(h.id).padEnd(3);
            const name = (h.name || '').substring(0, 24).padEnd(24);
            const code = (h.code || '').substring(0, 8).padEnd(8);
            const subdomain = (h.subdomain || 'N/A').substring(0, 23).padEnd(23);
            const status = (h.status || 'unknown').substring(0, 8).padEnd(8);
            console.log(`│ ${id} │ ${name} │ ${code} │ ${subdomain} │ ${status} │`);
        });
        
        console.log('└─────┴──────────────────────────┴──────────┴─────────────────────────┴──────────┘');

        // Get user counts per hospital
        console.log('\n📊 Users per Hospital:\n');
        const userCounts = await pool.query(`
            SELECT 
                h.id as hospital_id,
                h.name as hospital_name,
                COUNT(u.id) as user_count
            FROM hospitals h
            LEFT JOIN users u ON u.hospital_id = h.id
            GROUP BY h.id, h.name
            ORDER BY h.id
        `);

        userCounts.rows.forEach(r => {
            console.log(`   Hospital ${r.hospital_id} (${r.hospital_name}): ${r.user_count} users`);
        });

        // Get patient counts per hospital
        console.log('\n👥 Patients per Hospital:\n');
        const patientCounts = await pool.query(`
            SELECT 
                h.id as hospital_id,
                h.name as hospital_name,
                COUNT(p.id) as patient_count,
                COUNT(CASE WHEN p.name LIKE 'Test_%' THEN 1 END) as demo_patients
            FROM hospitals h
            LEFT JOIN patients p ON p.hospital_id = h.id
            GROUP BY h.id, h.name
            ORDER BY h.id
        `);

        patientCounts.rows.forEach(r => {
            console.log(`   Hospital ${r.hospital_id} (${r.hospital_name}): ${r.patient_count} patients (${r.demo_patients} demo)`);
        });

        // Show recommended URL mapping
        console.log('\n🔗 Recommended URL Mapping:\n');
        hospitals.rows.forEach(h => {
            const subdomain = h.code || h.subdomain || 'default';
            console.log(`   ${h.name}:`);
            console.log(`      → https://${subdomain}.wolfhms.com`);
            console.log(`      → DNS A Record: ${subdomain}.wolfhms.com → [YOUR_CLOUD_RUN_IP]`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }

    process.exit(0);
}

showHospitals();
