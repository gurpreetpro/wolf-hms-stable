const axios = require('axios');

async function check() {
    try {
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'admin_user',
            password: 'password123'
        });
        
        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };
        
        console.log('Fetching Radiology Stats...');
        const res = await axios.get('http://localhost:5000/api/radiology/stats', { headers });
        console.log('Stats Status:', res.status);
        console.log('Stats Data:', res.data.data ? 'Wrapped' : 'Raw'); // Check if wrapped by ResponseHandler

        console.log('Fetching Templates...');
        const tempRes = await axios.get('http://localhost:5000/api/radiology/templates', { headers });
        console.log('Templates Status:', tempRes.status);
        console.log('Templates Count:', tempRes.data.data ? tempRes.data.data.length : tempRes.data.length);

    } catch (e) {
        console.error('Error:', e.response ? e.response.data : e.message);
    }
}
check();
