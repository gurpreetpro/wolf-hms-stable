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

            const { patientId, results, sendingApplication } = data;
            logger.info(`[HL7] Processing ${results.length} result analytes for Patient: ${patientId || 'N/A'}`);

            // 1. Build analytes payload
            const analytes = results.map(res => ({
                testName: res.testName,
                testCode: res.testCode,
                value: res.value,
                unit: res.unit,
                range: res.range,
                flag: res.flag,
                timestamp: new Date()
            }));

            const resultPayload = {
                source: 'HL7_ANALYZER',
                instrument: sendingApplication || 'SYSMEX_XN1000',
                analytes: analytes,
                receivedAt: new Date()
            };

            // 2. Find matching CPOE lab_order for patient
            let orderId = null;
            if (patientId) {
                const matchRes = await client.query(
                    `SELECT id FROM lab_orders WHERE patient_id = $1 AND status != 'Cancelled' ORDER BY id DESC LIMIT 1`,
                    [patientId]
                );
                if (matchRes.rows.length > 0) {
                    orderId = matchRes.rows[0].id;
                }
            }

            // Fallback: search by barcode if orderId not found by patientId
            if (!orderId && results.length > 0 && results[0].barcode) {
                const cleanBarcode = results[0].barcode.replace(/\D/g, '');
                if (cleanBarcode) {
                    const matchBarcode = await client.query(
                        `SELECT id FROM lab_orders WHERE id = $1 LIMIT 1`,
                        [parseInt(cleanBarcode)]
                    ).catch(() => ({ rows: [] }));
                    if (matchBarcode.rows.length > 0) {
                        orderId = matchBarcode.rows[0].id;
                    }
                }
            }

            // 3. Attach results directly to lab_orders record
            if (orderId) {
                await client.query(
                    `UPDATE lab_orders SET results = $1, status = 'Completed' WHERE id = $2`,
                    [JSON.stringify(resultPayload), orderId]
                );
                logger.info(`[HL7] ✅ Results physically attached to CPOE lab_order #${orderId} for Patient ${patientId}`);
            } else {
                logger.warn(`[HL7] ⚠️ No active CPOE lab_order found for Patient ${patientId}. Saving standalone.`);
            }

            // 4. Also insert into lab_results table
            const reqId = orderId || 1;
            await client.query(
                `INSERT INTO lab_results (request_id, result_json, uploaded_at) VALUES ($1, $2, NOW())`,
                [reqId, JSON.stringify(resultPayload)]
            ).catch(err => logger.warn('[HL7] lab_results insert warning:', err.message));

            // 5. Check for critical flags
            for (const res of results) {
                if (res.flag === 'H' || res.flag === 'L' || res.flag === 'HH' || res.flag === 'LL') {
                    logger.warn(`[HL7] 🚨 Abnormal Result Alert: ${res.testName} = ${res.value} ${res.unit || ''} (${res.flag})`);
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
