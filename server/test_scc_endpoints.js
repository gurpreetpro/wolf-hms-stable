const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/security';
// We need a valid token. For local testing, we might need a login helper or a hardcoded token if available.
// Or we can simulate the request if we have a way to generate a token script.
// Let's assume we can login as 'admin' first.

async function testSCC() {
    try {
        console.log('1. Logging in (via Demo Login)...');
        // Use demo-login to ensure user exists and get token
        const loginRes = await axios.post('http://localhost:5000/api/auth/demo-login', {});
        const token = loginRes.data.token;
        console.log('✅ Login Successful (User:', loginRes.data.user.username, ')');

        const config = { headers: { Authorization: `Bearer ${token}` } };

        console.log('\n2. Testing /command/map...');
        const mapRes = await axios.get(`${BASE_URL}/command/map`, config);
        const mapData = mapRes.data.data || mapRes.data;
        console.log('✅ Map Data Keys:', Object.keys(mapData));
        if (!mapData.gates) throw new Error("Missing gates in map data");

        console.log('\n3. Testing /gates...');
        const gatesRes = await axios.get(`${BASE_URL}/gates`, config);
        const gatesData = gatesRes.data.data || gatesRes.data;
        console.log(`✅ Gates Found: ${gatesData.length}`);
        
        if (gatesData.length > 0) { 
            const gateId = gatesData[0].id;
            console.log(`\n4. Toggling Gate ${gateId}...`);
            const toggleRes = await axios.post(`${BASE_URL}/gates/${gateId}/toggle`, { command: 'OPEN' }, config);
            console.log('✅ Gate Toggled:', toggleRes.data.status);
        }

        console.log('\n5. Testing /missions/dispatch...');
        // dispatchMission
        // { title, type, priority, location_name, assigned_to_id, description }
        // We need a user ID for assigned_to. Using self (admin) for test.
        const userId = loginRes.data.user.id;
        
        const missionRes = await axios.post(`${BASE_URL}/missions/dispatch`, {
            title: 'Test Patrol Alpha',
            type: 'PATROL',
            priority: 'ROUTINE',
            location_name: 'North Wing',
            assigned_to_id: userId,
            description: 'Automated test mission'
        }, config);
        console.log('✅ Mission Dispatched:', missionRes.data.title);

        console.log('\n🎉 SCC API Verification Passed!');

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testSCC();
