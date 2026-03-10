const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testCSSDFlow() {
    console.log('\n🧼 Testing CSSD Sterilization Flow...\n');

    try {
        // 0. Login
        process.stdout.write('0. Authenticating... ');
        let token;
        try {
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                username: 'admin',
                password: 'password'
            });
            token = loginRes.data.token;
            console.log('OK (Token received)');
        } catch (err) {
            console.log(`FAILED (Login): ${err.message}`);
             process.exit(1);
        }

        const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
        
        // 1. Get Inventory
        process.stdout.write('1. Fetching Inventory... ');
        const invRes = await axios.get(`${API_URL}/cssd/inventory`, authHeaders);
        const item = invRes.data[0];
        if (!item) {
            console.log('FAILED (No inventory seeded)');
            process.exit(1);
        }
        console.log(`OK (Selected: ${item.name})`);

        // 2. Receive as Dirty
        process.stdout.write('2. Logging "Received"... ');
        await axios.post(`${API_URL}/cssd/log`, {
            inventory_id: item.id,
            action: 'Received',
            from_location: 'OT-1',
            performed_by: 'AutoTest'
        }, authHeaders);
        console.log('OK');

        // 3. Start Batch
        process.stdout.write('3. Starting Autoclave Batch... ');
        const batchRes = await axios.post(`${API_URL}/cssd/batches`, {
            machine_id: 'Autoclave-Test',
            cycle_type: 'Flash',
            operator_id: 'AutoTest',
            inventory_ids: [item.id]
        }, authHeaders);
        const batchId = batchRes.data.id;
        console.log(`OK (Batch #${batchId} Started)`);

        // 4. Complete Batch
        process.stdout.write('4. Completing Batch... ');
        await axios.put(`${API_URL}/cssd/batches/${batchId}/complete`, {
            status: 'Completed'
        }, authHeaders);
        console.log('OK');

        // 5. Verify Item is Sterile
        process.stdout.write('5. Verifying Item Status... ');
        const checkRes = await axios.get(`${API_URL}/cssd/inventory`, authHeaders);
        const updatedItem = checkRes.data.find(i => i.id === item.id);
        
        if (updatedItem.current_status === 'Sterile') {
            console.log('OK (Status is Sterile)');
        } else {
            console.log(`FAILED (Status is ${updatedItem.current_status})`);
        }

    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        console.error(error.response?.data);
    } finally {
        process.exit(0);
    }
}

testCSSDFlow();
