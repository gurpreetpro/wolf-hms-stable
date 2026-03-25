const jwt = require('jsonwebtoken');
const https = require('https');

const secret = 'G8jDpZ0Gt3kihAK12m2umw9XK1MTfQklPStqFMK8M6WxCPHvt1TSDQm4z6mZzCnH';
const token = jwt.sign({ id: 2, hospital_id: 3, role: 'admin' }, secret, { expiresIn: '1h' });

const request = (path) => new Promise((resolve) => {
    https.get('https://ace.wolfhms.in' + path, {
        headers: { 'Authorization': 'Bearer ' + token },
        rejectUnauthorized: false
    }, (res) => {
        let body = ''; res.on('data', c => body += c);
        res.on('end', () => resolve({ path, status: res.statusCode, body }));
    });
});

async function run() {
    const endpoints = [
        '/api/dashboard/stats',
        '/api/admin/analytics',
        '/api/auth/users',
        '/api/opd/queue',
        '/api/admissions/active',
        '/api/lab/test-requests',
        '/api/finance/invoices',
        '/api/settings/hospital-profile'
    ];
    let foundError = false;
    for (const ep of endpoints) {
        console.log(`Testing ${ep}...`);
        try {
            const result = await request(ep);
            if (result.status >= 400) {
                console.log('🔴 FAILED:', result.status, result.path, result.body.substring(0, 100));
                foundError = true;
            } else {
                console.log('✅ OK:', result.status, result.path);
            }
        } catch (e) {
            console.error('Crash:', e.message);
        }
    }
}
run();
