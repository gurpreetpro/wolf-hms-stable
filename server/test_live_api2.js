const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const https = require('https');

const pool = new Pool({
    user: 'admin',
    host: '217.216.78.81',
    database: 'wolfhms_db',
    password: 'wolfhms_secure_password',
    port: 5432,
});

const secret = 'G8jDpZ0Gt3kihAK12m2umw9XK1MTfQklPStqFMK8M6WxCPHvt1TSDQm4z6mZzCnH';

const request = (path, token) => new Promise((resolve) => {
    https.get('https://ace.wolfhms.in' + path, {
        headers: { 'Authorization': 'Bearer ' + token },
        rejectUnauthorized: false
    }, (res) => {
        let body = ''; res.on('data', c => body += c);
        res.on('end', () => resolve({ path, status: res.statusCode, body }));
    });
});

async function run() {
    try {
        const userRes = await pool.query('SELECT id, hospital_id, role FROM users WHERE username = $1', ['ace_admin']);
        if (userRes.rowCount === 0) {
            console.error('User ace_admin not found!');
            return pool.end();
        }

        const user = userRes.rows[0];
        console.log('Found ace_admin:', user);

        const token = jwt.sign({ id: user.id, hospital_id: user.hospital_id, role: user.role }, secret, { expiresIn: '1h' });

        const endpoints = [
            '/api/dashboard/stats',
            '/api/admin/analytics',
            '/api/auth/users',
            '/api/opd/queue',
            '/api/admissions/active',
            '/api/finance/invoices',
            '/api/settings/hospital-profile'
        ];

        let foundError = false;
        for (const ep of endpoints) {
            console.log(`Testing ${ep}...`);
            const result = await request(ep, token);
            if (result.status >= 500) {
                console.log('🔴 HTTP 500 CRASH ON:', result.path, result.body.substring(0, 100));
                foundError = true;
            } else if (result.status >= 400) {
                console.log('🟠 FAILED HTTP', result.status, result.path);
            } else {
                console.log('✅ OK HTTP', result.status, result.path);
            }
        }
        if (!foundError) console.log('No 500 errors found!');
    } catch (e) {
        console.error('Crash:', e.message);
    } finally {
        pool.end();
    }
}
run();
