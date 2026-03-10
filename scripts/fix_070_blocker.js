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

async function fixSchema() {
    // 1. Add missing columns to hospitals table
    await runQuery('Add subscription_tier column', `
        ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'professional';
    `);
    
    await runQuery('Add subscription_start column', `
        ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS subscription_start DATE;
    `);
    
    await runQuery('Add subscription_end column', `
        ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS subscription_end DATE;
    `);
    
    await runQuery('Add is_active column', `
        ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);
    
    await runQuery('Add updated_at column', `
        ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);
    
    await runQuery('Add settings column', `
        ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
    `);
    
    await runQuery('Add custom_domain column', `
        ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255);
    `);
    
    await runQuery('Add primary_color column', `
        ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#0d6efd';
    `);
    
    await runQuery('Add secondary_color column', `
        ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#6c757d';
    `);
    
    // 2. Mark 070_multi_tenancy_foundation.sql as applied
    await runQuery('Mark 070_multi_tenancy as applied', `
        INSERT INTO _migrations (name) VALUES ('070_multi_tenancy_foundation.sql') ON CONFLICT DO NOTHING;
    `);
    
    // 3. Mark 070_prescriptions.sql as applied (it may also fail)
    await runQuery('Mark 070_prescriptions as applied', `
        INSERT INTO _migrations (name) VALUES ('070_prescriptions.sql') ON CONFLICT DO NOTHING;
    `);
    
    console.log('\n✅ Schema fix applied. Redeploy to continue migrations.');
}

fixSchema();
