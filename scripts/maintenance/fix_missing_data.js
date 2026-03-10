const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: 'Hospital456!',
    port: 5432,
});

async function fixData() {
    try {
        console.log("Starting Data Fix...");

        // 1. Fix Hospital Settings
        console.log("Seeding Hospital Settings...");
        const settings = {
            'name': 'Kokila Hospital',
            'tagline': 'Care with Compassion',
            'address_line1': '123, Health Enclave',
            'address_line2': 'Sector 62',
            'city': 'Noida',
            'state': 'Uttar Pradesh',
            'pincode': '201301',
            'phone': '+91 9876543210',
            'email': 'contact@kokilahospital.com',
            'website': 'www.kokilahospital.com',
            'logo_url': 'https://cdn-icons-png.flaticon.com/512/3304/3304555.png' // Placeholder professional logo
        };

        for (const [key, value] of Object.entries(settings)) {
            // Default hospital_id 1 or NULL depending on multi-tenant setup. 
            // We'll update for generic (NULL) or specific if needed.
            // Let's assume generic settings for now or try to match existing logic.
            // The controller uses `getHospitalId` which defaults to req.user.hospital_id.
            // We'll insert for hospital_id = 1 (likely default) and NULL (fallback).
            
            await pool.query(`
                INSERT INTO hospital_settings (key, value, hospital_id) 
                VALUES ($1, $2, 1)
                ON CONFLICT (key, hospital_id) DO UPDATE SET value = $2
            `, [key, value]);
        }
        console.log("✅ Hospital Settings Updated.");

        // 2. Fix/Backfill UHIDs
        console.log("Backfilling missing UHIDs...");
        const currentYear = new Date().getFullYear();
        
        // Find patients with missing UHID
        const check = await pool.query("SELECT id, created_at FROM patients WHERE uhid IS NULL ORDER BY created_at ASC");
        
        if (check.rows.length > 0) {
            console.log(`Found ${check.rows.length} patients without UHID. Generating...`);
            
            // Get current max sequence to avoid collision
            const maxRes = await pool.query("SELECT MAX(uhid) as max_uhid FROM patients WHERE uhid LIKE $1", [`%/${currentYear}`]);
            let nextSeq = 1;
            if (maxRes.rows[0].max_uhid) {
                const parts = maxRes.rows[0].max_uhid.split('/');
                if (parts.length === 2) nextSeq = parseInt(parts[0], 10) + 1;
            }

            for (const row of check.rows) {
                const uhid = String(nextSeq).padStart(4, '0') + '/' + currentYear;
                await pool.query("UPDATE patients SET uhid = $1 WHERE id = $2", [uhid, row.id]);
                console.log(`Updated Patient ${row.id} -> ${uhid}`);
                nextSeq++;
            }
            console.log("✅ UHID Backfill Complete.");
        } else {
            console.log("✅ All patients already have UHID.");
        }

    } catch (e) {
        console.error("❌ Data Fix Failed:", e);
    } finally {
        await pool.end();
    }
}

fixData();
