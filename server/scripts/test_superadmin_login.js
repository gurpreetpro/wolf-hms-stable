const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testSuperAdminLogin() {
    console.log('=== Testing SuperAdmin Login ===\n');
    
    const axios = require('axios');
    
    try {
        const response = await axios.post('http://localhost:8080/api/auth/login', {
            identifier: 'gurpreetpro@gmail.com',
            password: 'password123'
        }, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('✅ Login SUCCESS!');
        console.log('   Status:', response.status);
        console.log('   Response Data:');
        console.log(JSON.stringify(response.data, null, 2));
        
        // Check if token is returned
        if (response.data.token || response.data.data?.token) {
            console.log('\n   ✅ JWT Token received!');
        } else {
            console.log('\n   ⚠️ No token in response - this may cause redirect to login');
        }
        
        // Check user role
        const user = response.data.user || response.data.data?.user;
        if (user) {
            console.log(`\n   User Role: ${user.role}`);
            console.log(`   User Hospital ID: ${user.hospital_id}`);
        }
        
    } catch (err) {
        console.log('❌ Login FAILED!');
        console.log('   Status:', err.response?.status);
        console.log('   Error:', err.response?.data || err.message);
    }
}

testSuperAdminLogin();
