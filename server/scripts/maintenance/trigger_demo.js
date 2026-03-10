const axios = require('axios');

async function triggerDemoLogin() {
    try {
        console.log('🔄 Triggering Demo Login to create users...');
        const res = await axios.post('http://localhost:5000/api/auth/demo-login');

        console.log('✅ Demo Login Success!');
        console.log('CREATED USERS:', res.data.demoUsersCreated);
        console.log('\n🔑 Created Admin Credential:');
        console.log('   Username: demo_admin');
        console.log('   Password: demo123');
        console.log('\n(Try logging in with these now)');

    } catch (err) {
        console.error('❌ Error triggering demo login:', err.message);
        if (err.response) {
            console.error('Data:', err.response.data);
            console.error('Status:', err.response.status);
        }
    }
}

triggerDemoLogin();
