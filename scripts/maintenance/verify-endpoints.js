const axios = require('axios');

const baseUrl = 'https://wolfhms-fdurncganq-el.a.run.app';
const loginUrl = `${baseUrl}/api/users/login`;
const usersUrl = `${baseUrl}/api/users`;

const adminCreds = {
    username: 'developer',
    password: 'WolfDev2024!'
};

async function run() {
    try {
        console.log('1. Testing Login at /api/users/login...');
        const loginRes = await axios.post(loginUrl, adminCreds);
        const token = loginRes.data.data.token;
        console.log('✅ Login Success! Token obtained.');
        
        console.log('2. Testing Get Users at /api/users...');
        const usersRes = await axios.get(usersUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ Get Users Success! Count: ${usersRes.data.count}`);

        console.log('All legacy endpoints verified.');

    } catch (err) {
        if (err.response) {
            console.error('❌ FAILED:', err.config.url, err.response.status, err.response.data);
        } else {
            console.error('❌ ERROR:', err.message);
        }
    }
}

run();
