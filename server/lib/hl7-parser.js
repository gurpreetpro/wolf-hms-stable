/**
 * HL7 Parser Library
 * Handles MLLP Framing and Message Parsing
 * Supports: MLLP, ORU^R01, ACK
 */

const VT = String.fromCharCode(0x0b); // Start Block
const FS = String.fromCharCode(0x1c); // End Block
const CR = String.fromCharCode(0x0d); // Carriage Return

// HL7 Control Characters
const HL7 = {
    MLLP_START: VT,
    MLLP_END: FS,
    CR: CR,
    LF: '\x0A',
};

// Default HL7 delimiters
const DEFAULT_DELIMITERS = {
    field: '|',
    component: '^',
    repeat: '~',
    escape: '\\',
    subcomponent: '&'
};

/**
 * Wrap message in MLLP framing
 */
const wrapMLLP = (data) => {
    return `${VT}${data}${FS}${CR}`;
};

/**
 * Unwrap message from MLLP framing
 * Handles potentially buffered chunks (basic implementation assumes full frame)
 */
const unwrapMLLP = (buffer) => {
    let data = buffer.toString();
    if (data.startsWith(VT)) {
        data = data.substring(1);
    }
    if (data.endsWith(FS + CR)) {
        data = data.substring(0, data.length - 2);
    }
    return data;
};

/**
 * Build ACK message for a received message
 */
const buildACK = (originalMessage) => {
    const segments = originalMessage.split('\r');
    const msh = segments.find(s => s.startsWith('MSH'));
    
    if (!msh) return wrapMLLP(`MSH|^~\\&|WOLF_HMS|HOSPITAL|UNKNOWN|UNKNOWN|${new Date().toISOString()}||ACK^R01|ERR|P|2.5\rMSA|AE|UNKNOWN|No MSH Segment`);
    
    const fields = msh.split('|');
    const sendingApp = fields[2] || 'UNKNOWN';
    const sendingFac = fields[3] || 'UNKNOWN';
    const msgControlId = fields[9] || '00000';
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    
    // Construct ACK
    const ackMsh = `MSH|^~\\&|WOLF_HMS|HOSPITAL|${sendingApp}|${sendingFac}|${timestamp}||ACK^R01|ACK${msgControlId}|P|2.5`;
    const ackMsa = `MSA|AA|${msgControlId}|Success`;
    
    return wrapMLLP(`${ackMsh}\r${ackMsa}`);
};

/**
 * Parse ORU^R01 (Observation Result) Message
 * Returns mapped object for DB insertion
 */
const parseORU = (message) => {
    const segments = message.split('\r');
    const results = [];
    
    let currentPatientId = null;
    let currentOrderBarcode = null;
    let patientName = {};
    
    for (const segment of segments) {
        const fields = segment.split('|');
        const segmentType = fields[0];
        
        if (segmentType === 'PID') {
            // PID|1||12345^^^MRN ...
            currentPatientId = fields[3]?.split('^')[0];
            const nameField = fields[5]?.split('^') || [];
            patientName = {
                family: nameField[0],
                given: nameField[1]
            };
        } else if (segmentType === 'ORC') {
            // ORC|RE|ORDER123 ...
            currentOrderBarcode = fields[2];
        } else if (segmentType === 'OBX') {
            // OBX|1|NM|WBC^White Blood Count||10.5|10*3/uL|4.0-10.0|H||F
            if (!currentOrderBarcode) continue;
            
            const testId = fields[3]?.split('^')[0]; // Identifier
            const testName = fields[3]?.split('^')[1] || testId;
            const value = fields[5];
            const units = fields[6];
            const range = fields[7];
            const flag = fields[8]; // H, L, N
            
            results.push({
                barcode: currentOrderBarcode,
                testName,
                testCode: testId,
                value,
                unit: units,
                range,
                flag: flag || 'N',
                timestamp: new Date()
            });
        }
    }
    
    return {
        patientId: currentPatientId,
        patientName,
        results
    };
};

module.exports = {
    HL7,
    DEFAULT_DELIMITERS,
    wrapMLLP,
    unwrapMLLP,
    buildACK,
    parseORU
};
