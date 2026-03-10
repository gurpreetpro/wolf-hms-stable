const net = require('net');

// Configuration
const HOST = '127.0.0.1';
const PORT = 5100;

// ASTM Control Characters
const ENQ = Buffer.from([0x05]);
const STX = '\x02';
const ETX = '\x03';
const CR = '\x0D';
const LF = '\x0A';
const EOT = Buffer.from([0x04]);

// Sample Data Frames (Sysmex Style)
// H: Header, P: Patient, O: Order, R: Results, L: Terminator
const FRAMES = [
    `1H|\\^&|||Sysmex^XN-1000||||||||E1394`,
    `2P|1||12345||Doe^John^||19800101|M`,
    `3O|1|SID001||^^^CBC|R||||||N||||||||||||||O`,
    `4R|1|^^^WBC|7.5|10^3/uL||N||F||||20261011120000`,
    `5R|2|^^^RBC|4.85|10^6/uL||N||F||||20261011120000`,
    `6R|3|^^^HGB|14.2|g/dL||N||F||||20261011120000`,
    `7R|4|^^^PLT|255|10^3/uL||N||F||||20261011120000`,
    `8L|1|N`
];

const client = new net.Socket();

console.log(`[MockAnalyzer] Connecting to ${HOST}:${PORT}...`);

client.connect(PORT, HOST, function() {
    console.log('[MockAnalyzer] Connected!');
    startTransmission();
});

client.on('data', function(data) {
    // console.log(`[MockAnalyzer] RX: ${data.toString('hex')}`);
    
    // Server sent ACK (0x06)?
    if (data.includes(0x06)) {
        sendNextFrame();
    }
});

client.on('close', function() {
    console.log('[MockAnalyzer] Connection closed');
});

let frameIndex = 0;

function startTransmission() {
    // 1. Send ENQ to request connection
    console.log('[MockAnalyzer] Sending ENQ...');
    client.write(ENQ);
}

function sendNextFrame() {
    if (frameIndex < FRAMES.length) {
        let frameBody = FRAMES[frameIndex];
        // Construct frame: <STX> [Frame#] [Body] <CR><ETX> [Checksum] <CR><LF>
        // Simplified for this mock: <STX> [Body] <CR><LF>
        // Note: Real ASTM checksum calculation is skipped for our permissive parser
        
        const packet = STX + frameBody + CR + LF;
        console.log(`[MockAnalyzer] Sending Frame ${frameIndex + 1}/${FRAMES.length}: ${frameBody.substring(0, 20)}...`);
        client.write(packet);
        frameIndex++;
    } else {
        // Transmission done, send EOT
        console.log('[MockAnalyzer] Sending EOT...');
        client.write(EOT);
        client.destroy(); // Close connection
    }
}
