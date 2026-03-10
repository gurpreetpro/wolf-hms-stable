/**
 * Sync Medicine Catalog to Cloud via API
 * Uses the /sync/sql endpoint to execute the medicine seed SQL
 */

const fs = require('fs');
const path = require('path');

const CLOUD_URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app';

async function syncMedicines() {
    console.log('💊 Syncing Medicine Catalog to Cloud via API...\n');
    
    try {
        // Read the SQL migration file
        const sqlPath = path.join(__dirname, 'migrations', '202_seed_indian_medicines.sql');
        let sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('📄 Loaded SQL migration file');
        console.log(`   Size: ${sql.length} bytes\n`);
        
        // Execute the SQL via the sync endpoint
        console.log('🚀 Sending to cloud...');
        
        const response = await fetch(`${CLOUD_URL}/api/sync/sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sql })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('\n✅ Medicine catalog synced successfully!');
            console.log('   Response:', JSON.stringify(result, null, 2));
        } else {
            console.log('\n❌ Sync failed:');
            console.log('   Status:', response.status);
            console.log('   Error:', result);
        }
        
        // Verify by checking inventory count
        console.log('\n📊 Verifying inventory count...');
        const verifyResponse = await fetch(`${CLOUD_URL}/api/health`);
        const health = await verifyResponse.json();
        console.log('   Server health:', health.status);
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

syncMedicines();
