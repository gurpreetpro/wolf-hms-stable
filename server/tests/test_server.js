// Test if server is running
const http = require('http');

console.log('Testing server connectivity...');

// Simple GET request to root
http.get('http://localhost:5000/', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Server Status:', res.statusCode);
        console.log('Response:', data);
        console.log('\n✅ Server is running!');

        // Now test login
        testLogin();
    });
}).on('error', (e) => {
    console.log('❌ Server NOT responding:', e.message);
    console.log('Make sure server is running on port 5000');
});

function testLogin() {
    const postData = JSON.stringify({
        username: 'doctor_user',
        password: 'password123'
    });

    const req = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log('\n--- Login Test ---');
            console.log('Status:', res.statusCode);
            console.log('Response:', data.substring(0, 200));

            if (res.statusCode === 200) {
                console.log('\n✅ LOGIN SUCCESS!');
            } else {
                console.log('\n❌ Login failed with status', res.statusCode);
            }
        });
    });

    req.on('error', e => console.log('Login request error:', e.message));
    req.write(postData);
    req.end();
}
