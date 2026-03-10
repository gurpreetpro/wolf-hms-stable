const axios = require('axios');

async function check() {
    try {
        // We need a token. Let's try to login as admin first or just hack it if we can't.
        // Actually, let's just use the server internal logic or assume we can hit it if we disable auth for a sec? 
        // No, let's use the 'login' endpoint to get a token.
        // Assuming admin/password123 based on previous context.
        
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'admin_user', // Try standard admin
            password: 'password123'
        });
        
        const token = loginRes.data.token;
        console.log('Got Token:', token ? 'Yes' : 'No');

        const headers = { Authorization: `Bearer ${token}` };
        
        console.log('Fetching Blood Bank Dashboard...');
        const res = await axios.get('http://localhost:5000/api/blood-bank/dashboard', { headers });
        console.log('Status:', res.status);
        console.log('Data Keys:', Object.keys(res.data));
        console.log('Inventory Count:', res.data.inventory?.length);
        
    } catch (e) {
        console.error('Error:', e.response ? e.response.data : e.message);
    }
}
check();
