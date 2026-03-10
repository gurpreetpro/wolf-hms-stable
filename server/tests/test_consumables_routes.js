const axios = require('axios');

const BASE_URL = 'http://localhost:5000'; // Adjust port if needed

// Login to get token
const login = async () => {
    try {
        const res = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@wolfhms.com',
            password: 'password123'
        });
        return res.data.token;
    } catch (err) {
        console.error('Login failed:', err.message);
        process.exit(1);
    }
};

const test = async () => {
    const token = await login();
    const headers = { Authorization: `Bearer ${token}` };

    console.log('Testing GET /api/ward/consumables...');
    try {
        const res = await axios.get(`${BASE_URL}/api/ward/consumables`, { headers });
        console.log('✅ Catalog fetched. Count:', res.data.length);
    } catch (err) {
        console.error('❌ Catalog fetch failed:', err.response ? err.response.data : err.message);
    }

    console.log('Testing GET /api/nurse/consumables/1...'); // Assuming admission ID 1 exists
    try {
        const res = await axios.get(`${BASE_URL}/api/nurse/consumables/1`, { headers });
        console.log('✅ Patient consumables fetched:', res.data);
    } catch (err) {
        console.error('❌ Patient consumables fetch failed:', err.response ? err.response.data : err.message);
    }
};

test();
