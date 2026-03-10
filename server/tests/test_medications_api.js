const http = require('http');

// Test medications API
const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/patients/app/medications?phone=7777777777',
    method: 'GET'
};

console.log('Testing GET /api/patients/app/medications?phone=7777777777\n');

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
            const data = JSON.parse(body);
            console.log('Success:', data.success);
            console.log('Patient:', data.patientName);
            console.log('Medications:', data.medications?.length || 0);
            if (data.medications) {
                data.medications.forEach((med, i) => {
                    console.log(`\n  ${i+1}. ${med.drug_name}`);
                    console.log(`     Generic: ${med.generic_name || 'N/A'}`);
                    console.log(`     Qty: ${med.quantity}`);
                    console.log(`     Dosage: ${med.dosage_instructions}`);
                    console.log(`     Date: ${new Date(med.dispensed_at).toLocaleDateString()}`);
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
