/**
 * Sync Treatment Packages Migration to Cloud
 */

const fs = require('fs');
const path = require('path');

const CLOUD_URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app';
const SYNC_SECRET = 'WolfHMS_Migration_Secret_2026';

async function syncMigration() {
    console.log('📦 Syncing Treatment Packages Migration to Cloud...\n');
    
    try {
        // Read the SQL migration file
        const sqlPath = path.join(__dirname, 'migrations', '215_treatment_packages.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log(`📄 Loaded migration (${sql.length} bytes)\n`);
        console.log('🚀 Sending to cloud...');
        
        const response = await fetch(`${CLOUD_URL}/api/sync/sql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: SYNC_SECRET, sql })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('\n✅ Migration applied successfully!');
            console.log('   Row count:', result.rowCount);
        } else {
            console.log('\n❌ Migration failed:');
            console.log('   Error:', result.message);
            console.log('   Detail:', result.detail);
        }
        
        // Verify packages were created
        console.log('\n📊 Verifying packages...');
        const verifyResponse = await fetch(`${CLOUD_URL}/api/sync/sql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                secret: SYNC_SECRET, 
                sql: 'SELECT code, name, category, base_price FROM treatment_packages ORDER BY category, name'
            })
        });
        
        const verifyResult = await verifyResponse.json();
        
        if (verifyResult.success && verifyResult.rows) {
            console.log(`   Found ${verifyResult.rows.length} packages:\n`);
            verifyResult.rows.forEach(pkg => {
                console.log(`   [${pkg.category}] ${pkg.code}: ${pkg.name} - ₹${pkg.base_price}`);
            });
        }
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

syncMigration();
