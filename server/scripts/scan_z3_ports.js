/**
 * Scan Zybio Z3 for open ports
 * Checks common LIS/HL7 ports
 */
const net = require('net');

const Z3_IP = '192.168.0.2';
const COMMON_PORTS = [5000, 5001, 8000, 8080, 4000, 3000, 2575, 6000, 7000, 9000, 80, 23, 22];

console.log(`🔍 Scanning Zybio Z3 at ${Z3_IP} for open ports...\n`);

let found = 0;

function scanPort(port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        
        socket.on('connect', () => {
            console.log(`✅ Port ${port} is OPEN`);
            found++;
            socket.destroy();
            resolve(true);
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        
        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });
        
        socket.connect(port, Z3_IP);
    });
}

async function main() {
    for (const port of COMMON_PORTS) {
        process.stdout.write(`  Checking port ${port}... `);
        const open = await scanPort(port);
        if (!open) console.log('closed');
    }
    
    console.log(`\n📊 Scan complete. Found ${found} open port(s).`);
    
    if (found === 0) {
        console.log('\n⚠️ No common ports found open. The Z3 might:');
        console.log('   - Be in Client mode (it connects to LIS, not the other way)');
        console.log('   - Use a non-standard port');
        console.log('   - Need LIS to be enabled in settings');
    }
}

main();
