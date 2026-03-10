const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testSettingsFlow() {
    console.log('\n⚙️ Testing Admin Settings Flow...\n');

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
        
        // 1. Update Hospital Name
        process.stdout.write('1. Updating Hospital Profile... ');
        await axios.post(`${API_URL}/settings/profile`, {
            hospital_name: 'TEST HOSPITAL HUB',
            hospital_address: 'Verification City'
        }, authHeaders);
        console.log('OK');

        // 2. Verify Update
        process.stdout.write('2. Verifying Profile Update... ');
        const profileRes = await axios.get(`${API_URL}/settings/profile`, authHeaders);
        if (profileRes.data.hospital_name === 'TEST HOSPITAL HUB') {
            console.log('OK (Name Updated)');
        } else {
            console.log(`FAILED (Name mismatch: ${profileRes.data.hospital_name})`);
        }

        // 3. Get Services (Rate Card)
        process.stdout.write('3. Fetching Rate Card... ');
        const svcRes = await axios.get(`${API_URL}/settings/services`, authHeaders);
        const service = svcRes.data[0]; // Get first service
        console.log(`OK (Found ${svcRes.data.length} services)`);

        if (service) {
            // 4. Update Price
            const newPrice = Number(service.base_price) + 10;
            process.stdout.write(`4. Updating Price for ${service.name} to ${newPrice}... `);
            await axios.put(`${API_URL}/settings/services/price`, {
                id: service.id,
                base_price: newPrice
            }, authHeaders);
            console.log('OK');

            // 5. Verify Price
            process.stdout.write('5. Verifying Price Update... ');
            const svcRes2 = await axios.get(`${API_URL}/settings/services`, authHeaders);
            const updatedService = svcRes2.data.find(s => s.id === service.id);
            if (Number(updatedService.base_price) === newPrice) {
                console.log('OK (Price Updated)');
            } else {
                console.log(`FAILED (Price: ${updatedService.base_price})`);
            }
        } else {
            console.log('SKIPPED (No services found to test price update)');
        }

    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        console.error(error.response?.data);
    } finally {
        process.exit(0);
    }
}

testSettingsFlow();
