/**
 * Simple Telnet Client
 * Connects to Z3 console to check for banners or prompts
 */
const net = require('net');

const CONFIG = {
    host: '192.168.0.2',
    port: 23,
    timeout: 5000
};

console.log(`🔌 Connecting to Telnet ${CONFIG.host}:${CONFIG.port}...`);

const socket = new net.Socket();
socket.setTimeout(CONFIG.timeout);

socket.connect(CONFIG.port, CONFIG.host, () => {
    console.log('✅ Connected! Waiting for data...');
});

socket.on('data', (data) => {
    console.log('📥 RECEIVED:');
    console.log(data.toString());
    
    // Try sending a newline to provoke a prompt
    socket.write('\r\n');
});

socket.on('error', (err) => {
    console.error('❌ Error:', err.message);
});

socket.on('close', () => {
    console.log('🔌 Connection closed');
    process.exit(0);
});

socket.on('timeout', () => {
    console.log('⏱️ Timeout waiting for data');
    socket.destroy();
});
