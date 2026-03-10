/**
 * Sysmex XN-1000 Hematology Analyzer Driver
 * 
 * Communication: TCP/IP or RS232
 * Protocol: ASTM E1394 with LIS2-A2 framing
 * 
 * Sysmex XN-1000 is a 6-part differential hematology analyzer
 * with fluorescent flow cytometry technology.
 */

const EventEmitter = require('events');
const net = require('net');

// ASTM Control Characters
const ASTM = {
    STX: '\x02',  // Start of Text
    ETX: '\x03',  // End of Text
    EOT: '\x04',  // End of Transmission
    ENQ: '\x05',  // Enquiry
    ACK: '\x06',  // Acknowledge
    NAK: '\x15',  // Negative Acknowledge
    LF: '\x0A',   // Line Feed
    CR: '\x0D',   // Carriage Return
};

// Sysmex XN Parameter Mappings (6-Part Differential + Advanced Parameters)
const SYSMEX_XN_PARAMETER_MAPPINGS = {
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
    'RDW-SD': { key: 'rdw_sd', name: 'RDW Standard Deviation', unit: 'fL', referenceMin: 37.0, referenceMax: 54.0 },
    'RDW-CV': { key: 'rdw_cv', name: 'RDW Coefficient of Variation', unit: '%', referenceMin: 11.5, referenceMax: 14.5 },
    
    // Platelet Indices
    'MPV':  { key: 'mpv', name: 'Mean Platelet Volume', unit: 'fL', referenceMin: 9.0, referenceMax: 13.0 },
    'PDW':  { key: 'pdw', name: 'Platelet Distribution Width', unit: 'fL', referenceMin: 9.0, referenceMax: 17.0 },
    'PCT':  { key: 'pct', name: 'Plateletcrit', unit: '%', referenceMin: 0.15, referenceMax: 0.4 },
    'P-LCR': { key: 'plcr', name: 'Platelet Large Cell Ratio', unit: '%', referenceMin: 15.0, referenceMax: 35.0 },
    
    // 6-Part Differential (Sysmex XN specialty - includes IG)
    'NEUT%': { key: 'neutrophil_percent', name: 'Neutrophil %', unit: '%', referenceMin: 40.0, referenceMax: 70.0 },
    'LYMPH%': { key: 'lymphocyte_percent', name: 'Lymphocyte %', unit: '%', referenceMin: 20.0, referenceMax: 40.0 },
    'MONO%': { key: 'monocyte_percent', name: 'Monocyte %', unit: '%', referenceMin: 2.0, referenceMax: 8.0 },
    'EO%':   { key: 'eosinophil_percent', name: 'Eosinophil %', unit: '%', referenceMin: 1.0, referenceMax: 6.0 },
    'BASO%': { key: 'basophil_percent', name: 'Basophil %', unit: '%', referenceMin: 0.0, referenceMax: 2.0 },
    'IG%':   { key: 'ig_percent', name: 'Immature Granulocyte %', unit: '%', referenceMin: 0.0, referenceMax: 0.5 },
    
    'NEUT#': { key: 'neutrophil_count', name: 'Neutrophil #', unit: '10^9/L', referenceMin: 2.0, referenceMax: 7.0 },
    'LYMPH#': { key: 'lymphocyte_count', name: 'Lymphocyte #', unit: '10^9/L', referenceMin: 1.0, referenceMax: 4.0 },
    'MONO#': { key: 'monocyte_count', name: 'Monocyte #', unit: '10^9/L', referenceMin: 0.1, referenceMax: 0.9 },
    'EO#':   { key: 'eosinophil_count', name: 'Eosinophil #', unit: '10^9/L', referenceMin: 0.02, referenceMax: 0.5 },
    'BASO#': { key: 'basophil_count', name: 'Basophil #', unit: '10^9/L', referenceMin: 0.0, referenceMax: 0.1 },
    'IG#':   { key: 'ig_count', name: 'Immature Granulocyte #', unit: '10^9/L', referenceMin: 0.0, referenceMax: 0.03 },
    
    // Reticulocyte (XN Advanced)
    'RET%': { key: 'reticulocyte_percent', name: 'Reticulocyte %', unit: '%', referenceMin: 0.5, referenceMax: 2.5 },
    'RET#': { key: 'reticulocyte_count', name: 'Reticulocyte #', unit: '10^12/L', referenceMin: 0.02, referenceMax: 0.1 },
    'IRF': { key: 'irf', name: 'Immature Reticulocyte Fraction', unit: '%', referenceMin: 2.0, referenceMax: 17.0 },
    'RET-He': { key: 'ret_he', name: 'Reticulocyte Hemoglobin', unit: 'pg', referenceMin: 28.0, referenceMax: 35.0 },
    
    // NRBC
    'NRBC%': { key: 'nrbc_percent', name: 'Nucleated RBC %', unit: '%', referenceMin: 0.0, referenceMax: 0.0 },
    'NRBC#': { key: 'nrbc_count', name: 'Nucleated RBC #', unit: '/100 WBC', referenceMin: 0.0, referenceMax: 0.0 },
    
    // IPF (Immature Platelet Fraction - Sysmex exclusive)
    'IPF%': { key: 'ipf_percent', name: 'Immature Platelet Fraction %', unit: '%', referenceMin: 1.0, referenceMax: 9.4 },
    'IPF#': { key: 'ipf_count', name: 'Immature Platelet Fraction #', unit: '10^9/L', referenceMin: 1.0, referenceMax: 20.0 }
};

/**
 * SysmexXN1000Driver - Handles communication with Sysmex XN-1000
 */
class SysmexXN1000Driver extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            host: config.host || '192.168.1.100',
            port: config.port || 5100,
            timeout: config.timeout || 30000,
            reconnectInterval: config.reconnectInterval || 5000,
            instrumentId: config.instrumentId || null,
            mode: config.mode || 'server',
        };
        
        this.socket = null;
        this.server = null;
        this.connected = false;
        this.buffer = '';
        this.reconnectTimer = null;
        this.clients = new Map();
        this.sessionActive = false;
    }
    
    async start() {
        if (this.config.mode === 'server') {
            return this.startServer();
        } else {
            return this.connectToInstrument();
        }
    }
    
    async startServer() {
        return new Promise((resolve, reject) => {
            this.server = net.createServer((socket) => {
                this.handleClientConnection(socket);
            });
            
            this.server.on('error', (err) => {
                console.error('[SysmexXN1000] Server error:', err.message);
                this.emit('error', err);
                reject(err);
            });
            
            this.server.listen(this.config.port, '0.0.0.0', () => {
                console.log(`[SysmexXN1000] Listening on port ${this.config.port}`);
                this.emit('listening', { port: this.config.port });
                resolve({ success: true, port: this.config.port });
            });
        });
    }
    
    handleClientConnection(socket) {
        const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`[SysmexXN1000] Instrument connected: ${clientId}`);
        
        this.clients.set(clientId, socket);
        this.connected = true;
        this.emit('connected', { clientId });
        
        let dataBuffer = Buffer.alloc(0);
        
        socket.on('data', (chunk) => {
            // Handle ENQ (Handshake start)
            if (chunk.includes(Buffer.from([0x05]))) {
                console.log('[SysmexXN1000] Received ENQ, sending ACK');
                socket.write(Buffer.from([0x06]));
                this.sessionActive = true;
                return;
            }
            
            // Handle EOT (Transmission End)
            if (chunk.includes(Buffer.from([0x04]))) {
                console.log('[SysmexXN1000] Received EOT. Transmission complete.');
                this.sessionActive = false;
                return;
            }
            
            // Append chunk to buffer
            dataBuffer = Buffer.concat([dataBuffer, chunk]);
            
            // Process complete frames
            this.processASTMBuffer(dataBuffer.toString('ascii'), socket);
            dataBuffer = Buffer.alloc(0);
        });
        
        socket.on('close', () => {
            console.log(`[SysmexXN1000] Instrument disconnected: ${clientId}`);
            this.clients.delete(clientId);
            if (this.clients.size === 0) this.connected = false;
            this.emit('disconnected', { clientId });
        });
        
        socket.on('error', (err) => {
            console.error(`[SysmexXN1000] Socket error (${clientId}):`, err.message);
            this.emit('error', { clientId, error: err });
        });
    }
    
    async connectToInstrument() {
        return new Promise((resolve, reject) => {
            this.socket = new net.Socket();
            
            this.socket.connect(this.config.port, this.config.host, () => {
                console.log(`[SysmexXN1000] Connected to ${this.config.host}:${this.config.port}`);
                this.connected = true;
                this.emit('connected', { host: this.config.host, port: this.config.port });
                resolve({ success: true });
            });
            
            this.socket.on('data', (data) => {
                this.buffer += data.toString('ascii');
                this.processASTMBuffer(this.buffer, this.socket);
                this.buffer = '';
            });
            
            this.socket.on('close', () => {
                console.log('[SysmexXN1000] Connection closed');
                this.connected = false;
                this.emit('disconnected');
                this.scheduleReconnect();
            });
            
            this.socket.on('error', (err) => {
                console.error('[SysmexXN1000] Connection error:', err.message);
                reject(err);
            });
        });
    }
    
    processASTMBuffer(rawData, socket) {
        const lines = rawData.split(/\r\n|\n|\r/);
        
        const collection = {
            header: null,
            patient: null,
            order: null,
            results: []
        };
        
        lines.forEach(line => {
            // Clean control characters
            const cleanLine = line.replace(/[\x02\x03]/g, '').trim();
            if (cleanLine.length < 3) return;
            
            // Send ACK for each frame
            socket.write(Buffer.from([0x06]));
            
            const recordType = this.getRecordType(cleanLine);
            const fields = cleanLine.split('|');
            
            switch (recordType) {
                case 'H':
                    collection.header = this.parseHeader(fields);
                    break;
                case 'P':
                    collection.patient = this.parsePatient(fields);
                    break;
                case 'O':
                    collection.order = this.parseOrder(fields);
                    break;
                case 'R':
                    const result = this.parseResult(fields);
                    if (result) collection.results.push(result);
                    break;
                case 'L':
                    // Terminator - emit collected results
                    if (collection.results.length > 0) {
                        this.emitResults(collection);
                    }
                    break;
            }
        });
    }
    
    getRecordType(record) {
        const firstChar = record.charAt(0);
        // Frame number followed by record type
        if (/\d[A-Z]/.test(record.substring(0, 2))) {
            return record.charAt(1);
        }
        return firstChar;
    }
    
    parseHeader(fields) {
        return {
            type: 'H',
            senderId: fields[4] || 'SYSMEX_XN1000',
            timestamp: fields[13] || ''
        };
    }
    
    parsePatient(fields) {
        return {
            type: 'P',
            patientId: fields[3] || '',
            patientName: fields[5] || '',
            birthdate: fields[7] || '',
            sex: fields[8] || ''
        };
    }
    
    parseOrder(fields) {
        const testId = fields[4]?.split('^') || [];
        return {
            type: 'O',
            specimenId: fields[2] || '',
            sampleId: fields[3] || '',
            testCode: testId[3] || testId[0] || ''
        };
    }
    
    parseResult(fields) {
        const testCode = fields[2]?.split('^') || [];
        const code = testCode[testCode.length - 1] || testCode[0] || '';
        const value = fields[3];
        const unit = fields[4] || '';
        
        if (!code || !value) return null;
        
        return {
            code: code,
            value: this.parseValue(value),
            unit: unit,
            referenceRange: fields[5] || '',
            flag: fields[6] || 'N',
            status: fields[8] || 'F'
        };
    }
    
    parseValue(value) {
        if (!value) return null;
        const num = parseFloat(value);
        return isNaN(num) ? value : num;
    }
    
    emitResults(collection) {
        const mappedResults = {};
        
        collection.results.forEach(result => {
            const mapping = SYSMEX_XN_PARAMETER_MAPPINGS[result.code] ||
                           SYSMEX_XN_PARAMETER_MAPPINGS[result.code.toUpperCase()];
            
            if (mapping) {
                mappedResults[mapping.key] = {
                    value: result.value,
                    unit: result.unit || mapping.unit,
                    name: mapping.name,
                    flag: result.flag,
                    referenceRange: result.referenceRange || `${mapping.referenceMin}-${mapping.referenceMax}`
                };
            } else {
                mappedResults[result.code.toLowerCase()] = {
                    value: result.value,
                    unit: result.unit,
                    name: result.code,
                    flag: result.flag
                };
            }
        });
        
        const output = {
            barcode: collection.order?.sampleId || collection.order?.specimenId,
            patientId: collection.patient?.patientId,
            patientName: collection.patient?.patientName,
            timestamp: new Date(),
            instrumentId: this.config.instrumentId,
            instrumentModel: 'Sysmex XN-1000',
            results: mappedResults,
            rawResults: collection.results
        };
        
        console.log(`[SysmexXN1000] Parsed ${Object.keys(mappedResults).length} results for barcode: ${output.barcode}`);
        this.emit('results', output);
    }
    
    scheduleReconnect() {
        if (this.reconnectTimer) return;
        
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            console.log('[SysmexXN1000] Attempting reconnection...');
            this.connectToInstrument().catch(() => this.scheduleReconnect());
        }, this.config.reconnectInterval);
    }
    
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
                    console.log('[SysmexXN1000] Server stopped');
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
    
    async testConnection() {
        if (this.config.mode === 'server') {
            return new Promise((resolve) => {
                const testServer = net.createServer();
                testServer.on('error', (err) => {
                    resolve({ success: false, message: `Port ${this.config.port} unavailable: ${err.message}` });
                });
                testServer.listen(this.config.port, '0.0.0.0', () => {
                    testServer.close(() => resolve({ success: true, message: `Port ${this.config.port} available` }));
                });
            });
        } else {
            return new Promise((resolve) => {
                const testSocket = new net.Socket();
                testSocket.setTimeout(5000);
                testSocket.connect(this.config.port, this.config.host, () => {
                    testSocket.destroy();
                    resolve({ success: true, message: `Connected to ${this.config.host}:${this.config.port}` });
                });
                testSocket.on('error', (err) => resolve({ success: false, message: `Cannot connect: ${err.message}` }));
                testSocket.on('timeout', () => {
                    testSocket.destroy();
                    resolve({ success: false, message: 'Connection timeout' });
                });
            });
        }
    }
    
    getStatus() {
        return {
            connected: this.connected,
            mode: this.config.mode,
            host: this.config.host,
            port: this.config.port,
            clientCount: this.clients.size,
            sessionActive: this.sessionActive
        };
    }
}

module.exports = {
    SysmexXN1000Driver,
    SYSMEX_XN_PARAMETER_MAPPINGS
};
