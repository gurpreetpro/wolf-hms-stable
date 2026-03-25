const https = require('https');

const doRequest = (options, bodyData) => new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
        let body = ''; res.on('data', c => body += c);
        res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
});

async function run() {
    try {
        console.log('Logging in to live API...');
        const loginData = JSON.stringify({ username: 'ace_admin', password: 'password123' });
        const loginRes = await doRequest({
            hostname: 'ace.wolfhms.in',
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length },
            rejectUnauthorized: false
        }, loginData);

        if (loginRes.status !== 200) {
            console.error('Login failed!', loginRes.status, loginRes.body);
            return;
        }
        const { token } = JSON.parse(loginRes.body);
        console.log('Got live token!');

        const endpoints = [
            '/api/dashboard/stats',
            '/api/admin/analytics',
            '/api/auth/users',
            '/api/opd/queue',
            '/api/admissions/active',
            '/api/finance/invoices',
            '/api/settings/hospital-profile'
        ];

        for (const ep of endpoints) {
            console.log(`\nTesting ${ep}...`);
            const result = await doRequest({
                hostname: 'ace.wolfhms.in', path: ep, method: 'GET',
                headers: { 'Authorization': 'Bearer ' + token },
                rejectUnauthorized: false
            });
            if (result.status >= 500) {
                console.log('🔴 HTTP 500 CRASH:', result.body);
            } else if (result.status >= 400) {
                console.log('🟠 HTTP', result.status, result.body);
            } else {
                console.log('✅ OK', result.status);
            }
        }
    } catch (e) {
        console.error('Crash:', e.message);
    }
}
run();
