/**
 * Zybio Z3 Listener - Standalone script to receive CBC results
 * Run: node scripts/start_zybio_listener.js [port]
 * Example: node scripts/start_zybio_listener.js 5000
 */
const { ZybioZ3Driver } = require('../lib/drivers/zybio-z3-driver');
const { Pool } = require('pg');
require('dotenv').config();

const PORT = parseInt(process.argv[2]) || 5000;

// Database connection
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

console.log('═══════════════════════════════════════════════════════');
console.log('  🔬 ZYBIO Z3 HEMATOLOGY ANALYZER LISTENER');
console.log('═══════════════════════════════════════════════════════');
console.log(`  📡 Listening on port: ${PORT}`);
console.log(`  🖥️  Your IP: 192.168.0.100`);
console.log(`  🔗 Z3 should connect to: 192.168.0.100:${PORT}`);
console.log('═══════════════════════════════════════════════════════');
console.log('');

// Create driver instance
const driver = new ZybioZ3Driver({
    port: PORT,
    mode: 'server',  // We listen for Z3 to connect to us
    timeout: 60000
});

// Handle incoming results
driver.on('results', async (data) => {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║  📊 CBC RESULTS RECEIVED                              ║');
    console.log('╠═══════════════════════════════════════════════════════╣');
    console.log(`║  Barcode: ${data.barcode || 'N/A'}`);
    console.log(`║  Patient: ${data.patientName || data.patientId || 'Unknown'}`);
    console.log('╠═══════════════════════════════════════════════════════╣');
    
    // Display results
    const results = data.results || {};
    Object.entries(results).forEach(([key, val]) => {
        const value = typeof val === 'object' ? val.value : val;
        const unit = typeof val === 'object' ? val.unit : '';
        const flag = typeof val === 'object' && val.flag !== 'N' ? ` [${val.flag}]` : '';
        console.log(`║  ${key.padEnd(12)}: ${String(value).padStart(8)} ${unit}${flag}`);
    });
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    
    // Try to match barcode to lab request and save results
    try {
        if (data.barcode) {
            const labReq = await pool.query(
                "SELECT id, patient_id, test_name FROM lab_requests WHERE barcode = $1 AND status != 'Completed'",
                [data.barcode]
            );
            
            if (labReq.rows.length > 0) {
                const request = labReq.rows[0];
                console.log(`✅ Matched to Lab Request #${request.id} (${request.test_name})`);
                
                // Insert result
                await pool.query(
                    'INSERT INTO lab_results (request_id, result_json, technician_id) VALUES ($1, $2, $3)',
                    [request.id, JSON.stringify(data.results), 1]
                );
                
                // Update request status
                await pool.query(
                    "UPDATE lab_requests SET status = 'Completed', updated_at = NOW() WHERE id = $1",
                    [request.id]
                );
                
                console.log(`✅ Results saved to database!`);
            } else {
                console.log(`⚠️ No pending lab request found for barcode: ${data.barcode}`);
                console.log('   Results logged but not saved to database.');
            }
        }
    } catch (err) {
        console.error('Database error:', err.message);
    }
});

driver.on('connected', (info) => {
    console.log('✅ Zybio Z3 CONNECTED!', info.clientId || '');
});

driver.on('disconnected', (info) => {
    console.log('🔌 Z3 disconnected', info?.clientId || '');
});

driver.on('raw_message', (msg) => {
    console.log('📨 Raw HL7 message received (', msg.length, 'bytes)');
});

driver.on('error', (err) => {
    console.error('❌ Error:', err.message || err);
});

// Start listening
driver.start()
    .then(() => {
        console.log('✅ Listener started successfully!');
        console.log('');
        console.log('📌 CONFIGURE ZYBIO Z3:');
        console.log('   LIS Server IP: 192.168.0.100');
        console.log(`   LIS Port: ${PORT}`);
        console.log('   Protocol: HL7');
        console.log('   Mode: Client (Z3 connects to LIS)');
        console.log('');
        console.log('⏳ Waiting for results from Z3...');
        console.log('   (Press Ctrl+C to stop)\n');
    })
    .catch((err) => {
        console.error('❌ Failed to start listener:', err.message);
        process.exit(1);
    });

// Handle shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Stopping listener...');
    await driver.stop();
    await pool.end();
    console.log('Goodbye!');
    process.exit(0);
});
