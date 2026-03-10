const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let token = '';
let procedureId = '';

async function runTests() {
    try {
        // 1. Login as Admin
        console.log('1. Logging in as Admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin_user',
            password: 'password123'
        });
        token = loginRes.data.token;
        console.log('✅ Login successful');

        // 2. Create Procedure
        console.log('\n2. Creating Procedure...');
        const createRes = await axios.post(`${API_URL}/procedures`, {
            name: 'Test Surgery',
            code: 'TEST001',
            price: 5000,
            description: 'A test procedure'
        }, { headers: { Authorization: `Bearer ${token}` } });
        procedureId = createRes.data.id;
        console.log('✅ Procedure Created (ID: ' + procedureId + ')');

        // 3. Get Procedures
        console.log('\n3. Fetching Procedures...');
        const getRes = await axios.get(`${API_URL}/procedures`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const found = getRes.data.find(p => p.id === procedureId);
        if (found) console.log('✅ Procedure Found in List');
        else throw new Error('Procedure not found');

        // 4. Update Procedure
        console.log('\n4. Updating Procedure...');
        await axios.put(`${API_URL}/procedures/${procedureId}`, {
            name: 'Test Surgery Updated',
            code: 'TEST001',
            price: 6000,
            description: 'Updated description'
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('✅ Procedure Updated');

        // 5. Delete Procedure
        console.log('\n5. Deleting Procedure...');
        await axios.delete(`${API_URL}/procedures/${procedureId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Procedure Deleted');

    } catch (error) {
        console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

runTests();
