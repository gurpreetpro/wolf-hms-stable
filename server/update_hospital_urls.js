/**
 * Wolf HMS - Update Hospital Subdomains
 * ======================================
 * Maps each hospital to its designated URL subdomain.
 * 
 * Usage: node update_hospital_urls.js
 */

const pool = require('./config/db');

// URL MAPPING CONFIGURATION
// Based on user's DNS records (wolfsecurity.in)
const HOSPITAL_URL_MAPPING = [
    {
        id: 1,
        name: 'Taneja Hospital',
        code: 'taneja',
        subdomain: 'taneja',  // taneja.wolfsecurity.in
        full_url: 'https://taneja.wolfsecurity.in'
    },
    {
        id: 2,
        name: 'Kokila Hospital',
        code: 'kokila',
        subdomain: 'kokila',  // kokila.wolfsecurity.in
        full_url: 'https://kokila.wolfsecurity.in'
    },
    {
        id: 3,
        name: 'Dr. Parveen Clinic',
        code: 'drparveen',
        subdomain: 'drparveen',  // drparveen.wolfsecurity.in
        full_url: 'https://drparveen.wolfsecurity.in'
    }
];

async function updateHospitalUrls() {
    console.log('🏥 Wolf HMS - Hospital URL Mapping Update');
    console.log('==========================================\n');

    try {
        // Show current state
        console.log('📊 Current Configuration:\n');
        const current = await pool.query('SELECT id, name, code, subdomain FROM hospitals ORDER BY id');
        console.table(current.rows);

        console.log('\n🔄 Applying URL Mapping...\n');

        for (const hospital of HOSPITAL_URL_MAPPING) {
            const result = await pool.query(`
                UPDATE hospitals 
                SET subdomain = $1, updated_at = NOW()
                WHERE id = $2
                RETURNING id, name, subdomain
            `, [hospital.subdomain, hospital.id]);

            if (result.rows.length > 0) {
                console.log(`   ✅ ${hospital.name}: subdomain set to "${hospital.subdomain}"`);
            } else {
                console.log(`   ⚠️  Hospital ID ${hospital.id} not found`);
            }
        }

        // Show updated state
        console.log('\n📋 Updated Configuration:\n');
        const updated = await pool.query('SELECT id, name, code, subdomain FROM hospitals ORDER BY id');
        console.table(updated.rows);

        console.log('\n🔗 URL Mapping Summary:');
        console.log('┌─────────────────────────┬────────────────────────────────────┐');
        console.log('│ Hospital                │ URL                                │');
        console.log('├─────────────────────────┼────────────────────────────────────┤');
        for (const h of HOSPITAL_URL_MAPPING) {
            console.log(`│ ${h.name.padEnd(23)} │ ${h.full_url.padEnd(34)} │`);
        }
        console.log('└─────────────────────────┴────────────────────────────────────┘');

        console.log('\n✅ Hospital URL mapping complete!');
        console.log('\n⚠️  IMPORTANT: Ensure your DNS A records point to Cloud Run:');
        console.log('   - taneja.wolfsecurity.in    → 199.36.158.100 (or Cloud Run IP)');
        console.log('   - kokila.wolfsecurity.in    → 199.36.158.100');
        console.log('   - drparveen.wolfsecurity.in → 199.36.158.100');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }

    process.exit(0);
}

updateHospitalUrls();
