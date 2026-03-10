// Test booking API with correct endpoint
const http = require('http');

const data = JSON.stringify({
    patientName: 'Wolf App Test',
    patientPhone: '9999888877',
    doctorId: 1,
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '11:00 AM',
    amount: 500
});

console.log('Sending booking request...');
console.log('Data:', data);

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/patients/app/book-appointment',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', body);
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(data);
req.end();
