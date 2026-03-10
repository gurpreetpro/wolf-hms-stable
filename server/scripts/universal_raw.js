/**
 * UNIVERSAL RAW LISTENER
 * Listens on ALL common ports (including 10001) and dumps info
 */
const net = require('net');

const PORTS = [10001, 5000, 5001, 8000, 6000, 3000];

console.log('👂 UNIVERSAL RAW LISTENER STARTED');
console.log('   Listening on:', PORTS.join(', '));

PORTS.forEach(port => {
    const server = net.createServer((socket) => {
        console.log(`\n✅ CONNECTION ON PORT ${port} from ${socket.remoteAddress}`);
        
        socket.on('data', (data) => {
            console.log(`\n📥 DATA ON PORT ${port} (${data.length} bytes):`);
            console.log(data.toString());
            console.log('HEX:', data.toString('hex'));
            
            // Send HL7 ACK blindly
            const ack = `\x0bMSH|^~\\&|WOLF|LIS|Z3|INST|${new Date().toISOString().replace(/[-:T]/g,'').slice(0,14)}||ACK^R01|1|P|2.3.1\rMSA|AA|1\x1c\r`;
            socket.write(ack);
        });

        socket.on('error', (err) => console.error(`❌ Error on ${port}:`, err.message));
    });

    server.listen(port, '0.0.0.0', () => {});
    server.on('error', (err) => {
        if (err.code !== 'EADDRINUSE') console.log(`   ❌ Port ${port} error:`, err.message);
    });
});
