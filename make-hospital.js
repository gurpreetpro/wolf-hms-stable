const axios = require('axios');

const loginUrl = 'https://wolfhms-fdurncganq-el.a.run.app/api/users/login';
const deployUrl = 'https://wolfhms-fdurncganq-el.a.run.app/api/platform/deploy';

// User credentials (I verified these work for login)
const adminCreds = {
    username: 'developer',
    password: 'WolfDev2024!'
};

// Hospital Data from User's Screenshots
const payload = {
    hospital_name: "NEW KOKILA HOSPITAL",
    hospital_domain: "newkokila.wolfhms.com", 
    admin_email: "gurpreetpc@gmail.com",
    admin_username: "admin_newkokila",
    admin_password: "Hospital123!",
    admin_password: "Hospital123!", // Setting a default strong password for them
    plan: "small" // Matches "Small Hospital" selection
};

async function run() {
    try {
        console.log('Logging in as developer...');
        const loginRes = await axios.post(loginUrl, adminCreds);
        const token = loginRes.data.data.token;
        console.log('Logged in. Token obtained.');
        console.log('Developer Email:', loginRes.data.data.user.email); // Verify it is 'developer@wolfhms.com'

        console.log('Deploying hospital...');
        const deployRes = await axios.post(deployUrl, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('SUCCESS! Hospital Created:', JSON.stringify(deployRes.data, null, 2));

    } catch (err) {
        if (err.response) {
            console.error('STATUS:', err.response.status);
            console.error('MSG:', err.response.data.message);
            require('fs').writeFileSync('error.json', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error('Error:', err.message);
        }
    }
}

run();
