const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let token = '';
let testId = '';

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

        // 2. Create a new Lab Test
        console.log('\n2. Creating new Lab Test...');
        const createRes = await axios.post(`${API_URL}/lab/tests`, {
            name: 'Test_Dengue_IgG',
            price: 600,
            category: 'Serology',
            normal_range: 'Negative'
        }, { headers: { Authorization: `Bearer ${token}` } });
        testId = createRes.data.id;
        console.log('✅ Test Created:', createRes.data);

        // 3. Get All Tests
        console.log('\n3. Fetching all tests...');
        const getRes = await axios.get(`${API_URL}/lab/tests`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const found = getRes.data.find(t => t.id === testId);
        if (found) console.log('✅ Created test found in list');
        else throw new Error('Created test not found');

        // 4. Update Test
        console.log('\n4. Updating Test...');
        const updateRes = await axios.put(`${API_URL}/lab/tests/${testId}`, {
            name: 'Test_Dengue_IgG_Updated',
            price: 650,
            category: 'Serology',
            normal_range: 'Negative (< 0.9)'
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('✅ Test Updated:', updateRes.data);

        // 5. Delete Test
        console.log('\n5. Deleting Test...');
        await axios.delete(`${API_URL}/lab/tests/${testId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Test Deleted');

        // 6. Verify Deletion
        const verifyRes = await axios.get(`${API_URL}/lab/tests`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const deleted = verifyRes.data.find(t => t.id === testId);
        if (!deleted) console.log('✅ Deletion verified');
        else throw new Error('Test still exists');

    } catch (error) {
        console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

runTests();
