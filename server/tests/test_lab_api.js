const http = require('http');

// Test lab orders API
const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/patients/app/lab-orders?phone=7777777777',
    method: 'GET'
};

console.log('Testing GET /api/patients/app/lab-orders?phone=7777777777\n');

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
            const data = JSON.parse(body);
            console.log('Success:', data.success);
            console.log('Patient:', data.patientName);
            console.log('Lab Orders:', data.labOrders?.length || 0);
            if (data.labOrders) {
                data.labOrders.forEach((order, i) => {
                    console.log(`\n  ${i+1}. ${order.test_name}`);
                    console.log(`     Status: ${order.status}`);
                    console.log(`     Doctor: ${order.doctor_name}`);
                    console.log(`     Has Results: ${order.has_results}`);
                    console.log(`     Critical: ${order.has_critical_value}`);
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
