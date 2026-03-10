/**
 * 🐺 WolfBridge Edge Agent (Simulation)
 * 
 * This service runs INSIDE the hospital firewall (e.g., on a localized PC).
 * It acts as the bridge between Physical Modalities (CT/MRI) and Wolf HMS Cloud.
 * 
 * Functions:
 * 1. Polls Cloud API for 'Scheduled' Radiology Orders.
 * 2. Caches Worklist locally (RIS -> Edge).
 * 3. Simulates a Modality (CT Scanner) querying for patients (MWL).
 * 4. Simulates a Scan Completion event (Edge -> Cloud).
 */

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

// Configuration
const API_URL = 'http://localhost:5000/api';
const HOSPITAL_CODE = 'default'; // In real life, this is specific to the hospital
const POLLING_INTERVAL = 5000; // 5 seconds

// State
let authToken = null;
let worklistCache = [];

// 1. Authenticate as "WolfBridge System"
async function login() {
    try {
        // We use the admin account for simulation, or a dedicated 'bridge_bot'
        const res = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@wolfhms.com', 
            password: 'admin123_change_in_prod',
            hospital_code: HOSPITAL_CODE
        });
        authToken = res.data.token;
        console.log('🔐 [WolfBridge] Connected to Cloud. Token acquired.');
    } catch (err) {
        console.error('❌ [WolfBridge] Login Failed:', err.response ? err.response.data : err.message);
        if (err.code === 'ECONNREFUSED') {
            console.error('   -> Server is NOT running on localhost:5000');
        }
        process.exit(1);
    }
}

// 2. Poll Worklist (Cloud -> Edge)
async function syncWorklist() {
    if (!authToken) return;
    
    try {
        const res = await axios.get(`${API_URL}/ris/worklist?status=Scheduled`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        const newOrders = res.data.data;
        if (newOrders.length !== worklistCache.length) {
             console.log(`📡 [WolfBridge] Sync: Received ${newOrders.length} orders from Cloud.`);
             console.table(newOrders.map(o => ({ 
                 ACC: o.accession_number, 
                 Patient: o.patient_name, 
                 Modality: o.modality 
             })));
        }
        
        worklistCache = newOrders;
        
    } catch (err) {
        console.error('⚠️ [WolfBridge] Sync Failed:', err.message);
    }
}

// 3. Simulate Modality Query (Machine -> Edge)
function simulateModalityQuery(modalityType) {
    console.log(`\n🔎 [Scanner ${modalityType}] Querying Worklist (C-FIND)...`);
    const matches = worklistCache.filter(o => o.modality === modalityType);
    
    if (matches.length > 0) {
        console.log(`✅ [Edge Agent] Sending ${matches.length} matches to Scanner:`);
        matches.forEach(m => console.log(`   - [${m.accession_number}] ${m.patient_name} (${m.study_description})`));
        return matches[0]; // Return first match to simulate scanning it
    } else {
        console.log(`🚫 [Edge Agent] No scheduled patients for ${modalityType}.`);
        return null;
    }
}

// 4. Simulate Scan Completion (Edge -> Cloud)
async function completeScan(order) {
    console.log(`\n📸 [Scanner ${order.modality}] Scanning Patient ${order.patient_name}...`);
    console.log(`   - Accession: ${order.accession_number}`);
    console.log(`   - Generating DICOM Instances... (Simulated)`);
    
    // Simulate latency
    await new Promise(r => setTimeout(r, 2000));
    
    const fakeStudyUid = `1.2.840.113.${Date.now()}`;
    const fakePacsLink = `http://orthanc-local:8042/studies/${fakeStudyUid}`;
    
    console.log(`✅ [Scanner] Scan Complete. Images sent to Orthanc.`);
    
    // Notify Cloud
    try {
        await axios.patch(`${API_URL}/ris/orders/${order.id}/status`, {
            status: 'Completed',
            study_instance_uid: fakeStudyUid,
            pacs_link: fakePacsLink
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log(`☁️ [WolfBridge] Uploaded Status to Cloud: COMPLETED.`);
    } catch (err) {
        console.error('❌ [WolfBridge] Failed to update status:', err.message);
    }
}

// Main Loop
async function run() {
    console.log('🐺 WolfBridge Edge Agent v1.0 Starting...');
    await login();
    
    // Initial Sync
    await syncWorklist();
    
    // Simulation Scenario:
    // 1. Create a dummy order if empty (We assume E2E test data might exist or we wait)
    if (worklistCache.length === 0) {
        console.log('⏳ [WolfBridge] Worklist empty. Waiting for orders...');
        // In a real test, we would hit the API to create an order here, 
        // but let's assume the user acts as the doctor.
    } else {
        // 2. Simulate CT Scanner picking up the first job
        const job = simulateModalityQuery('CT');
        if (job) {
            await completeScan(job);
        }
    }
    
    // Keep alive for a bit to show polling
    setInterval(syncWorklist, POLLING_INTERVAL);
}

run();
