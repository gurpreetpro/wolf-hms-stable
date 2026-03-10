/**
 * Zybio Z3 Hematology Analyzer Driver
 * 
 * Communication: TCP/IP via LAN port
 * Protocol: HL7 v2.3.1 with MLLP framing
 * Message Types: ORU^R01 (results), ACK (acknowledgment)
 * 
 * Zybio Z3/Z3 CRP HS is a 3-part differential hematology analyzer
 * that can also perform CRP testing.
 */

const EventEmitter = require('events');
const net = require('net');

// HL7 Control Characters
const VT = String.fromCharCode(0x0B);  // Start Block (Vertical Tab)
const FS = String.fromCharCode(0x1C);  // End Block (File Separator)
const CR = String.fromCharCode(0x0D);  // Carriage Return

// Zybio Z3 CBC Parameter Mappings
// Maps Zybio OBX identifiers to standard lab result keys
const ZYBIO_Z3_PARAMETER_MAPPINGS = {
    // Basic CBC Parameters
    'WBC':  { key: 'wbc',        name: 'White Blood Cell Count', unit: '10^9/L', referenceMin: 4.0, referenceMax: 10.0 },
    'RBC':  { key: 'rbc',        name: 'Red Blood Cell Count',   unit: '10^12/L', referenceMin: 4.0, referenceMax: 5.5 },
    'HGB':  { key: 'hemoglobin', name: 'Hemoglobin',             unit: 'g/dL',   referenceMin: 12.0, referenceMax: 17.0 },
    'HCT':  { key: 'hematocrit', name: 'Hematocrit',             unit: '%',      referenceMin: 36.0, referenceMax: 50.0 },
    'PLT':  { key: 'platelets',  name: 'Platelet Count',         unit: '10^9/L', referenceMin: 150, referenceMax: 400 },
    
    // Red Cell Indices
    'MCV':  { key: 'mcv',  name: 'Mean Corpuscular Volume',     unit: 'fL',  referenceMin: 80.0, referenceMax: 100.0 },
    'MCH':  { key: 'mch',  name: 'Mean Corpuscular Hemoglobin', unit: 'pg',  referenceMin: 27.0, referenceMax: 32.0 },
    'MCHC': { key: 'mchc', name: 'Mean Corpuscular Hgb Conc',   unit: 'g/dL', referenceMin: 32.0, referenceMax: 36.0 },
    'RDW':  { key: 'rdw',  name: 'Red Cell Distribution Width', unit: '%',   referenceMin: 11.5, referenceMax: 14.5 },
    
    // Platelet Indices
    'MPV':  { key: 'mpv',  name: 'Mean Platelet Volume',    unit: 'fL', referenceMin: 7.0, referenceMax: 11.0 },
    'PDW':  { key: 'pdw',  name: 'Platelet Distribution Width', unit: '%', referenceMin: 10.0, referenceMax: 18.0 },
    'PCT':  { key: 'pct',  name: 'Plateletcrit',            unit: '%',  referenceMin: 0.1, referenceMax: 0.5 },
    
    // 3-Part Differential (Zybio Z3 specific)
    'LYM%': { key: 'lymphocyte_percent', name: 'Lymphocyte %',    unit: '%', referenceMin: 20.0, referenceMax: 40.0 },
    'MON%': { key: 'monocyte_percent',   name: 'Monocyte %',      unit: '%', referenceMin: 2.0, referenceMax: 8.0 },
    'GRA%': { key: 'granulocyte_percent', name: 'Granulocyte %', unit: '%', referenceMin: 50.0, referenceMax: 70.0 },
    'LYM#': { key: 'lymphocyte_count',   name: 'Lymphocyte #',    unit: '10^9/L', referenceMin: 1.0, referenceMax: 4.0 },
    'MON#': { key: 'monocyte_count',     name: 'Monocyte #',      unit: '10^9/L', referenceMin: 0.1, referenceMax: 0.9 },
    'GRA#': { key: 'granulocyte_count',  name: 'Granulocyte #',   unit: '10^9/L', referenceMin: 2.0, referenceMax: 7.0 },
    
    // CRP (if Z3 CRP HS model)
    'CRP':  { key: 'crp', name: 'C-Reactive Protein', unit: 'mg/L', referenceMin: 0.0, referenceMax: 5.0 },
    'HS-CRP': { key: 'hscrp', name: 'High-Sensitivity CRP', unit: 'mg/L', referenceMin: 0.0, referenceMax: 3.0 },
    
    // Alternative identifiers sometimes used
    'HB':   { key: 'hemoglobin', name: 'Hemoglobin', unit: 'g/dL', referenceMin: 12.0, referenceMax: 17.0 },
    'NEUT%': { key: 'granulocyte_percent', name: 'Neutrophil %', unit: '%', referenceMin: 50.0, referenceMax: 70.0 },
    'NEUT#': { key: 'granulocyte_count', name: 'Neutrophil #', unit: '10^9/L', referenceMin: 2.0, referenceMax: 7.0 }
};

/**
 * ZybioZ3Driver - Handles communication with Zybio Z3 Hematology Analyzer
 */
class ZybioZ3Driver extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            host: config.host || '192.168.1.100',
            port: config.port || 5000,
            timeout: config.timeout || 30000,
            reconnectInterval: config.reconnectInterval || 5000,
            instrumentId: config.instrumentId || null,
            mode: config.mode || 'server', // 'server' (listen) or 'client' (connect)
        };
        
        this.socket = null;
        this.server = null;
        this.connected = false;
        this.buffer = '';
        this.reconnectTimer = null;
        this.clients = new Map();
    }
    
    /**
     * Start the driver
     * In server mode: Listens for incoming connections from Z3
     * In client mode: Connects to Z3 as LIS system
     */
    async start() {
        if (this.config.mode === 'server') {
            return this.startServer();
        } else {
            return this.connectToInstrument();
        }
    }
    
    /**
     * Start as TCP server (Z3 connects to us)
     */
    async startServer() {
        return new Promise((resolve, reject) => {
            this.server = net.createServer((socket) => {
                this.handleClientConnection(socket);
            });
            
            this.server.on('error', (err) => {
                console.error('[ZybioZ3] Server error:', err.message);
                this.emit('error', err);
                reject(err);
            });
            
            this.server.listen(this.config.port, '0.0.0.0', () => {
                console.log(`[ZybioZ3] Listening for connections on port ${this.config.port}`);
                this.emit('listening', { port: this.config.port });
                resolve({ success: true, port: this.config.port });
            });
        });
    }
    
    /**
     * Handle incoming connection from Z3
     */
    handleClientConnection(socket) {
        const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`[ZybioZ3] Instrument connected: ${clientId}`);
        
        this.clients.set(clientId, socket);
        this.connected = true;
        this.emit('connected', { clientId });
        
        let buffer = '';
        
        socket.on('data', (data) => {
            buffer += data.toString('utf8');
            
            // Check for complete MLLP message (VT...FS CR)
            while (buffer.includes(VT) && buffer.includes(FS + CR)) {
                const startIdx = buffer.indexOf(VT);
                const endIdx = buffer.indexOf(FS + CR);
                
                if (startIdx !== -1 && endIdx > startIdx) {
                    const message = buffer.substring(startIdx + 1, endIdx);
                    buffer = buffer.substring(endIdx + 2);
                    
                    this.processHL7Message(message, socket);
                } else {
                    break;
                }
            }
        });
        
        socket.on('close', () => {
            console.log(`[ZybioZ3] Instrument disconnected: ${clientId}`);
            this.clients.delete(clientId);
            if (this.clients.size === 0) {
                this.connected = false;
            }
            this.emit('disconnected', { clientId });
        });
        
        socket.on('error', (err) => {
            console.error(`[ZybioZ3] Socket error (${clientId}):`, err.message);
            this.emit('error', { clientId, error: err });
        });
    }
    
    /**
     * Connect to instrument as LIS client
     */
    async connectToInstrument() {
        return new Promise((resolve, reject) => {
            this.socket = new net.Socket();
            
            this.socket.connect(this.config.port, this.config.host, () => {
                console.log(`[ZybioZ3] Connected to instrument at ${this.config.host}:${this.config.port}`);
                this.connected = true;
                this.emit('connected', { host: this.config.host, port: this.config.port });
                resolve({ success: true });
            });
            
            this.socket.on('data', (data) => {
                this.buffer += data.toString('utf8');
                this.processBuffer();
            });
            
            this.socket.on('close', () => {
                console.log('[ZybioZ3] Connection closed');
                this.connected = false;
                this.emit('disconnected');
                this.scheduleReconnect();
            });
            
            this.socket.on('error', (err) => {
                console.error('[ZybioZ3] Connection error:', err.message);
                this.connected = false;
                this.emit('error', err);
                reject(err);
            });
            
            this.socket.setTimeout(this.config.timeout, () => {
                console.warn('[ZybioZ3] Connection timeout');
                this.socket.destroy();
            });
        });
    }
    
    /**
     * Process buffer for complete messages
     */
    processBuffer() {
        while (this.buffer.includes(VT) && this.buffer.includes(FS + CR)) {
            const startIdx = this.buffer.indexOf(VT);
            const endIdx = this.buffer.indexOf(FS + CR);
            
            if (startIdx !== -1 && endIdx > startIdx) {
                const message = this.buffer.substring(startIdx + 1, endIdx);
                this.buffer = this.buffer.substring(endIdx + 2);
                
                this.processHL7Message(message, this.socket);
            } else {
                break;
            }
        }
    }
    
    /**
     * Process HL7 message and extract results
     */
    processHL7Message(message, socket) {
        console.log('[ZybioZ3] Received HL7 message');
        this.emit('raw_message', message);
        
        try {
            const segments = message.split('\r');
            const msh = segments.find(s => s.startsWith('MSH'));
            
            if (!msh) {
                console.warn('[ZybioZ3] No MSH segment found');
                return;
            }
            
            // Parse MSH to identify message type
            const mshFields = msh.split('|');
            const messageType = mshFields[8]; // e.g., "ORU^R01"
            const messageControlId = mshFields[9];
            
            console.log(`[ZybioZ3] Message Type: ${messageType}, Control ID: ${messageControlId}`);
            
            if (messageType && messageType.startsWith('ORU')) {
                // Process Observation Result
                const results = this.parseORUMessage(segments);
                
                if (results.results.length > 0) {
                    console.log(`[ZybioZ3] Parsed ${results.results.length} results for barcode: ${results.barcode}`);
                    this.emit('results', results);
                }
            }
            
            // Send ACK
            const ack = this.buildACK(messageControlId, mshFields);
            this.sendMessage(socket, ack);
            
        } catch (error) {
            console.error('[ZybioZ3] Error processing message:', error);
            this.emit('error', error);
        }
    }
    
    /**
     * Parse ORU^R01 message with Zybio-specific mappings
     */
    parseORUMessage(segments) {
        const results = {
            barcode: null,
            patientId: null,
            patientName: null,
            sampleId: null,
            timestamp: new Date(),
            instrumentId: this.config.instrumentId,
            results: {},
            rawResults: []
        };
        
        for (const segment of segments) {
            const fields = segment.split('|');
            const segmentType = fields[0];
            
            switch (segmentType) {
                case 'PID':
                    // Patient Identification
                    results.patientId = fields[3]?.split('^')[0];
                    const nameComponents = fields[5]?.split('^') || [];
                    results.patientName = `${nameComponents[1] || ''} ${nameComponents[0] || ''}`.trim();
                    break;
                    
                case 'ORC':
                    // Order Common (contains sample/order ID)
                    results.sampleId = fields[2];
                    break;
                    
                case 'OBR':
                    // Observation Request (contains barcode/order number)
                    results.barcode = fields[3] || fields[2];
                    break;
                    
                case 'OBX':
                    // Observation Result (the actual test results)
                    const obxResult = this.parseOBXSegment(fields);
                    if (obxResult) {
                        results.rawResults.push(obxResult);
                        
                        // Map to standard key
                        const mapping = ZYBIO_Z3_PARAMETER_MAPPINGS[obxResult.code] || 
                                       ZYBIO_Z3_PARAMETER_MAPPINGS[obxResult.code.toUpperCase()];
                        
                        if (mapping) {
                            results.results[mapping.key] = {
                                value: obxResult.value,
                                unit: obxResult.unit || mapping.unit,
                                name: mapping.name,
                                flag: obxResult.flag,
                                referenceRange: obxResult.referenceRange || `${mapping.referenceMin}-${mapping.referenceMax}`
                            };
                        } else {
                            // Unknown parameter - store with original code
                            results.results[obxResult.code.toLowerCase()] = {
                                value: obxResult.value,
                                unit: obxResult.unit,
                                name: obxResult.name || obxResult.code,
                                flag: obxResult.flag
                            };
                        }
                    }
                    break;
            }
        }
        
        // Use sampleId as barcode if barcode not found
        if (!results.barcode) {
            results.barcode = results.sampleId;
        }
        
        return results;
    }
    
    /**
     * Parse single OBX segment
     */
    parseOBXSegment(fields) {
        // OBX|1|NM|WBC^White Blood Cell Count||10.5|10^9/L|4.0-10.0|H||F
        if (fields.length < 6) return null;
        
        const observationId = fields[3]?.split('^') || [];
        
        return {
            setId: fields[1],
            valueType: fields[2], // NM=Numeric, ST=String, TX=Text
            code: observationId[0] || '',
            name: observationId[1] || observationId[0] || '',
            value: this.parseValue(fields[5], fields[2]),
            unit: fields[6],
            referenceRange: fields[7],
            flag: fields[8] || 'N', // H=High, L=Low, N=Normal, A=Abnormal
            status: fields[11] // F=Final, P=Preliminary
        };
    }
    
    /**
     * Parse value based on type
     */
    parseValue(value, type) {
        if (!value) return null;
        
        if (type === 'NM') {
            const num = parseFloat(value);
            return isNaN(num) ? value : num;
        }
        
        return value;
    }
    
    /**
     * Build ACK message
     */
    buildACK(messageControlId, originalMsh) {
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
        const sendingApp = originalMsh[4] || 'ZYBIO_Z3';
        const sendingFac = originalMsh[5] || 'LAB';
        
        const msh = `MSH|^~\\&|WOLF_HMS|HOSPITAL|${sendingApp}|${sendingFac}|${timestamp}||ACK^R01|ACK${messageControlId}|P|2.3.1`;
        const msa = `MSA|AA|${messageControlId}|Message Accepted`;
        
        return `${msh}\r${msa}`;
    }
    
    /**
     * Send MLLP-wrapped message
     */
    sendMessage(socket, message) {
        if (!socket || socket.destroyed) {
            console.warn('[ZybioZ3] Cannot send - socket not connected');
            return false;
        }
        
        const mllpMessage = VT + message + FS + CR;
        socket.write(mllpMessage);
        console.log('[ZybioZ3] Sent ACK');
        return true;
    }
    
    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectTimer) return;
        
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            console.log('[ZybioZ3] Attempting reconnection...');
            this.connectToInstrument().catch(() => {
                this.scheduleReconnect();
            });
        }, this.config.reconnectInterval);
    }
    
    /**
     * Stop the driver
     */
    async stop() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        if (this.server) {
            return new Promise((resolve) => {
                this.clients.forEach((socket) => socket.destroy());
                this.clients.clear();
                this.server.close(() => {
                    console.log('[ZybioZ3] Server stopped');
                    resolve();
                });
            });
        }
        
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
        
        this.connected = false;
    }
    
    /**
     * Test connection
     */
    async testConnection() {
        if (this.config.mode === 'server') {
            // For server mode, just check if we can bind to port
            return new Promise((resolve) => {
                const testServer = net.createServer();
                testServer.on('error', (err) => {
                    resolve({ success: false, message: `Port ${this.config.port} unavailable: ${err.message}` });
                });
                testServer.listen(this.config.port, '0.0.0.0', () => {
                    testServer.close(() => {
                        resolve({ success: true, message: `Port ${this.config.port} available for listening` });
                    });
                });
            });
        } else {
            // For client mode, try to connect
            return new Promise((resolve) => {
                const testSocket = new net.Socket();
                testSocket.setTimeout(5000);
                
                testSocket.connect(this.config.port, this.config.host, () => {
                    testSocket.destroy();
                    resolve({ success: true, message: `Connected to ${this.config.host}:${this.config.port}` });
                });
                
                testSocket.on('error', (err) => {
                    resolve({ success: false, message: `Cannot connect: ${err.message}` });
                });
                
                testSocket.on('timeout', () => {
                    testSocket.destroy();
                    resolve({ success: false, message: 'Connection timeout' });
                });
            });
        }
    }
    
    /**
     * Get connection status
     */
    getStatus() {
        return {
            connected: this.connected,
            mode: this.config.mode,
            host: this.config.host,
            port: this.config.port,
            clientCount: this.clients.size
        };
    }
}

// Export driver and parameter mappings
module.exports = {
    ZybioZ3Driver,
    ZYBIO_Z3_PARAMETER_MAPPINGS
};
