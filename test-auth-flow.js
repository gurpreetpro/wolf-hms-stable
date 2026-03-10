const axios = require('axios');
const API_URL = 'https://wolfhms-fdurncganq-el.a.run.app/api';

const run = async () => {
    try {
        // Register
        console.log('Registering...');
        const reg = await axios.post(`${API_URL}/users/register`, {
            username: 'admin_test_v2',
            email: 'admin_test_v2@example.com',
            password: 'password123',
            name: 'Test Admin',
            role: 'admin' // The API might ignore this and default to patient/user, but let's try
        });
        console.log('[REGISTER]', reg.status, reg.data);

        // Login
        console.log('Logging in...');
        const log = await axios.post(`${API_URL}/users/login`, {
            username: 'admin_test_v2',
            password: 'password123'
        });
        console.log('[LOGIN]', log.status, log.data.token ? 'Token Received' : 'No Token');
        
    } catch (e) {
        console.error('[ERROR]', e.message);
        if (e.response) console.error(JSON.stringify(e.response.data));
    }
};
run();
