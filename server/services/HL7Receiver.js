const net = require('net');
const { pool } = require('../db');
const logger = require('./Logger');
const { unwrapMLLP, parseORU, buildACK } = require('../lib/hl7-parser');

class HL7Receiver {
    constructor() {
        this.server = null;
        this.port = 6000;
        this.sockets = new Set();
    }

    /**
     * Start TCP Server for Lab Instruments
     */
    start(port = 6000) {
        this.port = port;
        this.server = net.createServer((socket) => this.handleConnection(socket));

        this.server.listen(this.port, () => {
             logger.info(`[HL7] 🔌 Universal Translator listening on port ${this.port} for MLLP`);
        });

        this.server.on('error', (err) => {
            logger.error(`[HL7] Server Error: ${err.message}`);
        });
    }

    /**
     * Handle individual machine connection
     */
    handleConnection(socket) {
        const remoteAddress = `${socket.remoteAddress}:${socket.remotePort}`;
        // logger.info(`[HL7] 📠 New Instrument Connected: ${remoteAddress}`);
        this.sockets.add(socket);

        let buffer = '';

        socket.on('data', async (chunk) => {
            // MLLP Framing: <VT> Message <FS><CR>
            // 0x0B (Start) ... 0x1C 0x0D (End)
            buffer += chunk.toString();

            // Check for complete frame
            if (buffer.includes('\x1c\x0d')) {
                const parts = buffer.split('\x1c\x0d');
                
                // Process all complete messages (chunks might contain multiple or partials)
                for (let i = 0; i < parts.length - 1; i++) {
                    const rawMsg = parts[i] + '\x1c\x0d'; // Re-add delimiters for parser if needed, or stripping logic
                     // Actually parser expects clean content or handles unwrapping
                    await this.processMessage(parts[i], socket);
                }

                // Keep remainder
                buffer = parts[parts.length - 1];
            }
        });

        socket.on('end', () => {
            // logger.info(`[HL7] 🔌 Disconnected: ${remoteAddress}`);
            this.sockets.delete(socket);
        });

        socket.on('error', (err) => {
            logger.error(`[HL7] Socket Error (${remoteAddress}): ${err.message}`);
            this.sockets.delete(socket);
        });
    }

    /**
     * Process a single HL7 Message
     */
    async processMessage(rawFrame, socket) {
        try {
            // 1. Clean message (remove VT/FS/CR)
            const cleanMessage = unwrapMLLP(rawFrame);
            if (!cleanMessage || cleanMessage.trim().length === 0) return;

            logger.info(`[HL7] 📩 Received ORU^R01 Message (${cleanMessage.length} bytes)`);

            // 2. Parse
            const parsed = parseORU(cleanMessage);
            
            if (parsed.results.length > 0) {
                logger.info(`[HL7] 🔬 Parsed ${parsed.results.length} results for Patient: ${parsed.patientName?.given} ${parsed.patientName?.family}`);
                
                // 3. Save to DB
                await this.saveResults(parsed);
            } else {
                logger.warn('[HL7] No results found in message');
            }

            // 4. Send ACK
            const ack = buildACK(cleanMessage);
            socket.write(ack);
            // logger.info('[HL7] 📤 ACK Sent');

        } catch (err) {
            logger.error(`[HL7] Processing Error: ${err.message}`);
            // Send Error ACK if possible, or just log
        }
    }

    /**
     * Save Results to Database
     */
    async saveResults(data) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const { patientId, results } = data;

            for (const res of results) {
                // Find request by barcode (Order ID)
                // Assuming barcode matches 'lab_requests.id' or we have a mapping. 
                // For now, let's assume `id::barcode` format or just try to match ID
                
                // Simple case: Barcode is the Request ID
                const requestId = res.barcode.replace(/\D/g, ''); // Extract numbers
                
                if (!requestId) {
                    logger.warn(`[HL7] Skipping result with invalid barcode: ${res.barcode}`);
                    continue;
                }

                logger.info(`[HL7] Saving result for Request #${requestId}: ${res.testName} = ${res.value}`);

                // Insert into lab_results
                // Note: Schema might need adjustment if we store individual analytes
                // Current schema: lab_results (result_json JSONB).
                // We will append to result_json or create new entry.
                
                // Check if result exists for this request
                const existing = await client.query('SELECT * FROM lab_results WHERE request_id = $1', [requestId]);

                let newResult = {
                    test: res.testName,
                    code: res.testCode,
                    value: res.value,
                    unit: res.unit,
                    range: res.range,
                    flag: res.flag,
                    timestamp: new Date()
                };

                if (existing.rows.length > 0) {
                    // Update existing JSON
                    const currentJson = existing.rows[0].result_json || { analytes: [] };
                    if (!currentJson.analytes) currentJson.analytes = [];
                    currentJson.analytes.push(newResult);

                    await client.query(`
                        UPDATE lab_results 
                        SET result_json = $1, uploaded_at = NOW(), technician_id = NULL 
                        WHERE id = $2
                    `, [JSON.stringify(currentJson), existing.rows[0].id]);
                } else {
                    // Create new
                    await client.query(`
                        INSERT INTO lab_results (request_id, result_json, uploaded_at)
                        VALUES ($1, $2, NOW())
                    `, [requestId, JSON.stringify({ analytes: [newResult] })]);
                }

                // Update Request Status
                await client.query(`
                    UPDATE lab_requests 
                    SET status = 'Completed' 
                    WHERE id = $1
                `, [requestId]);

                // Also create a Clinical Alert if Critical
                if (res.flag === 'H' || res.flag === 'L' || res.flag === 'HH' || res.flag === 'LL') {
                     // We could trigger alert service here
                     // For now just log
                     logger.warn(`[HL7] Abnormal Result: ${res.testName} = ${res.value} (${res.flag})`);
                }
            }

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            logger.error(`[HL7] Database Error: ${err.message}`);
            throw err;
        } finally {
            client.release();
        }
    }
}

module.exports = new HL7Receiver();
