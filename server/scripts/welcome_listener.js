/**
 * ACTIVE WELCOME LISTENER
 * Sends an ACK immediately upon connection to trigger data flow
 */
const net = require('net');

const PORTS = [10001, 5000, 5001];

// HL7 ACK Message
const VT = String.fromCharCode(0x0B);
const FS = String.fromCharCode(0x1C);
const CR = String.fromCharCode(0x0D);
const TIMESTAMP = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);

const ACK_MESSAGE = `${VT}MSH|^~\\&|WOLF_HMS|LIS|Z3|INST|${TIMESTAMP}||ACK^R01|1|P|2.3.1\rMSA|AA|1|Welcome${FS}${CR}`;

console.log('👋 ACTIVE WELCOME LISTENER STARTED');
console.log('   Will send ACK immediately upon connection.');

PORTS.forEach(port => {
    const server = net.createServer((socket) => {
        console.log(`\n✨ CONNECTED on port ${port} from ${socket.remoteAddress}`);
        
        // Send Welcome ACK immediately
        socket.write(ACK_MESSAGE);
        console.log('   📤 Sent Welcome ACK');
        
        socket.on('data', (data) => {
            console.log(`\n📥 RECEIVED DATA (${data.length} bytes):`);
            console.log(data.toString());
            
            // Send ACK for received data too
            socket.write(ACK_MESSAGE);
            console.log('   📤 Sent Reply ACK');
        });

        socket.on('error', (err) => console.error(`   ❌ Error: ${err.message}`));
    });

    server.listen(port, '0.0.0.0', () => {});
    server.on('error', (err) => {
        if (err.code !== 'EADDRINUSE') console.log(`   ❌ Port ${port} setup error: ${err.message}`);
    });
});
