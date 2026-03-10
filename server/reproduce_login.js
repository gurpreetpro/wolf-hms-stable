const axios = require('axios');

async function testLogin() {
    try {
        console.log('Attempting login...');
        const response = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'receptionist_user',
            password: 'wrong_password_to_test_db_connection' 
        });
        console.log('Response:', response.status, response.data);
    } catch (error) {
        if (error.response) {
            console.log('Error Response Status:', error.response.status);
            console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('Error Request: No response received');
            console.error('Error Code:', error.code);
            console.error('Error Message:', error.message);
        } else {
            console.error('Error Message:', error.message);
            console.error('Full Error:', error);
        }
    }
}

testLogin();
