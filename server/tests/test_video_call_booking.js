// Test booking a VIDEO CALL appointment via API
const http = require('http');

const data = JSON.stringify({
    patientName: 'Teleconsult Patient',
    patientPhone: '8888777766',
    doctorId: 1,
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '2:00 PM',
    amount: 500,
    consultationType: 'tele' // This should trigger video call icon on doctor dashboard!
});

console.log('📹 Booking VIDEO CALL appointment...');
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
