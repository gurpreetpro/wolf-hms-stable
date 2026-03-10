const io = require('socket.io-client');

// Connect two clients
const clientA = io('http://localhost:5000', { path: '/socket.io' });
const clientB = io('http://localhost:5000', { path: '/socket.io' });

const ROOM_ID = 'test-room-123';

console.log('🧪 Testing WebRTC Signaling...');

clientA.on('connect', () => {
    console.log(`✅ Client A connected (${clientA.id})`);
    clientA.emit('join-call', ROOM_ID);
});

clientB.on('connect', () => {
    console.log(`✅ Client B connected (${clientB.id})`);
    // Join slightly later to ensure A is ready
    setTimeout(() => {
        clientB.emit('join-call', ROOM_ID);
    }, 500);
});

// A should see B join
clientA.on('user-connected', (userId) => {
    console.log(`[A] Peer connected: ${userId}`);
    console.log('[A] Sending Offer...');
    clientA.emit('offer', { target: userId, sdp: 'fake-sdp-offer' });
});

// B should receive offer
clientB.on('offer', (data) => {
    console.log(`[B] Received Offer from ${data.caller}`);
    console.log('[B] Sending Answer...');
    clientB.emit('answer', { target: data.caller, sdp: 'fake-sdp-answer' });
});

// A should receive answer
clientA.on('answer', (data) => {
    console.log(`[A] Received Answer from ${data.caller}`);
    console.log('✅ SIGNALING SUCCESS!');
    clientA.disconnect();
    clientB.disconnect();
    process.exit(0);
});

// Handle timeouts
setTimeout(() => {
    console.error('❌ Timeout waiting for signaling');
    process.exit(1);
}, 5000);
