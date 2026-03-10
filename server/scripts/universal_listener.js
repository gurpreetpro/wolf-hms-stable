/**
 * Universal LIS Listener
 * Listens on multiple common LIS ports simultaneously to find where Z3 is sending data.
 */
const net = require('net');

const PORTS = [5000, 5001, 8000, 8080, 5100, 6000, 7000, 9000, 3000, 4000];
const SERVER_IP = '192.168.0.100'; // Our IP

console.log('👂 UNIVERSAL LISTENER STARTED');
console.log('   Detecting incoming Z3 connection...');
console.log('   Listening on ports:', PORTS.join(', '));
console.log('');

PORTS.forEach(port => {
    const server = net.createServer((socket) => {
        console.log(`\n✅ DETECTED CONNECTION ON PORT ${port}!`);
        console.log(`   Source: ${socket.remoteAddress}:${socket.remotePort}`);
        console.log('   Please note this port number for future configuration.');
        
        socket.on('data', (data) => {
            console.log(`\n📥 RECEIVED DATA ON PORT ${port}:`);
            console.log('----------------------------------------');
            console.log(data.toString());
            console.log('----------------------------------------');
        });

        socket.on('error', (err) => {
            console.error(`❌ Error on port ${port}:`, err.message);
        });
    });

    server.listen(port, '0.0.0.0', () => {
        // console.log(`   - Listening on ${port}`);
    });
    
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`   ⚠️ Port ${port} is busy (skipping)`);
        } else {
            console.error(`   ❌ Error starting on ${port}:`, err.message);
        }
    });
});
