const axios = require('axios');

const URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app/api/health/exec-sql';
const KEY = 'WolfSetup2024!';

async function runQuery(label, sql) {
    try {
        console.log(`\n--- ${label} ---`);
        const res = await axios.post(URL, {
            setupKey: KEY,
            sql: sql
        });
        if (res.data.success) {
            console.log(`Success! Rows: ${res.data.rowCount}`);
            if (res.data.rows && res.data.rows.length > 0) {
                 res.data.rows.forEach(r => console.log(JSON.stringify(r)));
            }
        } else {
            console.log('Query returned success: false', res.data);
        }
    } catch (e) {
        console.error('Error:', e.response?.data?.error || e.message);
    }
}

async function check078() {
    // 1. Check if 078_onboard is already applied
    await runQuery('078_onboard applied?', "SELECT name FROM _migrations WHERE name LIKE '078_onboard%'");
    
    // 2. Check if slug column exists
    await runQuery('slug column exists?', "SELECT column_name FROM information_schema.columns WHERE table_name = 'hospitals' AND column_name = 'slug'");
    
    // 3. Add slug column if missing and mark migration as done
    await runQuery('Add slug column', `ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS slug VARCHAR(50)`);
    
    // 4. Update hospitals with slug from code
    await runQuery('Set slug from code', `UPDATE hospitals SET slug = code WHERE slug IS NULL AND code IS NOT NULL`);
    
    // 5. Mark 078_onboard as applied
    await runQuery('Mark 078_onboard as applied', `INSERT INTO _migrations (name) VALUES ('078_onboard_three_hospitals.sql') ON CONFLICT DO NOTHING`);
    
    console.log('\n✅ Done. Redeploy to continue migrations.');
}

check078();
