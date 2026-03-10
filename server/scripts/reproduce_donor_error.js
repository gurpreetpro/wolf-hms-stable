const axios = require('axios');

async function testRegistration() {
    try {
        console.log('Attempting to register donor...');
        const payload = {
            name: 'Gurpreet Test',
            phone: '9876543210',  // Dummy phone
            blood_group: 'A+',
            gender: 'Male',
            date_of_birth: '1999-01-29',
            address: 'Punjab',
            city: 'Ludhiana',
            weight: '75',      // String as per frontend
            hemoglobin: '15',  // String as per frontend
            is_voluntary: true,
            // Missing optional fields as per frontend state
        };

        const res = await axios.post('http://localhost:8080/api/blood-bank/donors', payload, {
            headers: {
                // Mocking an authenticated user if needed, or assuming middleware handles it. 
                // Wait, I need a token. 
                // Using a hardcoded token or mocking the auth middleware is hard from script without login.
                // I'll try to login first if I can, or just hit the endpoint and standard error 401 will show.
                // Actually, I can use the existing server running by the user.
            }
        });
        console.log('Success:', res.data);
    } catch (err) {
        if (err.response) {
            console.log('Error Status:', err.response.status);
            console.log('Error Data:', err.response.data);
        } else {
            console.error('Error:', err.message);
        }
    }
}

// I need authentication. 
// I'll assume I can run this against the local server if I disable auth or login as admin.
// Let's try to login as admin first.

async function run() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post('http://localhost:8080/api/users/login', {
            email: 'audit@wolfhms.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Logged in. Token:', token.substring(0, 20) + '...');

        console.log('Registering donor with token...');
        const payload = {
            name: 'Gurpreet Test',
            phone: `98765${Math.floor(Math.random() * 100000)}`,
            blood_group: 'A+',
            gender: 'Male',
            date_of_birth: '1999-01-29',
            address: 'Punjab',
            city: 'Ludhiana',
            weight: '75',
            hemoglobin: '15',
            is_voluntary: true
        };

        const res = await axios.post('http://localhost:8080/api/blood-bank/donors', payload, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log('✅ Registration Success:', res.data);

    } catch (err) {
        console.error('❌ Failed:');
        if (err.response) {
            console.log('Status:', err.response.status);
            console.log('Data:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.log(err.message);
        }
    }
}

run();
