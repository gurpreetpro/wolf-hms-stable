const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

const testCases = [
    { complaint: 'knee pain', expected: 'Orthopedics' },
    { complaint: 'severe headache and dizziness', expected: 'Neurology' },
    { complaint: 'chest pain radiating to arm', expected: 'Emergency' },
    { complaint: 'stomach pain and vomiting', expected: 'Gastroenterology' },
    { complaint: 'skin rash and itching', expected: 'Dermatology' },
    { complaint: 'blood sugar high, diabetes', expected: 'Endocrinology' },
    { complaint: 'depression and anxiety', expected: 'Psychiatry' },
    { complaint: 'burning urination', expected: 'Urology' },
    { complaint: 'irregular period', expected: 'Gynecology' },
    { complaint: 'toothache', expected: 'Dentistry' }
];

async function testSymptomCatalog() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'admin_user',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('✅ Login successful\n');

        console.log('Testing Symptom Catalog:\n');
        let passed = 0;
        let failed = 0;

        for (const test of testCases) {
            const res = await axios.post(`${BASE_URL}/ai/triage`, {
                complaint: test.complaint
            }, { headers: { Authorization: `Bearer ${token}` } });

            const actual = res.data.department;
            const status = actual === test.expected ? '✅' : '❌';

            if (actual === test.expected) passed++;
            else failed++;

            console.log(`${status} "${test.complaint}" -> ${actual} (expected: ${test.expected})`);
        }

        console.log(`\n📊 Results: ${passed}/${testCases.length} passed`);

    } catch (err) {
        console.error('Test failed:', err.response ? err.response.data : err.message);
    }
}

testSymptomCatalog();
