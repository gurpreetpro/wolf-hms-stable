/**
 * Test Nurse Dashboard API endpoints for consumables and services
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

async function testNurseDashboardAPIs() {
    console.log('🔍 Testing Nurse Dashboard API Connections...\n');
    
    try {
        // Step 1: Login as nurse
        console.log('1️⃣ Logging in as nurse_user...');
        const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
            username: 'nurse_user',
            password: 'password123'
        });
        
        if (!loginRes.data.token) {
            throw new Error('Login failed - no token received');
        }
        
        const token = loginRes.data.token;
        console.log('   ✅ Login successful\n');
        
        const headers = { Authorization: `Bearer ${token}` };
        
        // Step 2: Get consumables catalog
        console.log('2️⃣ Fetching consumables catalog (/api/ward/consumables)...');
        const consumablesRes = await axios.get(`${BASE_URL}/api/ward/consumables`, { headers });
        const consumables = consumablesRes.data.data?.consumables || consumablesRes.data.consumables || [];
        console.log(`   ✅ Found ${consumables.length} consumables`);
        if (consumables.length > 0) {
            console.log('   Sample items:');
            consumables.slice(0, 3).forEach(c => console.log(`      - ${c.name} (Rs.${c.price})`));
        }
        console.log('');
        
        // Step 3: Get services catalog  
        console.log('3️⃣ Fetching services catalog (/api/ward/charges)...');
        const servicesRes = await axios.get(`${BASE_URL}/api/ward/charges`, { headers });
        const services = servicesRes.data.data?.charges || servicesRes.data.charges || [];
        console.log(`   ✅ Found ${services.length} services`);
        if (services.length > 0) {
            console.log('   Sample items:');
            services.slice(0, 3).forEach(s => console.log(`      - ${s.name} (Rs.${s.price})`));
        }
        console.log('');
        
        // Step 4: Get admitted patients
        console.log('4️⃣ Fetching admitted patients (/api/nurse/ward)...');
        const wardRes = await axios.get(`${BASE_URL}/api/nurse/ward`, { headers });
        const admissions = wardRes.data.data?.admissions || wardRes.data.admissions || [];
        console.log(`   ✅ Found ${admissions.length} admitted patients`);
        
        if (admissions.length > 0) {
            const patient = admissions[0];
            console.log(`   Testing with patient: ${patient.patient_name} (Admission: ${patient.admission_id})`);
            
            // Step 5: Test patient consumables endpoint
            console.log(`\n5️⃣ Fetching patient consumables (/api/nurse/consumables/${patient.admission_id})...`);
            try {
                const patConRes = await axios.get(`${BASE_URL}/api/nurse/consumables/${patient.admission_id}`, { headers });
                const patCons = patConRes.data.data?.consumables || patConRes.data.consumables || [];
                console.log(`   ✅ Patient has ${patCons.length} consumable records`);
            } catch (e) {
                console.log(`   ⚠️ Error: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
            }
            
            // Step 6: Test patient services endpoint
            console.log(`\n6️⃣ Fetching patient services (/api/nurse/services/${patient.admission_id})...`);
            try {
                const patSrvRes = await axios.get(`${BASE_URL}/api/nurse/services/${patient.admission_id}`, { headers });
                const patSrvs = patSrvRes.data.data?.services || patSrvRes.data.services || [];
                console.log(`   ✅ Patient has ${patSrvs.length} service records`);
            } catch (e) {
                console.log(`   ⚠️ Error: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
            }
        } else {
            console.log('   ⚠️ No admitted patients found - cannot test patient-specific endpoints');
        }
        
        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 SUMMARY');
        console.log('='.repeat(50));
        console.log(`   Consumables API: ${consumables.length > 0 ? '✅ CONNECTED' : '❌ NO DATA'}`);
        console.log(`   Services API: ${services.length > 0 ? '✅ CONNECTED' : '❌ NO DATA'}`);
        console.log(`   Ward Patients: ${admissions.length} admitted`);
        
        if (consumables.length > 0 && services.length > 0) {
            console.log('\n🎉 Nurse Dashboard is properly connected to the database!');
        } else {
            console.log('\n⚠️ Some data is missing - check seed scripts');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testNurseDashboardAPIs();
