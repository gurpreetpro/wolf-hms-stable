const axios = require('axios');

async function scanHospitals() {
    console.log('Scanning Cloud for Hospitals...\n');
    
    // Try common hospital codes
    const codes = ['kokila', 'city', 'apollo', 'max', 'fortis', 'medanta', 'aiims', 'demo', 'test', 'hospital1', 'hospital2', 'wolfhms', 'default'];
    const found = [];
    
    for (const code of codes) {
        try {
            const r = await axios.get(`https://wolf-tech-server-708086797390.asia-south1.run.app/api/hospitals/branding/${code}`);
            if (r.data.success) {
                console.log(`✅ ${code}: ${r.data.data.name} (ID: ${r.data.data.id})`);
                found.push({ code, name: r.data.data.name, id: r.data.data.id });
            }
        } catch(e) {
            if (e.response?.status === 404) {
                console.log(`❌ ${code}: Not found`);
            } else {
                console.log(`⚠️ ${code}: Error - ${e.message}`);
            }
        }
    }
    
    console.log('\n========== SUMMARY ==========');
    console.log(`Total hospitals found: ${found.length}`);
    found.forEach(h => console.log(`  - ${h.name} (code: ${h.code}, id: ${h.id})`));
}

scanHospitals();
