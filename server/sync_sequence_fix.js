/**
 * Sync Script: Fix Users Sequence
 * Applies migration 216_fix_users_sequence.sql to the cloud database via sync endpoint
 */

const fs = require('fs');
const path = require('path');

const CLOUD_URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app';
const SYNC_SECRET = 'WolfHMS_Migration_Secret_2026';

async function fixSequence() {
    console.log('🔧 Fixing users_id_seq on cloud database...\n');
    
    try {
        // First, check current state
        console.log('📊 Checking current state...');
        
        const maxIdResponse = await fetch(`${CLOUD_URL}/api/sync/sql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                secret: SYNC_SECRET, 
                sql: 'SELECT MAX(id) as max_id FROM users'
            })
        });
        const maxIdResult = await maxIdResponse.json();
        console.log('   MAX(id) in users:', maxIdResult.rows?.[0]?.max_id || 'unknown');
        
        const seqResponse = await fetch(`${CLOUD_URL}/api/sync/sql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                secret: SYNC_SECRET, 
                sql: "SELECT last_value FROM users_id_seq"
            })
        });
        const seqResult = await seqResponse.json();
        console.log('   Current sequence value:', seqResult.rows?.[0]?.last_value || 'unknown');
        
        // Read and execute migration
        console.log('\n🚀 Applying fix...');
        const migrationPath = path.join(__dirname, 'migrations', '216_fix_users_sequence.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        
        const fixResponse = await fetch(`${CLOUD_URL}/api/sync/sql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: SYNC_SECRET, sql: migrationSql })
        });
        const fixResult = await fixResponse.json();
        
        if (fixResult.success) {
            console.log('   ✅ Migration applied successfully!');
        } else {
            console.log('   ❌ Migration failed:', fixResult.message);
            return;
        }
        
        // Verify fix
        console.log('\n📌 Verifying fix...');
        const verifyResponse = await fetch(`${CLOUD_URL}/api/sync/sql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                secret: SYNC_SECRET, 
                sql: "SELECT last_value FROM users_id_seq"
            })
        });
        const verifyResult = await verifyResponse.json();
        console.log('   New sequence value:', verifyResult.rows?.[0]?.last_value || 'unknown');
        
        console.log('\n🎉 Migration completed successfully!');
        console.log('   Users can now be created without duplicate key errors.');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

fixSequence();
