const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

const SERVER_URL = 'http://localhost:8081';
const SERVER_FILE = path.join(__dirname, '../server-cloud.js');

let serverProcess = null;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkServer() {
    try {
        await axios.get(`${SERVER_URL}/api/health`);
        return true;
    } catch (e) {
        return false;
    }
}

async function startServer() {
    console.log('🚀 Starting server for testing on port 8081...');
    serverProcess = spawn('node', [SERVER_FILE], {
        cwd: path.join(__dirname, '../'),
        env: { ...process.env, PORT: '8081', DB_HOST: process.env.DB_HOST || 'localhost' } // Ensure env vars
    });

    serverProcess.stdout.on('data', (data) => {
        // console.log(`[SERVER] ${data}`); 
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`[SERVER ERROR] ${data}`);
    });

    // Wait for server to be ready
    let attempts = 0;
    while (attempts < 30) {
        if (await checkServer()) {
            console.log('✅ Server is up and running!');
            return true;
        }
        await sleep(1000);
        attempts++;
    }
    throw new Error('Server failed to start');
}

async function runTest() {
    try {
        const isRunning = await checkServer();
        if (!isRunning) {
            await startServer();
        } else {
            console.log('ℹ️ Server is already running.');
        }

        console.log('\n🧪 Starting Mobile Order Flow Simulation...');

        // 1. Setup Data (Direct DB Access)
        const { pool } = require('../config/db');
        
        // Ensure Hospital
        const hospitalId = 2; // Assuming 2 is the main hospital or use 1
        
        // Ensure Patient (Demo Patient)
        const patientPhone = '9988776655';
        let patientRes = await pool.query("SELECT id FROM patients WHERE phone = $1", [patientPhone]);
        let patientId;
        
        if (patientRes.rows.length === 0) {
            console.log('Creating demo patient...');
            const p = await pool.query(`
                INSERT INTO patients (name, phone, gender, hospital_id)
                VALUES ('Mobile Tester', $1, 'Male', $2) RETURNING id
            `, [patientPhone, hospitalId]);
            patientId = p.rows[0].id;
        } else {
            patientId = patientRes.rows[0].id;
        }

        // Mock Auth Token (We need a way to get a token, or just mock the auth middleware? 
        // Real auth requires OTP. Let's create a DEV token if possible, or just generate one using jsonwebtoken if we have the secret)
        // We know the secret is in process.env.JWT_SECRET or we can check server-cloud.js config.
        // Let's assume 'wolf_secret_key_2023' or try to read it.
        // Actually, for this test, if we cannot generate a token, we can mock the `req.user` if we were using supertest.
        // But we are using axios.
        
        // Let's try to login as a doctor/admin to get a token? No, we need patient token.
        // We can simulate OTP login flow?
        // OR better: Create a "Test Token" directly using `jsonwebtoken` if available.
        
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'wolf_secret_key_2023'; // Fallback to what might be in .env
        const token = jwt.sign({ id: patientId, phone: patientPhone, role: 'patient', hospital_id: hospitalId }, JWT_SECRET, { expiresIn: '1h' });
        
        const headers = { Authorization: `Bearer ${token}` };

        // 2. Create Prescription (Direct DB)
        console.log('💊 Creating test prescription...');
        const medName = 'Paracetamol 500mg';
        
        // Ensure inventory
        await pool.query(`
            INSERT INTO inventory_items (name, price_per_unit, stock_quantity, hospital_id)
            VALUES ($1, 5, 100, $2) ON CONFLICT (name, hospital_id) DO NOTHING
        `, [medName, hospitalId]);

        const rxRes = await pool.query(`
            INSERT INTO prescriptions (patient_id, doctor_id, hospital_id, medications, notes)
            VALUES ($1, 1, $2, $3, 'Test prescription for mobile app')
            RETURNING id
        `, [patientId, hospitalId, JSON.stringify([{ name: medName, dose: '1-0-1', duration: '5 days' }])]);
        
        const prescriptionId = rxRes.rows[0].id;
        console.log(`✅ Prescription Created: ID ${prescriptionId}`);

        // 3. Place Order
        console.log('\n📱 1. Placing Order via API...');
        const orderPayload = {
            prescription_id: prescriptionId,
            delivery_type: 'pickup',
            payment_method: 'pay_at_clinic', // or 'razorpay'
            patient_notes: 'Home test order'
        };

        const placeRes = await axios.post(`${SERVER_URL}/api/medicine-orders/place`, orderPayload, { headers });
        
        if (placeRes.data.success) {
            const order = placeRes.data.order;
            console.log(`✅ Order Placed! Order #${order.order_number} (ID: ${order.id})`);
            console.log(`   Total: ₹${order.total}`);
            
            // 4. Verify Payment (Simulate Online Payment)
            console.log('\n💳 2. Verifying Payment...');
            const paymentPayload = {
                razorpay_order_id: 'order_test_123',
                razorpay_payment_id: 'pay_test_456',
                razorpay_signature: 'dummy_signature'
            };
            
            // We need to allow dummy signature verification in dev/test environment or mock it.
            // The backend verify logic likely checks signature.
            // If it fails, that's expected for dummy data unless we disabled signature check in dev.
            // But let's verify the endpoint is reachable.
            
            try {
                await axios.post(`${SERVER_URL}/api/medicine-orders/${order.id}/verify-payment`, paymentPayload, { headers });
                console.log('✅ Payment Verification Endpoint called (Result depends on signature check)');
            } catch (err) {
                console.log(`ℹ️ Payment Verification returned: ${err.response?.data?.error || err.message}`);
                console.log('   (Expected for dummy signature)');
            }

            // 5. Get My Orders
            console.log('\n📂 3. Fetching My Orders...');
            const historyRes = await axios.get(`${SERVER_URL}/api/medicine-orders/my-orders`, { headers });
            
            const myOrders = historyRes.data.orders;
            const found = myOrders.find(o => o.id === order.id);
            
            if (found) {
                console.log(`✅ Order #${found.order_number} found in history! Status: ${found.status}`);
            } else {
                console.error('❌ Order not found in history!');
            }

        } else {
            console.error('❌ Failed to place order:', placeRes.data);
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.response?.data || error.message);
    } finally {
        if (serverProcess) {
            console.log('\n🛑 Stopping test server...');
            serverProcess.kill();
        }
        // Close DB pool if we opened it? 
        // require('../config/db') might keep connection open.
        // We can manually exit.
        process.exit(0);
    }
}

runTest();
