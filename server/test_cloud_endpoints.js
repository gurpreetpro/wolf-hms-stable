/**
 * Test Cloud Run sync endpoint availability
 */

async function testEndpoints() {
    const BASE = 'https://wolf-tech-server-708086797390.asia-south1.run.app';
    
    const endpoints = [
        '/api/health',
        '/sync/sql',
        '/api/sync/sql'
    ];
    
    console.log('Testing Cloud Run endpoints...\n');
    
    for (const endpoint of endpoints) {
        try {
            const res = await fetch(`${BASE}${endpoint}`, { method: 'GET' });
            const contentType = res.headers.get('content-type');
            const text = await res.text();
            console.log(`${endpoint}:`);
            console.log(`  Status: ${res.status}`);
            console.log(`  Content-Type: ${contentType}`);
            console.log(`  Body (50 chars): ${text.substring(0, 50)}...`);
            console.log('');
        } catch (e) {
            console.log(`${endpoint}: ERROR - ${e.message}\n`);
        }
    }
}

testEndpoints();
