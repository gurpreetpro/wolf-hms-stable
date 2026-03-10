const net = require('net');

const PORT = 10001;
const VT = Buffer.from([0x0b]);
const FS = Buffer.from([0x1c]);
const CR = Buffer.from([0x0d]);

const server = net.createServer((socket) => {
    console.log(`[Z3] Client connected: ${socket.remoteAddress}:${socket.remotePort}`);

    let buffer = Buffer.alloc(0);

    socket.on('data', (chunk) => {
        console.log(`[Z3] RECEIVED ${chunk.length} bytes`);
        console.log(`[Z3] RAW HEX: ${chunk.toString('hex')}`);
        
        buffer = Buffer.concat([buffer, chunk]);

        // Check for Framing
        // We look for VT (Start) and FS (End)
        let vtIndex = buffer.indexOf(VT);
        let fsIndex = buffer.indexOf(FS);

        while (vtIndex !== -1 && fsIndex !== -1 && fsIndex > vtIndex) {
            // Extract Message
            const rawMsg = buffer.slice(vtIndex + 1, fsIndex);
            
            // Handle Message
            handleMessage(socket, rawMsg);

            // Remove processed part from buffer
            // We also skip the FS and the following CR (0x0d) if present
            let nextStart = fsIndex + 1;
            if (buffer[nextStart] === 0x0d) nextStart++;
            
            buffer = buffer.slice(nextStart);
            
            // Re-check loops
            vtIndex = buffer.indexOf(VT);
            fsIndex = buffer.indexOf(FS);
        }
    });

    socket.on('end', () => console.log('[Z3] Client disconnected'));
    socket.on('error', (err) => console.error('[Z3] Socket error:', err));
});

function handleMessage(socket, rawBuffer) {
    const msgStr = rawBuffer.toString('utf8');
    console.log('------------------------------------------------');
    console.log('[Z3] PARSED MESSAGE:');
    console.log(msgStr);
    console.log('------------------------------------------------');

    // Parse MSH to get Message ID (Field 10)
    // MSH|^~\&|...
    const segments = msgStr.split('\r');
    const msh = segments.find(s => s.startsWith('MSH'));
    
    if (msh) {
        const fields = msh.split('|');
        // MSH is field 0? No, "MSH" is segment name. 
        // fields[0] = "MSH"
        // fields[1] = Field Separator (usually |) - wait, split consumes it.
        // Actually: MSH|^~\&|...
        // MSH components:
        // 1: Field Separator (|)
        // 2: Encoding Characters (^~\&)
        // 3: Sending Application
        // 4: Sending Facility
        // 5: Receiving Application
        // 6: Receiving Facility
        // 7: Date/Time
        // 8: Security
        // 9: Message Type (ORU^R01)
        // 10: Message Control ID (CRITICAL for ACK)
        
        const msgControlId = fields[9]; // Array is 0-indexed. "MSH" is part of string? 
        // If string is "MSH|^~\&|...", split('|') -> ["MSH", "^~\&", "Z3", ...]
        // So MSH-1 is |, MSH-2 is ^~\&
        // Index 2 = MSH-3
        // Index 9 = MSH-10 ? Let's verify.
        
        // Example: MSH|^~\&|Z3|Zybio|||2018...||ORU^R01|MSGID123|P|2.3.1
        // Split:
        // 0: MSH
        // 1: ^~\& (MSH-2)
        // 2: Z3 (MSH-3)
        // 3: Zybio (MSH-4)
        // 4: (MSH-5)
        // 5: (MSH-6)
        // 6: Date (MSH-7)
        // 7: (MSH-8)
        // 8: ORU^R01 (MSH-9)
        // 9: MSGID123 (MSH-10) -> THIS IS IT.
        
        const msgId = fields[9];
        console.log(`[Z3] Message ID: ${msgId}`);

        // Send ACK
        sendAck(socket, msgId);
    }
}

function sendAck(socket, msgId) {
    const timestamp = new Date().toISOString().replace(/[-:T\.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
    
    // Construct ACK
    // MSH|^~\&|WolfHMS|LIS|Z3|Zybio|${timestamp}||ACK^R01|${msgId}|P|2.3.1
    // MSA|AA|${msgId}
    
    const ackMsh = `MSH|^~\\&|WolfHMS|LIS|Z3|Zybio|${timestamp}||ACK^R01|${msgId}|P|2.3.1`;
    const ackMsa = `MSA|AA|${msgId}`;
    
    const ackMsg = `${ackMsh}\r${ackMsa}\r`;
    
    // Frame it
    const packet = Buffer.concat([VT, Buffer.from(ackMsg, 'utf8'), FS, CR]);
    
    console.log(`[Z3] Sending ACK for ID ${msgId}`);
    socket.write(packet);
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Z3] UDP/TCP Listener ready on port ${PORT}`);
});

server.on('error', (err) => {
    console.error('[Z3] Server error:', err);
});
