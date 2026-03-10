/**
 * Beckman Coulter Chemistry Analyzer Driver
 * 
 * Supports: AU5800, AU680, AU480 Chemistry Analyzers
 * Protocol: HL7 v2.5 with MLLP framing
 */

const EventEmitter = require('events');
const net = require('net');

const VT = String.fromCharCode(0x0B);
const FS = String.fromCharCode(0x1C);
const CR = String.fromCharCode(0x0D);

// Beckman AU Chemistry Parameter Mappings
const BECKMAN_AU_PARAMETER_MAPPINGS = {
    // Basic Metabolic Panel
    'GLU':   { key: 'glucose', name: 'Glucose', unit: 'mg/dL', referenceMin: 70, referenceMax: 100 },
    'BUN':   { key: 'bun', name: 'Blood Urea Nitrogen', unit: 'mg/dL', referenceMin: 7, referenceMax: 20 },
    'CREA':  { key: 'creatinine', name: 'Creatinine', unit: 'mg/dL', referenceMin: 0.7, referenceMax: 1.3 },
    'NA':    { key: 'sodium', name: 'Sodium', unit: 'mEq/L', referenceMin: 136, referenceMax: 145 },
    'K':     { key: 'potassium', name: 'Potassium', unit: 'mEq/L', referenceMin: 3.5, referenceMax: 5.0 },
    'CL':    { key: 'chloride', name: 'Chloride', unit: 'mEq/L', referenceMin: 98, referenceMax: 106 },
    'CO2':   { key: 'co2', name: 'Carbon Dioxide', unit: 'mEq/L', referenceMin: 23, referenceMax: 29 },
    'CA':    { key: 'calcium', name: 'Calcium', unit: 'mg/dL', referenceMin: 8.5, referenceMax: 10.5 },
    
    // Liver Function
    'ALT':   { key: 'alt', name: 'Alanine Aminotransferase', unit: 'U/L', referenceMin: 7, referenceMax: 56 },
    'AST':   { key: 'ast', name: 'Aspartate Aminotransferase', unit: 'U/L', referenceMin: 10, referenceMax: 40 },
    'ALP':   { key: 'alp', name: 'Alkaline Phosphatase', unit: 'U/L', referenceMin: 44, referenceMax: 147 },
    'GGT':   { key: 'ggt', name: 'Gamma-Glutamyl Transferase', unit: 'U/L', referenceMin: 9, referenceMax: 48 },
    'TBIL':  { key: 'bilirubin_total', name: 'Total Bilirubin', unit: 'mg/dL', referenceMin: 0.1, referenceMax: 1.2 },
    'DBIL':  { key: 'bilirubin_direct', name: 'Direct Bilirubin', unit: 'mg/dL', referenceMin: 0.0, referenceMax: 0.3 },
    'ALB':   { key: 'albumin', name: 'Albumin', unit: 'g/dL', referenceMin: 3.5, referenceMax: 5.0 },
    'TP':    { key: 'total_protein', name: 'Total Protein', unit: 'g/dL', referenceMin: 6.0, referenceMax: 8.3 },
    
    // Lipid Panel
    'CHOL':  { key: 'cholesterol', name: 'Total Cholesterol', unit: 'mg/dL', referenceMin: 0, referenceMax: 200 },
    'TRIG':  { key: 'triglycerides', name: 'Triglycerides', unit: 'mg/dL', referenceMin: 0, referenceMax: 150 },
    'HDL':   { key: 'hdl', name: 'HDL Cholesterol', unit: 'mg/dL', referenceMin: 40, referenceMax: 60 },
    'LDL':   { key: 'ldl', name: 'LDL Cholesterol', unit: 'mg/dL', referenceMin: 0, referenceMax: 100 },
    'VLDL':  { key: 'vldl', name: 'VLDL Cholesterol', unit: 'mg/dL', referenceMin: 5, referenceMax: 40 },
    
    // Cardiac/Other
    'URIC':  { key: 'uric_acid', name: 'Uric Acid', unit: 'mg/dL', referenceMin: 3.5, referenceMax: 7.2 },
    'PHOS':  { key: 'phosphorus', name: 'Phosphorus', unit: 'mg/dL', referenceMin: 2.5, referenceMax: 4.5 },
    'MG':    { key: 'magnesium', name: 'Magnesium', unit: 'mg/dL', referenceMin: 1.7, referenceMax: 2.2 },
    'LDH':   { key: 'ldh', name: 'Lactate Dehydrogenase', unit: 'U/L', referenceMin: 140, referenceMax: 280 },
    'CK':    { key: 'ck', name: 'Creatine Kinase', unit: 'U/L', referenceMin: 30, referenceMax: 200 },
    'AMY':   { key: 'amylase', name: 'Amylase', unit: 'U/L', referenceMin: 28, referenceMax: 100 },
    'LIP':   { key: 'lipase', name: 'Lipase', unit: 'U/L', referenceMin: 0, referenceMax: 160 },
    
    // Renal
    'EGFR':  { key: 'egfr', name: 'eGFR', unit: 'mL/min/1.73m²', referenceMin: 90, referenceMax: 120 },
    'CYSC':  { key: 'cystatin_c', name: 'Cystatin C', unit: 'mg/L', referenceMin: 0.53, referenceMax: 0.95 }
};

class BeckmanAUDriver extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            host: config.host || '192.168.1.100',
            port: config.port || 5200,
            timeout: config.timeout || 30000,
            instrumentId: config.instrumentId || null,
            mode: config.mode || 'server',
        };
        this.server = null;
        this.clients = new Map();
        this.connected = false;
    }
    
    async start() {
        if (this.config.mode === 'server') {
            return this.startServer();
        }
        return this.connectToInstrument();
    }
    
    async startServer() {
        return new Promise((resolve, reject) => {
            this.server = net.createServer((socket) => this.handleClient(socket));
            this.server.on('error', (err) => { this.emit('error', err); reject(err); });
            this.server.listen(this.config.port, '0.0.0.0', () => {
                console.log(`[BeckmanAU] Listening on port ${this.config.port}`);
                this.emit('listening', { port: this.config.port });
                resolve({ success: true });
            });
        });
    }
    
    handleClient(socket) {
        const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
        this.clients.set(clientId, socket);
        this.connected = true;
        this.emit('connected', { clientId });
        
        let buffer = '';
        socket.on('data', (data) => {
            buffer += data.toString('utf8');
            while (buffer.includes(VT) && buffer.includes(FS + CR)) {
                const start = buffer.indexOf(VT);
                const end = buffer.indexOf(FS + CR);
                if (start !== -1 && end > start) {
                    this.processHL7(buffer.substring(start + 1, end), socket);
                    buffer = buffer.substring(end + 2);
                } else break;
            }
        });
        socket.on('close', () => { this.clients.delete(clientId); this.emit('disconnected'); });
        socket.on('error', (err) => this.emit('error', err));
    }
    
    processHL7(message, socket) {
        const segments = message.split('\r');
        const msh = segments.find(s => s.startsWith('MSH'));
        if (!msh) return;
        
        const mshFields = msh.split('|');
        const messageType = mshFields[8];
        const controlId = mshFields[9];
        
        if (messageType?.startsWith('ORU')) {
            const results = this.parseResults(segments);
            if (results.results && Object.keys(results.results).length > 0) {
                this.emit('results', results);
            }
        }
        
        // Send ACK
        const ack = this.buildACK(controlId, mshFields);
        socket.write(VT + ack + FS + CR);
    }
    
    parseResults(segments) {
        const output = { barcode: null, patientId: null, timestamp: new Date(), instrumentModel: 'Beckman AU', results: {} };
        
        for (const seg of segments) {
            const f = seg.split('|');
            if (f[0] === 'PID') output.patientId = f[3]?.split('^')[0];
            if (f[0] === 'OBR') output.barcode = f[3] || f[2];
            if (f[0] === 'OBX') {
                const code = f[3]?.split('^')[0];
                const value = parseFloat(f[5]);
                const mapping = BECKMAN_AU_PARAMETER_MAPPINGS[code];
                if (mapping && !isNaN(value)) {
                    output.results[mapping.key] = { value, unit: f[6] || mapping.unit, name: mapping.name, flag: f[8] || 'N' };
                }
            }
        }
        return output;
    }
    
    buildACK(controlId, msh) {
        const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
        return `MSH|^~\\&|WOLF_HMS|HOSPITAL|${msh[4]}|${msh[5]}|${ts}||ACK^R01|ACK${controlId}|P|2.5\rMSA|AA|${controlId}`;
    }
    
    async stop() {
        if (this.server) {
            this.clients.forEach(s => s.destroy());
            return new Promise(r => this.server.close(r));
        }
    }
    
    async testConnection() {
        return new Promise((resolve) => {
            const test = net.createServer();
            test.on('error', (e) => resolve({ success: false, message: e.message }));
            test.listen(this.config.port, () => test.close(() => resolve({ success: true, message: `Port ${this.config.port} available` })));
        });
    }
    
    getStatus() { return { connected: this.connected, port: this.config.port, clients: this.clients.size }; }
}

module.exports = { BeckmanAUDriver, BECKMAN_AU_PARAMETER_MAPPINGS };
