const axios = require('axios');

async function check() {
    try {
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'admin_user',
            password: 'password123'
        });
        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };
        
        console.log('Testing /api/mortuary/status...');
        const statusRes = await axios.get('http://localhost:5000/api/mortuary/status', { headers });
        console.log('Status Response:', statusRes.status);
        
        const data = statusRes.data.data || statusRes.data; // Handle wrapped or raw
        console.log('Chambers:', data.chambers ? data.chambers.length : 'N/A');
        console.log('Deceased:', data.deceased ? data.deceased.length : 'N/A');
        
        if (data.chambers && data.chambers.length === 0) {
            console.log('No chambers found. Attempting /api/mortuary/init...');
            const initRes = await axios.post('http://localhost:5000/api/mortuary/init', {}, { headers });
            console.log('Init Status:', initRes.status);
            
             // Re-fetch
            const statusRes2 = await axios.get('http://localhost:5000/api/mortuary/status', { headers });
            const data2 = statusRes2.data.data || statusRes2.data;
            console.log('Chambers after init:', data2.chambers ? data2.chambers.length : 'N/A');
        }

    } catch (e) {
        console.error('Mortuary Check Failed:', e.response ? e.response.data : e.message);
    }
}
check();
