const net = require('net');
const EventEmitter = require('events');

// ASTM Control Characters
const ENQ = Buffer.from([0x05]);
const ACK = Buffer.from([0x06]);
const NAK = Buffer.from([0x15]);
const EOT = Buffer.from([0x04]);
const STX = 0x02;
const ETX = 0x03;
const ETB = 0x17;
const CR = 0x0D;
const LF = 0x0A;

class LISService extends EventEmitter {
    constructor() {
        super();
        this.server = null;
        this.clients = new Map();
        this.resultsBuffer = []; // Temporary in-memory storage for results
    }

    start(port = 5100) {
        this.server = net.createServer((socket) => {
            const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
            console.log(`[LIS] Instrument connected: ${clientAddress}`);
            this.clients.set(clientAddress, socket);

            // Buffer for incoming data chunks
            let dataBuffer = Buffer.alloc(0);

            socket.on('data', (chunk) => {
                // console.log(`[LIS] RX: ${chunk.toString('ascii')}`); // Debug log
                
                // Handle ENQ (Handshake start)
                if (chunk.includes(ENQ)) {
                    // console.log('[LIS] Received ENQ, sending ACK');
                    socket.write(ACK);
                    return;
                }

                // Handle EOT (Transmission End)
                if (chunk.includes(EOT)) {
                    console.log('[LIS] Received EOT. Transmission complete.');
                    socket.write(ACK); // Acknowledge end
                    return;
                }

                // Append chunk to buffer
                dataBuffer = Buffer.concat([dataBuffer, chunk]);

                // Process frames ending with CR+LF or ETX
                this.processBuffer(dataBuffer, socket);
                dataBuffer = Buffer.alloc(0); // Clear buffer (simplified for now, ideally handle partial frames)
            });

            socket.on('end', () => {
                console.log(`[LIS] Client disconnected: ${clientAddress}`);
                this.clients.delete(clientAddress);
            });

            socket.on('error', (err) => {
                console.error(`[LIS] Error on connection ${clientAddress}:`, err);
            });
        });

        this.server.listen(port, () => {
            console.log(`[LIS] Server listening on port ${port}`);
        });
    }

    processBuffer(buffer, socket) {
        // Simple line parser - Split by LF
        const rawData = buffer.toString('ascii');
        const lines = rawData.split(/\r\n|\n|\r/);

        lines.forEach(line => {
             // ASTM frames start with number (after STX)
             // Clean STX, ETX, Checksum
             const cleanLine = line.replace(/[\x02\x03]/g, ''); 
             
             if (cleanLine.length < 3) return;

             // Acknowledge receipt of frame
             socket.write(ACK);

             this.parseASTMRecord(cleanLine);
        });
    }

    parseASTMRecord(record) {
        // ASTM records usually look like: 1H|\^&|||...
        // 2P|1||12345||Doe^John...
        // 3O|1|sampleID...
        // 4R|1|^^^WBC|10.5|10^3/uL|...
        
        // Remove frame sequence number at start (e.g. "4") if present together with record type
        // Actually, standard is [STX] [Frame#] [Record Type] ...
        // Simplification: Split by pipe |
        
        const fields = record.split('|');
        let recordType = fields[0];
        
        // Sometimes frame number is attached, e.g. "1H", "2P", "3O", "4R"
        // Get the last character of the first field as record type
        if (recordType.length > 1 && /\d[A-Z]/.test(recordType)) {
             recordType = recordType.slice(-1); // Take last char, e.g. 'R' from '4R'
        }

        switch (recordType) {
            case 'H': // Header
                // console.log('[LIS] Header Record');
                break;
            case 'P': // Patient
                const patientName = fields[5]; // Standard P index for name
                // console.log(`[LIS] Patient: ${patientName}`);
                break;
            case 'O': // Order
                // console.log('[LIS] Order Record');
                break;
            case 'R': // Result
                // Format: R|seq|^^^TestName|Value|Units|Range...
                const testCodeRaw = fields[2]; // ^^^WBC
                const value = fields[3];
                const unit = fields[4];
                
                // Extract clean test name
                const testName = testCodeRaw.split('^').pop() || testCodeRaw;

                const resultObj = {
                    test_name: testName,
                    value: value,
                    unit: unit,
                    timestamp: new Date()
                };

                console.log(`[LIS] Parsed Result: ${testName} = ${value} ${unit}`);
                
                // Store in buffer
                this.resultsBuffer.unshift(resultObj);
                
                // Emit event for real-time frontend updates via Socket.IO
                this.emit('result', resultObj);
                break;
            case 'L': // Terminator
                // console.log('[LIS] Terminator Record');
                break;
            default:
                // console.log(`[LIS] Unknown Record Type: ${recordType}`);
        }
    }

    getLatestResults() {
        // Return last 20 results
        return this.resultsBuffer.slice(0, 20);
    }
}

// Singleton instance
const lisService = new LISService();
module.exports = lisService;
