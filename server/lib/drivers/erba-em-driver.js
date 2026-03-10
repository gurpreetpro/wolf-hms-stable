/**
 * Erba EM Chemistry Analyzer Driver
 * 
 * Supports: EM360, EM200, XL-200 (common in India)
 * Protocol: ASTM E1394
 */

const EventEmitter = require('events');
const net = require('net');

// ASTM Control
const ASTM = { STX: '\x02', ETX: '\x03', EOT: '\x04', ENQ: '\x05', ACK: '\x06', CR: '\x0D' };

// Erba EM Parameter Mappings (common chemistry tests)
const ERBA_EM_PARAMETER_MAPPINGS = {
    'GLUC': { key: 'glucose', name: 'Glucose', unit: 'mg/dL', referenceMin: 70, referenceMax: 100 },
    'UREA': { key: 'urea', name: 'Urea', unit: 'mg/dL', referenceMin: 15, referenceMax: 45 },
    'CREA': { key: 'creatinine', name: 'Creatinine', unit: 'mg/dL', referenceMin: 0.7, referenceMax: 1.3 },
    'CHOL': { key: 'cholesterol', name: 'Cholesterol', unit: 'mg/dL', referenceMin: 0, referenceMax: 200 },
    'TGL':  { key: 'triglycerides', name: 'Triglycerides', unit: 'mg/dL', referenceMin: 0, referenceMax: 150 },
    'HDL':  { key: 'hdl', name: 'HDL-C', unit: 'mg/dL', referenceMin: 40, referenceMax: 60 },
    'LDL':  { key: 'ldl', name: 'LDL-C', unit: 'mg/dL', referenceMin: 0, referenceMax: 100 },
    'VLDL': { key: 'vldl', name: 'VLDL-C', unit: 'mg/dL', referenceMin: 5, referenceMax: 40 },
    'SGOT': { key: 'ast', name: 'SGOT/AST', unit: 'U/L', referenceMin: 10, referenceMax: 40 },
    'SGPT': { key: 'alt', name: 'SGPT/ALT', unit: 'U/L', referenceMin: 7, referenceMax: 56 },
    'ALP':  { key: 'alp', name: 'Alkaline Phosphatase', unit: 'U/L', referenceMin: 44, referenceMax: 147 },
    'GGT':  { key: 'ggt', name: 'GGT', unit: 'U/L', referenceMin: 9, referenceMax: 48 },
    'TBIL': { key: 'bilirubin_total', name: 'Total Bilirubin', unit: 'mg/dL', referenceMin: 0.1, referenceMax: 1.2 },
    'DBIL': { key: 'bilirubin_direct', name: 'Direct Bilirubin', unit: 'mg/dL', referenceMin: 0.0, referenceMax: 0.3 },
    'TPROT': { key: 'total_protein', name: 'Total Protein', unit: 'g/dL', referenceMin: 6.0, referenceMax: 8.3 },
    'ALB':  { key: 'albumin', name: 'Albumin', unit: 'g/dL', referenceMin: 3.5, referenceMax: 5.0 },
    'URIC': { key: 'uric_acid', name: 'Uric Acid', unit: 'mg/dL', referenceMin: 3.5, referenceMax: 7.2 },
    'NA':   { key: 'sodium', name: 'Sodium', unit: 'mEq/L', referenceMin: 136, referenceMax: 145 },
    'K':    { key: 'potassium', name: 'Potassium', unit: 'mEq/L', referenceMin: 3.5, referenceMax: 5.0 },
    'CL':   { key: 'chloride', name: 'Chloride', unit: 'mEq/L', referenceMin: 98, referenceMax: 106 },
    'CA':   { key: 'calcium', name: 'Calcium', unit: 'mg/dL', referenceMin: 8.5, referenceMax: 10.5 },
    'PHOS': { key: 'phosphorus', name: 'Phosphorus', unit: 'mg/dL', referenceMin: 2.5, referenceMax: 4.5 },
    'MG':   { key: 'magnesium', name: 'Magnesium', unit: 'mg/dL', referenceMin: 1.7, referenceMax: 2.2 },
    'AMY':  { key: 'amylase', name: 'Amylase', unit: 'U/L', referenceMin: 28, referenceMax: 100 },
    'LIP':  { key: 'lipase', name: 'Lipase', unit: 'U/L', referenceMin: 0, referenceMax: 160 },
    'CK':   { key: 'ck', name: 'Creatine Kinase', unit: 'U/L', referenceMin: 30, referenceMax: 200 },
    'LDH':  { key: 'ldh', name: 'LDH', unit: 'U/L', referenceMin: 140, referenceMax: 280 },
    'IRON': { key: 'iron', name: 'Serum Iron', unit: 'µg/dL', referenceMin: 60, referenceMax: 170 },
    'TIBC': { key: 'tibc', name: 'TIBC', unit: 'µg/dL', referenceMin: 250, referenceMax: 400 }
};

class ErbaEMDriver extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            host: config.host || '192.168.1.100',
            port: config.port || 5100,
            instrumentId: config.instrumentId || null,
            mode: config.mode || 'server',
        };
        this.server = null;
        this.clients = new Map();
        this.connected = false;
    }
    
    async start() {
        if (this.config.mode === 'server') return this.startServer();
        return this.connectToInstrument();
    }
    
    async startServer() {
        return new Promise((resolve, reject) => {
            this.server = net.createServer((socket) => this.handleClient(socket));
            this.server.on('error', reject);
            this.server.listen(this.config.port, '0.0.0.0', () => {
                console.log(`[ErbaEM] Listening on port ${this.config.port}`);
                resolve({ success: true });
            });
        });
    }
    
    handleClient(socket) {
        const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
        this.clients.set(clientId, socket);
        this.connected = true;
        
        let collection = { patient: null, order: null, results: [] };
        
        socket.on('data', (chunk) => {
            if (chunk.includes(Buffer.from([0x05]))) { socket.write(Buffer.from([0x06])); return; }
            if (chunk.includes(Buffer.from([0x04]))) {
                if (collection.results.length > 0) this.emitResults(collection);
                collection = { patient: null, order: null, results: [] };
                return;
            }
            
            socket.write(Buffer.from([0x06]));
            const lines = chunk.toString('ascii').split(/[\r\n]+/);
            lines.forEach(line => {
                const clean = line.replace(/[\x02\x03]/g, '').trim();
                if (clean.length < 3) return;
                const type = clean.match(/^\d?([A-Z])/)?.[1];
                const f = clean.split('|');
                if (type === 'P') collection.patient = { id: f[3] };
                if (type === 'O') collection.order = { barcode: f[3] || f[2] };
                if (type === 'R') {
                    const code = f[2]?.split('^').pop();
                    const value = parseFloat(f[3]);
                    if (code && !isNaN(value)) collection.results.push({ code, value, unit: f[4], flag: f[6] });
                }
            });
        });
        
        socket.on('close', () => { this.clients.delete(clientId); });
    }
    
    emitResults(collection) {
        const mapped = {};
        collection.results.forEach(r => {
            const m = ERBA_EM_PARAMETER_MAPPINGS[r.code];
            if (m) mapped[m.key] = { value: r.value, unit: r.unit || m.unit, name: m.name, flag: r.flag };
        });
        this.emit('results', { barcode: collection.order?.barcode, patientId: collection.patient?.id, timestamp: new Date(), instrumentModel: 'Erba EM', results: mapped });
    }
    
    async stop() { if (this.server) { this.clients.forEach(s => s.destroy()); return new Promise(r => this.server.close(r)); } }
    async testConnection() { return new Promise((r) => { const t = net.createServer(); t.on('error', (e) => r({ success: false, message: e.message })); t.listen(this.config.port, () => t.close(() => r({ success: true, message: 'Port available' }))); }); }
}

module.exports = { ErbaEMDriver, ERBA_EM_PARAMETER_MAPPINGS };
