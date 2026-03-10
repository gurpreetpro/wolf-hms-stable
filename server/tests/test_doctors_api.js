const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/patients/app/doctors',
    method: 'GET'
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
            const data = JSON.parse(body);
            console.log('Success:', data.success);
            console.log('Doctors count:', data.doctors?.length || 0);
            if (data.doctors) {
                data.doctors.forEach((d, i) => {
                    console.log(`  ${i+1}. ${d.name} - ${d.department || 'N/A'} (ID: ${d.id}, Fee: ₹${d.fee})`);
                });
            }
        } catch (e) {
            console.log('Response:', body);
        }
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.end();
