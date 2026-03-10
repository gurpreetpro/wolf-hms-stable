const axios = require('axios');

async function check() {
    try {
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'admin_user',
            password: 'password123'
        });
        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };
        
        console.log('--- Security Endpoints ---');
        console.log('Testing /api/security/command/map...');
        const mapRes = await axios.get('http://localhost:5000/api/security/command/map', { headers });
        console.log('Map Status:', mapRes.status);
        
        console.log('Testing /api/security/gates...');
        const gatesRes = await axios.get('http://localhost:5000/api/security/gates', { headers });
        console.log('Gates Status:', gatesRes.status);
        console.log('Gates Count:', gatesRes.data.data ? gatesRes.data.data.length : 'N/A');

        console.log('--- External Dependencies ---');
        console.log('Testing /api/parking/stats...');
        try {
            const parkingRes = await axios.get('http://localhost:5000/api/parking/stats', { headers });
            console.log('Parking Status:', parkingRes.status);
        } catch (e) {
            console.log('Parking Failed:', e.response ? e.response.status : e.message);
        }

        console.log('Testing /api/visitors/active...');
        try {
            const visitorsRes = await axios.get('http://localhost:5000/api/visitors/active', { headers });
            console.log('Visitors Status:', visitorsRes.status);
        } catch (e) {
            console.log('Visitors Failed:', e.response ? e.response.status : e.message);
        }

    } catch (e) {
        console.error('Login/General Error:', e.message);
    }
}
check();
