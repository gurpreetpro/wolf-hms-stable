/**
 * Zybio Z3 Test Script - Simulates instrument sending CBC results
 * 
 * This script acts as a mock Zybio Z3 analyzer for testing
 * Run: node scripts/test_zybio_connection.js
 */
const net = require('net');

// HL7 Control Characters
const VT = String.fromCharCode(0x0B);  // Start Block
const FS = String.fromCharCode(0x1C);  // End Block
const CR = String.fromCharCode(0x0D);  // Carriage Return

// Configuration
const CONFIG = {
    host: process.argv[2] || '127.0.0.1',
    port: parseInt(process.argv[3]) || 5000
};

// Sample CBC Results (typical values)
const SAMPLE_RESULTS = {
    barcode: 'LAB' + String(Date.now()).slice(-8),
    patientId: 'P001',
    patientName: 'Demo^Patient',
    wbc: 7.5,
    rbc: 4.8,
    hgb: 14.2,
    hct: 42.0,
    plt: 250,
    mcv: 87.5,
    mch: 29.6,
    mchc: 33.8,
    rdw: 13.2,
    mpv: 9.5,
    lymph_pct: 32.0,
    mono_pct: 6.0,
    gran_pct: 62.0
};

/**
 * Build HL7 ORU^R01 Message
 */
function buildORUMessage(results) {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const msgControlId = 'MSG' + Date.now();
    
    const segments = [
        // MSH - Message Header
        `MSH|^~\\&|ZYBIO_Z3|LAB|WOLF_HMS|HOSPITAL|${timestamp}||ORU^R01|${msgControlId}|P|2.3.1`,
        
        // PID - Patient Identification
        `PID|1||${results.patientId}^^^MRN||${results.patientName}||19850115|M`,
        
        // ORC - Order Common
        `ORC|RE|${results.barcode}||||||||||`,
        
        // OBR - Observation Request
        `OBR|1|${results.barcode}|${results.barcode}|CBC^Complete Blood Count|||${timestamp}`,
        
        // OBX - Observation Results
        `OBX|1|NM|WBC^White Blood Cell Count||${results.wbc}|10^9/L|4.0-10.0|N||F`,
        `OBX|2|NM|RBC^Red Blood Cell Count||${results.rbc}|10^12/L|4.0-5.5|N||F`,
        `OBX|3|NM|HGB^Hemoglobin||${results.hgb}|g/dL|12.0-17.0|N||F`,
        `OBX|4|NM|HCT^Hematocrit||${results.hct}|%|36.0-50.0|N||F`,
        `OBX|5|NM|PLT^Platelet Count||${results.plt}|10^9/L|150-400|N||F`,
        `OBX|6|NM|MCV^Mean Corpuscular Volume||${results.mcv}|fL|80.0-100.0|N||F`,
        `OBX|7|NM|MCH^Mean Corpuscular Hemoglobin||${results.mch}|pg|27.0-32.0|N||F`,
        `OBX|8|NM|MCHC^Mean Corpuscular Hgb Conc||${results.mchc}|g/dL|32.0-36.0|N||F`,
        `OBX|9|NM|RDW^Red Cell Distribution Width||${results.rdw}|%|11.5-14.5|N||F`,
        `OBX|10|NM|MPV^Mean Platelet Volume||${results.mpv}|fL|7.0-11.0|N||F`,
        `OBX|11|NM|LYM%^Lymphocyte %||${results.lymph_pct}|%|20.0-40.0|N||F`,
        `OBX|12|NM|MON%^Monocyte %||${results.mono_pct}|%|2.0-8.0|N||F`,
        `OBX|13|NM|GRA%^Granulocyte %||${results.gran_pct}|%|50.0-70.0|N||F`
    ];
    
    return segments.join(CR);
}

/**
 * Wrap message in MLLP framing
 */
function wrapMLLP(message) {
    return VT + message + FS + CR;
}

/**
 * Simulate Zybio Z3 sending results
 */
async function simulateZ3() {
    console.log('🔬 Zybio Z3 Simulator');
    console.log('=====================\n');
    console.log(`Connecting to Wolf HMS at ${CONFIG.host}:${CONFIG.port}...\n`);
    
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        
        socket.connect(CONFIG.port, CONFIG.host, () => {
            console.log('✅ Connected to Wolf HMS\n');
            
            // Build and send ORU message
            const message = buildORUMessage(SAMPLE_RESULTS);
            const mllpMessage = wrapMLLP(message);
            
            console.log('📤 Sending CBC Results:');
            console.log(`   Barcode: ${SAMPLE_RESULTS.barcode}`);
            console.log(`   Patient: ${SAMPLE_RESULTS.patientName.replace('^', ' ')}`);
            console.log(`   WBC: ${SAMPLE_RESULTS.wbc} 10^9/L`);
            console.log(`   RBC: ${SAMPLE_RESULTS.rbc} 10^12/L`);
            console.log(`   HGB: ${SAMPLE_RESULTS.hgb} g/dL`);
            console.log(`   HCT: ${SAMPLE_RESULTS.hct} %`);
            console.log(`   PLT: ${SAMPLE_RESULTS.plt} 10^9/L`);
            console.log('');
            
            socket.write(mllpMessage);
        });
        
        socket.on('data', (data) => {
            const response = data.toString();
            console.log('📥 Received ACK from Wolf HMS');
            
            if (response.includes('MSA|AA')) {
                console.log('✅ Results accepted successfully!\n');
            } else if (response.includes('MSA|AE')) {
                console.log('⚠️ Results accepted with warnings\n');
            } else if (response.includes('MSA|AR')) {
                console.log('❌ Results rejected\n');
            }
            
            socket.destroy();
            resolve();
        });
        
        socket.on('error', (err) => {
            console.error(`❌ Connection error: ${err.message}`);
            console.log('\n📌 Make sure:');
            console.log('   1. Wolf HMS server is running');
            console.log('   2. Zybio Z3 instrument listener is started in Lab Dashboard');
            console.log(`   3. Listener is configured on port ${CONFIG.port}`);
            reject(err);
        });
        
        socket.on('close', () => {
            console.log('🔌 Connection closed');
        });
        
        socket.setTimeout(10000, () => {
            console.log('⏱️ Connection timeout');
            socket.destroy();
            reject(new Error('Timeout'));
        });
    });
}

// Run simulator
console.log('\n');
simulateZ3()
    .then(() => {
        console.log('\n🎉 Test completed successfully!');
        console.log('Check Lab Dashboard → Pending Queue for the new results.');
        process.exit(0);
    })
    .catch(() => {
        process.exit(1);
    });
