const https = require('https');

const data = JSON.stringify({
    setupKey: 'WolfSetup2024!',
    sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS security_question VARCHAR(255); ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer VARCHAR(255);'
});

const options = {
    hostname: 'wolf-tech-server-708086797390.asia-south1.run.app',
    port: 443,
    path: '/api/health/exec-sql',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (d) => {
        body += d;
    });
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body: ${body}`);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
