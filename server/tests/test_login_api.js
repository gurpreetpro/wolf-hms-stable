// Test login API endpoint directly
const http = require('http');

const postData = JSON.stringify({
    username: 'doctor_user',
    password: 'password123'
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('Testing login API endpoint...');
console.log('POST http://localhost:5000/api/auth/login');
console.log('Body:', postData);
console.log('---');

const req = http.request(options, (res) => {
    let data = '';

    console.log('Status:', res.statusCode);

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response:', data);

        if (res.statusCode === 200) {
            console.log('\n✅ LOGIN API WORKS!');
        } else {
            console.log('\n❌ LOGIN FAILED');
        }
    });
});

req.on('error', (e) => {
    console.error('Request error:', e.message);
});

req.write(postData);
req.end();
