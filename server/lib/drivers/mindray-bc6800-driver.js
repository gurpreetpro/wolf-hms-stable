/**
 * Mindray BC-6800 Hematology Analyzer Driver
 * 
 * Communication: TCP/IP via LAN port
 * Protocol: HL7 v2.5 with MLLP framing
 * Message Types: ORU^R01 (results), ACK (acknowledgment)
 * 
 * Mindray BC-6800 is a 5-part differential hematology analyzer
 * with CRP and ESR modules available.
 */

const EventEmitter = require('events');
const net = require('net');

// HL7 MLLP Control Characters
const VT = String.fromCharCode(0x0B);  // Start Block
const FS = String.fromCharCode(0x1C);  // End Block
const CR = String.fromCharCode(0x0D);  // Carriage Return

// Mindray BC-6800 Parameter Mappings (5-Part Differential)
const MINDRAY_BC6800_PARAMETER_MAPPINGS = {
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
    'RDW-CV': { key: 'rdw_cv',  name: 'RDW Coefficient of Variation', unit: '%', referenceMin: 11.5, referenceMax: 14.5 },
    'RDW-SD': { key: 'rdw_sd',  name: 'RDW Standard Deviation', unit: 'fL', referenceMin: 37.0, referenceMax: 54.0 },
    
    // Platelet Indices
    'MPV':  { key: 'mpv',  name: 'Mean Platelet Volume',    unit: 'fL', referenceMin: 7.0, referenceMax: 11.0 },
    'PDW':  { key: 'pdw',  name: 'Platelet Distribution Width', unit: '%', referenceMin: 10.0, referenceMax: 18.0 },
    'PCT':  { key: 'pct',  name: 'Plateletcrit',            unit: '%',  referenceMin: 0.1, referenceMax: 0.5 },
    'P-LCR': { key: 'plcr', name: 'Platelet Large Cell Ratio', unit: '%', referenceMin: 15.0, referenceMax: 35.0 },
    
    // 5-Part Differential (Mindray BC-6800 specific)
    'NEU%': { key: 'neutrophil_percent', name: 'Neutrophil %',   unit: '%', referenceMin: 40.0, referenceMax: 70.0 },
    'LYM%': { key: 'lymphocyte_percent', name: 'Lymphocyte %',   unit: '%', referenceMin: 20.0, referenceMax: 40.0 },
    'MON%': { key: 'monocyte_percent',   name: 'Monocyte %',     unit: '%', referenceMin: 2.0, referenceMax: 8.0 },
    'EOS%': { key: 'eosinophil_percent', name: 'Eosinophil %',   unit: '%', referenceMin: 1.0, referenceMax: 6.0 },
    'BAS%': { key: 'basophil_percent',   name: 'Basophil %',     unit: '%', referenceMin: 0.0, referenceMax: 2.0 },
    
    'NEU#': { key: 'neutrophil_count',   name: 'Neutrophil #',   unit: '10^9/L', referenceMin: 2.0, referenceMax: 7.0 },
    'LYM#': { key: 'lymphocyte_count',   name: 'Lymphocyte #',   unit: '10^9/L', referenceMin: 1.0, referenceMax: 4.0 },
    'MON#': { key: 'monocyte_count',     name: 'Monocyte #',     unit: '10^9/L', referenceMin: 0.1, referenceMax: 0.9 },
    'EOS#': { key: 'eosinophil_count',   name: 'Eosinophil #',   unit: '10^9/L', referenceMin: 0.02, referenceMax: 0.5 },
    'BAS#': { key: 'basophil_count',     name: 'Basophil #',     unit: '10^9/L', referenceMin: 0.0, referenceMax: 0.1 },
    
    // Reticulocyte (if RET module installed)
    'RET%': { key: 'reticulocyte_percent', name: 'Reticulocyte %', unit: '%', referenceMin: 0.5, referenceMax: 2.5 },
    'RET#': { key: 'reticulocyte_count', name: 'Reticulocyte #', unit: '10^12/L', referenceMin: 0.02, referenceMax: 0.1 },
    'IRF':  { key: 'irf', name: 'Immature Reticulocyte Fraction', unit: '%', referenceMin: 2.0, referenceMax: 17.0 },
    
    // NRBC (Nucleated Red Blood Cells)
    'NRBC%': { key: 'nrbc_percent', name: 'Nucleated RBC %', unit: '%', referenceMin: 0.0, referenceMax: 0.0 },
    'NRBC#': { key: 'nrbc_count', name: 'Nucleated RBC #', unit: '/100 WBC', referenceMin: 0.0, referenceMax: 0.0 }
};

/**
 * MindrayBC6800Driver - Handles communication with Mindray BC-6800
 */
class MindrayBC6800Driver extends EventEmitter {
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
                console.error('[MindrayBC6800] Server error:', err.message);
                this.emit('error', err);
                reject(err);
            });
            
            this.server.listen(this.config.port, '0.0.0.0', () => {
                console.log(`[MindrayBC6800] Listening on port ${this.config.port}`);
                this.emit('listening', { port: this.config.port });
                resolve({ success: true, port: this.config.port });
            });
        });
    }
    
    handleClientConnection(socket) {
        const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`[MindrayBC6800] Instrument connected: ${clientId}`);
        
        this.clients.set(clientId, socket);
        this.connected = true;
        this.emit('connected', { clientId });
        
        let buffer = '';
        
        socket.on('data', (data) => {
            buffer += data.toString('utf8');
            
            // Check for complete MLLP message
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
            console.log(`[MindrayBC6800] Instrument disconnected: ${clientId}`);
            this.clients.delete(clientId);
            if (this.clients.size === 0) this.connected = false;
            this.emit('disconnected', { clientId });
        });
        
        socket.on('error', (err) => {
            console.error(`[MindrayBC6800] Socket error (${clientId}):`, err.message);
            this.emit('error', { clientId, error: err });
        });
    }
    
    async connectToInstrument() {
        return new Promise((resolve, reject) => {
            this.socket = new net.Socket();
            
            this.socket.connect(this.config.port, this.config.host, () => {
                console.log(`[MindrayBC6800] Connected to ${this.config.host}:${this.config.port}`);
                this.connected = true;
                this.emit('connected', { host: this.config.host, port: this.config.port });
                resolve({ success: true });
            });
            
            this.socket.on('data', (data) => {
                this.buffer += data.toString('utf8');
                this.processBuffer();
            });
            
            this.socket.on('close', () => {
                console.log('[MindrayBC6800] Connection closed');
                this.connected = false;
                this.emit('disconnected');
                this.scheduleReconnect();
            });
            
            this.socket.on('error', (err) => {
                console.error('[MindrayBC6800] Connection error:', err.message);
                this.connected = false;
                this.emit('error', err);
                reject(err);
            });
            
            this.socket.setTimeout(this.config.timeout, () => {
                console.warn('[MindrayBC6800] Connection timeout');
                this.socket.destroy();
            });
        });
    }
    
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
    
    processHL7Message(message, socket) {
        console.log('[MindrayBC6800] Received HL7 message');
        this.emit('raw_message', message);
        
        try {
            const segments = message.split('\r');
            const msh = segments.find(s => s.startsWith('MSH'));
            
            if (!msh) {
                console.warn('[MindrayBC6800] No MSH segment found');
                return;
            }
            
            const mshFields = msh.split('|');
            const messageType = mshFields[8];
            const messageControlId = mshFields[9];
            
            console.log(`[MindrayBC6800] Message Type: ${messageType}, Control ID: ${messageControlId}`);
            
            if (messageType && messageType.startsWith('ORU')) {
                const results = this.parseORUMessage(segments);
                if (results.results && Object.keys(results.results).length > 0) {
                    console.log(`[MindrayBC6800] Parsed ${Object.keys(results.results).length} results for barcode: ${results.barcode}`);
                    this.emit('results', results);
                }
            }
            
            // Send ACK
            const ack = this.buildACK(messageControlId, mshFields);
            this.sendMessage(socket, ack);
            
        } catch (error) {
            console.error('[MindrayBC6800] Error processing message:', error);
            this.emit('error', error);
        }
    }
    
    parseORUMessage(segments) {
        const results = {
            barcode: null,
            patientId: null,
            patientName: null,
            sampleId: null,
            timestamp: new Date(),
            instrumentId: this.config.instrumentId,
            instrumentModel: 'Mindray BC-6800',
            results: {},
            rawResults: []
        };
        
        for (const segment of segments) {
            const fields = segment.split('|');
            const segmentType = fields[0];
            
            switch (segmentType) {
                case 'PID':
                    results.patientId = fields[3]?.split('^')[0];
                    const nameComponents = fields[5]?.split('^') || [];
                    results.patientName = `${nameComponents[1] || ''} ${nameComponents[0] || ''}`.trim();
                    break;
                    
                case 'ORC':
                    results.sampleId = fields[2];
                    break;
                    
                case 'OBR':
                    results.barcode = fields[3] || fields[2];
                    break;
                    
                case 'OBX':
                    const obxResult = this.parseOBXSegment(fields);
                    if (obxResult) {
                        results.rawResults.push(obxResult);
                        
                        const mapping = MINDRAY_BC6800_PARAMETER_MAPPINGS[obxResult.code] || 
                                       MINDRAY_BC6800_PARAMETER_MAPPINGS[obxResult.code.toUpperCase()];
                        
                        if (mapping) {
                            results.results[mapping.key] = {
                                value: obxResult.value,
                                unit: obxResult.unit || mapping.unit,
                                name: mapping.name,
                                flag: obxResult.flag,
                                referenceRange: obxResult.referenceRange || `${mapping.referenceMin}-${mapping.referenceMax}`
                            };
                        } else {
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
        
        if (!results.barcode) results.barcode = results.sampleId;
        return results;
    }
    
    parseOBXSegment(fields) {
        if (fields.length < 6) return null;
        
        const observationId = fields[3]?.split('^') || [];
        
        return {
            setId: fields[1],
            valueType: fields[2],
            code: observationId[0] || '',
            name: observationId[1] || observationId[0] || '',
            value: this.parseValue(fields[5], fields[2]),
            unit: fields[6],
            referenceRange: fields[7],
            flag: fields[8] || 'N',
            status: fields[11]
        };
    }
    
    parseValue(value, type) {
        if (!value) return null;
        if (type === 'NM') {
            const num = parseFloat(value);
            return isNaN(num) ? value : num;
        }
        return value;
    }
    
    buildACK(messageControlId, originalMsh) {
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
        const sendingApp = originalMsh[4] || 'MINDRAY_BC6800';
        const sendingFac = originalMsh[5] || 'LAB';
        
        const msh = `MSH|^~\\&|WOLF_HMS|HOSPITAL|${sendingApp}|${sendingFac}|${timestamp}||ACK^R01|ACK${messageControlId}|P|2.5`;
        const msa = `MSA|AA|${messageControlId}|Message Accepted`;
        
        return `${msh}\r${msa}`;
    }
    
    sendMessage(socket, message) {
        if (!socket || socket.destroyed) {
            console.warn('[MindrayBC6800] Cannot send - socket not connected');
            return false;
        }
        
        const mllpMessage = VT + message + FS + CR;
        socket.write(mllpMessage);
        console.log('[MindrayBC6800] Sent ACK');
        return true;
    }
    
    scheduleReconnect() {
        if (this.reconnectTimer) return;
        
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            console.log('[MindrayBC6800] Attempting reconnection...');
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
                    console.log('[MindrayBC6800] Server stopped');
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
                    testServer.close(() => {
                        resolve({ success: true, message: `Port ${this.config.port} available` });
                    });
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
            clientCount: this.clients.size
        };
    }
}

module.exports = {
    MindrayBC6800Driver,
    MINDRAY_BC6800_PARAMETER_MAPPINGS
};
