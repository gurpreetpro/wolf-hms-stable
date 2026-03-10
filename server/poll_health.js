const https = require('https');
const { exec } = require('child_process');

const url = 'https://wolf-hms-server-test-fdurncgganq-el.a.run.app/api/health';
const maxAttempts = 30; // 5 minutes approx
const delay = 10000; // 10s

function check() {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            console.log(`[${new Date().toISOString()}] Status: ${res.statusCode}`);
            // Check if we got a real response (not the Google 404 page which might also be 404, but let's see)
            // Actually Google 404 usually returns 404. 
            // The app's /api/health returns 200.
            resolve(res.statusCode);
        });
        req.on('error', (e) => {
            console.log(`Error: ${e.message}`);
            resolve(0);
        });
    });
}

async function loop() {
    for (let i = 0; i < maxAttempts; i++) {
        console.log(`Attempt ${i+1}/${maxAttempts}...`);
        const status = await check();
        
        if (status === 200) {
            console.log("✅ Service is UP! Triggering migration...");
            
            exec('node run_migration_trigger.js', (err, stdout, stderr) => {
                console.log('Migration Output:');
                console.log(stdout);
                if (err) {
                    console.error('Migration Error:', stderr);
                    process.exit(1);
                } else {
                    process.exit(0);
                }
            });
            return;
        }
        
        // Wait
        await new Promise(r => setTimeout(r, delay));
    }
    console.log("❌ Timed out waiting for service.");
    process.exit(1);
}

loop();
