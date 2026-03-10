const axios = require('axios');

// Configuration
const SERVER_URL = 'http://localhost:5000';
const ADMIN_CREDENTIALS = {
    username: 'audit_tester',
    password: 'auditpass123'
};
const GUARD_CREDENTIALS = {
    username: 'guard_sim', 
    password: 'password123',
    role: 'security_guard'
};

const START_LOC = { lat: 28.6139, lng: 77.2090 }; // Center

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runSimulation = async () => {
    console.log('🚀 Starting Wolf Guard Traffic Simulator...');
    console.log(`Target: ${SERVER_URL}`);
    
    // 1. Authenticate as Admin to provision credentials
    let adminToken;
    try {
        console.log('🛡️  Authenticating as Admin (audit_tester)...');
        const loginRes = await axios.post(`${SERVER_URL}/api/auth/login`, ADMIN_CREDENTIALS);
        adminToken = loginRes.data.token;
        console.log('✅ Admin Access Granted.');
    } catch (err) {
        console.error('❌ Admin Auth Failed:', err.message);
        console.log('Make sure "audit_tester" exists. Run "node server/scripts/create_audit_user.js" if needed.');
        process.exit(1);
    }

    // 2. Provision/Ensure Guard Account
    try {
        console.log('👤 Provisioning Simulation Guard...');
        // Try creating user (Active by default via Admin API)
        try {
            await axios.post(`${SERVER_URL}/api/auth/register`, {
                username: GUARD_CREDENTIALS.username,
                password: GUARD_CREDENTIALS.password,
                role: 'security_guard',
                full_name: 'Simulated Officer (Bot)',
                department: 'Security',
                email: 'guard_sim@wolfsecurity.in'
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            console.log('✅ Guard Account Created.');
        } catch (e) {
            if (e.response && e.response.status === 400) { // Likely "User already exists"
                 console.log('ℹ️  Guard account already exists (proceeding).');
            } else {
                 throw e;
            }
        }
    } catch (err) {
        console.error('❌ Provisioning Failed:', err.message);
        if(err.response) console.error(JSON.stringify(err.response.data));
        process.exit(1);
    }

    // 3. Login as Guard
    let guardToken;
    try {
        console.log('🔑 Authenticating as Guard...');
        const loginRes = await axios.post(`${SERVER_URL}/api/auth/login`, {
             username: GUARD_CREDENTIALS.username,
             password: GUARD_CREDENTIALS.password
        });
        guardToken = loginRes.data.token;
        console.log('✅ Guard Online. Starting Patrol.');
    } catch (err) {
        console.error('❌ Guard Login Failed:', err.message);
        process.exit(1);
    }

    // 4. Start Telemetry Loop
    console.log('📡 Connected to Matrix. Sending telemetry...');
    let step = 0;
    
    while (true) {
        step++;
        // Generate a smooth path (Circle)
        const latOffset = Math.sin(step * 0.1) * 0.003;
        const lngOffset = Math.cos(step * 0.1) * 0.003;

        const payload = {
            latitude: START_LOC.lat + latOffset,
            longitude: START_LOC.lng + lngOffset,
            accuracy: 5 + Math.random() * 5,
            heading: (step * 10) % 360,
            speed: 1.5,
            isOfflineSync: false,
            batteryLevel: 0.95 - (step * 0.0001), // Slowly draining
            signalStrength: -60 + Math.floor(Math.random() * 10),
            steps: 1000 + step
        };

        try {
            await axios.post(`${SERVER_URL}/api/security/location`, payload, {
                headers: { Authorization: `Bearer ${guardToken}` }
            });
            console.log(`[${step}] 📍 Ping: ${payload.latitude.toFixed(5)}, ${payload.longitude.toFixed(5)} | 🔋 ${(payload.batteryLevel*100).toFixed(1)}%`);
        } catch (err) {
            console.error('\n❌ Ping Failed:', err.message);
        }

        await sleep(2000); // 2 seconds
    }
};

runSimulation();
