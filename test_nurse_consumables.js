const axios = require('axios');

const API_URL = 'http://127.0.0.1:8080/api';

async function test() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/demo-login`, {}, {
            headers: { 'x-hospital-id': '1' }
        });
        const token = loginRes.data.token;
        console.log('Token acquired:', token);

        const config = {
            headers: {
                'x-hospital-id': '1',
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        // Let's create a patient & admission first
        console.log('Registering patient...');
        const uniquePhone = '9' + Math.floor(100000000 + Math.random() * 900000000);
        const regRes = await axios.post(`${API_URL}/patients/register`, {
            name: 'Test Consumables Patient',
            age: 25,
            gender: 'Female',
            phone: uniquePhone,
            blood_group: 'O+'
        }, config);
        const patientId = regRes.data.patientId || regRes.data.id || regRes.data.data?.id;
        console.log('Patient ID:', patientId);

        console.log('Querying available beds...');
        const bedsRes = await axios.get(`${API_URL}/admissions/available-beds?ward_id=2`, config);
        const targetBed = (bedsRes.data.data || []).find(b => b.status === 'Available');
        if (!targetBed) {
            throw new Error('No available beds!');
        }
        console.log('Target Bed:', targetBed.bed_number);

        console.log('Admitting patient...');
        const admitRes = await axios.post(`${API_URL}/admissions/admit`, {
            patient_id: patientId,
            ward: 'Surgical Ward',
            bed_number: targetBed.bed_number,
            diagnosis: 'Test',
            doctor_id: 17
        }, config);
        const admissionId = admitRes.data.data?.admission_id || admitRes.data.admission_id || admitRes.data.data?.admission?.id;;
        console.log('Admission ID:', admissionId);

        console.log('Recording consumable...');
        const res = await axios.post(`${API_URL}/nurse/consumables`, {
            admission_id: admissionId,
            consumable_id: 1,
            quantity: 2,
            notes: 'Test note'
        }, config);
        console.log('Success!', res.data);
    } catch (e) {
        console.error('💥 Error status:', e.response?.status);
        console.error('💥 Error payload:', e.response?.data);
        console.error('💥 Full error:', e.message);
    }
}

test();
