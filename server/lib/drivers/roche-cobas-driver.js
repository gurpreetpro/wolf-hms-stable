/**
 * Roche cobas Chemistry/Immunoassay Analyzer Driver
 * 
 * Supports: cobas c311, c501, e411 (Chemistry/Immunoassay)
 * Protocol: ASTM E1394
 */

const EventEmitter = require('events');
const net = require('net');

// ASTM Control Characters
const ASTM = { STX: '\x02', ETX: '\x03', EOT: '\x04', ENQ: '\x05', ACK: '\x06', NAK: '\x15', CR: '\x0D', LF: '\x0A' };

// Roche cobas Parameter Mappings
const ROCHE_COBAS_PARAMETER_MAPPINGS = {
    // Chemistry
    'GLU':  { key: 'glucose', name: 'Glucose', unit: 'mg/dL', referenceMin: 70, referenceMax: 100 },
    'UREA': { key: 'urea', name: 'Urea', unit: 'mg/dL', referenceMin: 15, referenceMax: 45 },
    'CREA': { key: 'creatinine', name: 'Creatinine', unit: 'mg/dL', referenceMin: 0.7, referenceMax: 1.3 },
    'CHOL': { key: 'cholesterol', name: 'Total Cholesterol', unit: 'mg/dL', referenceMin: 0, referenceMax: 200 },
    'TRIG': { key: 'triglycerides', name: 'Triglycerides', unit: 'mg/dL', referenceMin: 0, referenceMax: 150 },
    'HDLC': { key: 'hdl', name: 'HDL Cholesterol', unit: 'mg/dL', referenceMin: 40, referenceMax: 60 },
    'LDLC': { key: 'ldl', name: 'LDL Cholesterol', unit: 'mg/dL', referenceMin: 0, referenceMax: 100 },
    'ALT':  { key: 'alt', name: 'ALT/SGPT', unit: 'U/L', referenceMin: 7, referenceMax: 56 },
    'AST':  { key: 'ast', name: 'AST/SGOT', unit: 'U/L', referenceMin: 10, referenceMax: 40 },
    'ALP':  { key: 'alp', name: 'Alkaline Phosphatase', unit: 'U/L', referenceMin: 44, referenceMax: 147 },
    'GGT':  { key: 'ggt', name: 'GGT', unit: 'U/L', referenceMin: 9, referenceMax: 48 },
    'TBIL': { key: 'bilirubin_total', name: 'Total Bilirubin', unit: 'mg/dL', referenceMin: 0.1, referenceMax: 1.2 },
    'DBIL': { key: 'bilirubin_direct', name: 'Direct Bilirubin', unit: 'mg/dL', referenceMin: 0.0, referenceMax: 0.3 },
    'TP':   { key: 'total_protein', name: 'Total Protein', unit: 'g/dL', referenceMin: 6.0, referenceMax: 8.3 },
    'ALB':  { key: 'albumin', name: 'Albumin', unit: 'g/dL', referenceMin: 3.5, referenceMax: 5.0 },
    'UA':   { key: 'uric_acid', name: 'Uric Acid', unit: 'mg/dL', referenceMin: 3.5, referenceMax: 7.2 },
    'CA':   { key: 'calcium', name: 'Calcium', unit: 'mg/dL', referenceMin: 8.5, referenceMax: 10.5 },
    'PHOS': { key: 'phosphorus', name: 'Phosphorus', unit: 'mg/dL', referenceMin: 2.5, referenceMax: 4.5 },
    'AMY':  { key: 'amylase', name: 'Amylase', unit: 'U/L', referenceMin: 28, referenceMax: 100 },
    'LIP':  { key: 'lipase', name: 'Lipase', unit: 'U/L', referenceMin: 0, referenceMax: 160 },
    
    // Immunoassay (e411)
    'TSH':   { key: 'tsh', name: 'TSH', unit: 'mIU/L', referenceMin: 0.4, referenceMax: 4.0 },
    'FT4':   { key: 'ft4', name: 'Free T4', unit: 'ng/dL', referenceMin: 0.8, referenceMax: 1.8 },
    'FT3':   { key: 'ft3', name: 'Free T3', unit: 'pg/mL', referenceMin: 2.3, referenceMax: 4.2 },
    'TPOA':  { key: 'tpo_antibody', name: 'TPO Antibody', unit: 'IU/mL', referenceMin: 0, referenceMax: 35 },
    'VITD':  { key: 'vitamin_d', name: 'Vitamin D (25-OH)', unit: 'ng/mL', referenceMin: 30, referenceMax: 100 },
    'B12':   { key: 'vitamin_b12', name: 'Vitamin B12', unit: 'pg/mL', referenceMin: 200, referenceMax: 900 },
    'FOL':   { key: 'folate', name: 'Folate', unit: 'ng/mL', referenceMin: 3, referenceMax: 17 },
    'FERR':  { key: 'ferritin', name: 'Ferritin', unit: 'ng/mL', referenceMin: 20, referenceMax: 200 },
    'PSA':   { key: 'psa', name: 'PSA Total', unit: 'ng/mL', referenceMin: 0, referenceMax: 4.0 },
    'HBA1C': { key: 'hba1c', name: 'HbA1c', unit: '%', referenceMin: 4.0, referenceMax: 5.6 },
    'CRP':   { key: 'crp', name: 'C-Reactive Protein', unit: 'mg/L', referenceMin: 0, referenceMax: 5 }
};

class RocheCobasDriver extends EventEmitter {
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
        this.sessionActive = false;
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
                console.log(`[RocheCobas] Listening on port ${this.config.port}`);
                resolve({ success: true });
            });
        });
    }
    
    handleClient(socket) {
        const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
        this.clients.set(clientId, socket);
        this.connected = true;
        this.emit('connected', { clientId });
        
        let collection = { patient: null, order: null, results: [] };
        
        socket.on('data', (chunk) => {
            // ENQ - Start session
            if (chunk.includes(Buffer.from([0x05]))) {
                socket.write(Buffer.from([0x06])); // ACK
                this.sessionActive = true;
                return;
            }
            // EOT - End session
            if (chunk.includes(Buffer.from([0x04]))) {
                if (collection.results.length > 0) {
                    this.emitResults(collection);
                    collection = { patient: null, order: null, results: [] };
                }
                this.sessionActive = false;
                return;
            }
            
            // Process ASTM frames
            const data = chunk.toString('ascii');
            socket.write(Buffer.from([0x06])); // ACK each frame
            
            const lines = data.split(/[\r\n]+/);
            lines.forEach(line => {
                const clean = line.replace(/[\x02\x03]/g, '').trim();
                if (clean.length < 3) return;
                
                const type = clean.match(/^\d?([A-Z])/)?.[1];
                const fields = clean.split('|');
                
                if (type === 'P') collection.patient = { id: fields[3], name: fields[5] };
                if (type === 'O') collection.order = { barcode: fields[3] || fields[2] };
                if (type === 'R') {
                    const code = fields[2]?.split('^').pop();
                    const value = parseFloat(fields[3]);
                    if (code && !isNaN(value)) {
                        collection.results.push({ code, value, unit: fields[4], flag: fields[6] });
                    }
                }
            });
        });
        
        socket.on('close', () => { this.clients.delete(clientId); this.emit('disconnected'); });
    }
    
    emitResults(collection) {
        const mapped = {};
        collection.results.forEach(r => {
            const m = ROCHE_COBAS_PARAMETER_MAPPINGS[r.code];
            if (m) mapped[m.key] = { value: r.value, unit: r.unit || m.unit, name: m.name, flag: r.flag };
        });
        
        this.emit('results', {
            barcode: collection.order?.barcode,
            patientId: collection.patient?.id,
            timestamp: new Date(),
            instrumentModel: 'Roche cobas',
            results: mapped
        });
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
}

module.exports = { RocheCobasDriver, ROCHE_COBAS_PARAMETER_MAPPINGS };
