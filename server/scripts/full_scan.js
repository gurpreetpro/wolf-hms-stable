/**
 * Fast Full Port Scanner
 * Scans 1-10000 on Z3
 */
const net = require('net');

const IP = '192.168.0.2';
const BATCH_SIZE = 100;
const TIMEOUT = 400;

console.log(`🚀 Scanning ports 1-10000 on ${IP}...`);

async function scanRange(start, end) {
    const promises = [];
    for (let port = start; port <= end; port++) {
        promises.push(new Promise(resolve => {
            const socket = new net.Socket();
            socket.setTimeout(TIMEOUT);
            
            socket.on('connect', () => {
                process.stdout.write(`\n✅ OPEN: ${port}`);
                socket.destroy();
                resolve(port);
            });
            
            socket.on('timeout', () => { socket.destroy(); resolve(null); });
            socket.on('error', () => { socket.destroy(); resolve(null); });
            
            socket.connect(port, IP);
        }));
    }
    return Promise.all(promises);
}

async function main() {
    for (let i = 1; i <= 10000; i += BATCH_SIZE) {
        process.stdout.write('.');
        await scanRange(i, Math.min(i + BATCH_SIZE - 1, 10000));
    }
    console.log('\nScan complete.');
}

main();
