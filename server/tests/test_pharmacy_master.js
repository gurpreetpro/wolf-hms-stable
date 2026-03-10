const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let token = '';
let itemId = '';

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

        // 2. Create a new Inventory Item
        console.log('\n2. Creating new Inventory Item...');
        const createRes = await axios.post(`${API_URL}/pharmacy/inventory`, {
            name: 'Test_Medicine_X',
            batch_number: 'BATCH_TEST_001',
            expiry_date: '2026-12-31',
            stock_quantity: 100,
            reorder_level: 20,
            price_per_unit: 15.50
        }, { headers: { Authorization: `Bearer ${token}` } });
        itemId = createRes.data.id;
        console.log('✅ Item Created:', createRes.data);

        // 3. Get All Items
        console.log('\n3. Fetching all items...');
        const getRes = await axios.get(`${API_URL}/pharmacy/inventory`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const found = getRes.data.find(i => i.id === itemId);
        if (found) console.log('✅ Created item found in list');
        else throw new Error('Created item not found');

        // 4. Update Item
        console.log('\n4. Updating Item...');
        const updateRes = await axios.put(`${API_URL}/pharmacy/inventory/${itemId}`, {
            name: 'Test_Medicine_X_Updated',
            batch_number: 'BATCH_TEST_002',
            expiry_date: '2027-01-01',
            stock_quantity: 150,
            reorder_level: 25,
            price_per_unit: 18.00
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('✅ Item Updated:', updateRes.data);

        // 5. Delete Item
        console.log('\n5. Deleting Item...');
        await axios.delete(`${API_URL}/pharmacy/inventory/${itemId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Item Deleted');

        // 6. Verify Deletion
        const verifyRes = await axios.get(`${API_URL}/pharmacy/inventory`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const deleted = verifyRes.data.find(i => i.id === itemId);
        if (!deleted) console.log('✅ Deletion verified');
        else throw new Error('Item still exists');

    } catch (error) {
        console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

runTests();
