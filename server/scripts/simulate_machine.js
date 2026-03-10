const net = require('net');
const { wrapMLLP } = require('../lib/hl7-parser');
const { pool } = require('../db');

const HOST = '127.0.0.1';
const PORT = 6000;

async function run() {
    try {
        console.log('🔍 Looking for pending lab orders...');
        // 1. Fetch valid Pending Order
        const res = await pool.query("SELECT id FROM lab_requests WHERE status = 'Pending' ORDER BY id DESC LIMIT 1");
        
        let orderId = '999';
        if (res.rows.length > 0) {
            orderId = res.rows[0].id;
            console.log(`✅ Found Pending Request #${orderId}`);
        } else {
            console.log('⚠️ No pending requests found. Using dummy ORDER999.');
        }

        const barcode = `ORDER${orderId}`; // Format used in HL7

        // Sample HL7 message (Sysmex XN-1000 Fast CBC)
        // Note: Using standard LOINC codes for WBC (6690-2), RBC (789-8), Hgb (718-7)
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0,14);
        
        const sampleMessage = `MSH|^~\\&|SYSMEX_XN|LAB|WOLF_HMS|HOSPITAL|${timestamp}||ORU^R01|MSG${Date.now()}|P|2.5
PID|1||101^^^MRN||DOE^JOHN||19800101|M
ORC|RE|${barcode}
OBR|1|${barcode}||6690-2^Complete Blood Count|||${timestamp}
OBX|1|NM|6690-2^WBC||12.5|10*3/uL|4.0-10.0|H||F
OBX|2|NM|789-8^RBC||4.50|10*6/uL|4.50-5.50|N||F
OBX|3|NM|718-7^HGB||14.0|g/dL|13.0-17.0|N||F`;

        const client = new net.Socket();

        console.log('🔌 Connecting to Wolf HL7 Receiver...');

        client.connect(PORT, HOST, () => {
            console.log('✅ Connected to Port 6000');
            
            // Wrap in MLLP and Send
            const payload = wrapMLLP(sampleMessage);
            console.log(`📤 Sending HL7 ORU^R01 (Size: ${payload.length} bytes) for ${barcode}...`);
            client.write(payload);
        });

        client.on('data', (data) => {
            console.log('📩 Received ACK from Server:');
            console.log(data.toString());
            
            if (data.toString().includes('MSA|AA')) {
                console.log('✅ ACK Success: Server accepted the results.');
            } else {
                console.log('⚠️ ACK Warning: Server might have rejected it.');
            }
            client.destroy();
            pool.end(); // Close DB connection
        });

        client.on('close', () => {
             console.log('🔌 Connection closed');
        });

        client.on('error', (err) => {
            console.error('❌ Socket Error:', err.message);
            pool.end();
        });

    } catch (err) {
        console.error('❌ Setup Error:', err);
        pool.end();
    }
}

run();
