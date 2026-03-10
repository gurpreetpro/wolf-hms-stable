/**
 * RAW SOCKET LISTENER
 * Dumps absolutely everything received to console
 */
const net = require('net');
const PORT = 10001;

console.log(`🔍 RAW LISTENER started on port ${PORT}`);
console.log('   Waiting for ANY data from Z3...');

const server = net.createServer((socket) => {
    console.log(`\n✅ Connected: ${socket.remoteAddress}:${socket.remotePort}`);
    
    socket.on('data', (data) => {
        console.log(`\n📥 RECEIVED ${data.length} BYTES:`);
        console.log('---------------------------------------------------');
        console.log('UTF-8 STRING:');
        console.log(data.toString('utf8'));
        console.log('---------------------------------------------------');
        console.log('HEX DUMP:');
        console.log(data.toString('hex').match(/../g).join(' '));
        console.log('---------------------------------------------------');
        
        // Send a generic HL7 ACK just in case it's waiting for one to start talking
        // Some instruments wait for a "Hello" or ACK before sending
        // MSH|^~\&|WOLF|LIS|Z3|INST|20230101000000||ack^R01|1|P|2.3.1
        // wrap in VT(0x0b) ... FS(0x1c)CR(0x0d)
        // const ack = '\x0bMSH|^~\\&|WOLF|LIS|Z3|INST|||ACK^R01|1|P|2.3.1\rMSA|AA|1\x1c\r';
        // socket.write(ack);
        // console.log('📤 Sent blind ACK');
    });

    socket.on('error', (err) => console.error('❌ Error:', err.message));
    socket.on('close', () => console.log('🔌 Disconnected'));
});

server.listen(PORT, '0.0.0.0');
