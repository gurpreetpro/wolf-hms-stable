/**
 * ASTM E1381/E1394 Parser for Lab Instrument Integration
 * Handles bi-directional ASTM protocol communication
 * 
 * ASTM E1381: Low-level communication (framing, handshaking)
 * ASTM E1394: High-level data structure (message format)
 */

// ASTM Control Characters
const ASTM = {
    STX: '\x02',  // Start of Text
    ETX: '\x03',  // End of Text
    EOT: '\x04',  // End of Transmission
    ENQ: '\x05',  // Enquiry
    ACK: '\x06',  // Acknowledge
    NAK: '\x15',  // Negative Acknowledge
    ETB: '\x17',  // End of Transmission Block
    LF: '\x0A',  // Line Feed
    CR: '\x0D',  // Carriage Return
};

// Default field delimiters
const DEFAULT_DELIMITERS = {
    field: '|',
    repeat: '\\',
    component: '^',
    escape: '&'
};

/**
 * Parse ASTM message into structured data
 * @param {string} rawMessage - Raw ASTM message
 * @param {object} config - Parser configuration
 * @returns {object} Parsed message with records
 */
function parseASTMMessage(rawMessage, config = {}) {
    const delimiters = { ...DEFAULT_DELIMITERS, ...config };
    const result = {
        header: null,
        patients: [],
        orders: [],
        results: [],
        terminator: null,
        raw: rawMessage,
        parseErrors: []
    };

    try {
        // Remove control characters and split into records
        const cleanMessage = rawMessage
            .replace(/[\x02\x03\x04\x05\x06\x15\x17]/g, '')
            .trim();

        const records = cleanMessage.split(/[\r\n]+/).filter(r => r.length > 0);

        for (const record of records) {
            const recordType = record.charAt(0);
            const fields = splitFields(record, delimiters.field);

            switch (recordType) {
                case 'H': // Header
                    result.header = parseHeader(fields, delimiters);
                    break;
                case 'P': // Patient
                    result.patients.push(parsePatient(fields, delimiters));
                    break;
                case 'O': // Order
                    result.orders.push(parseOrder(fields, delimiters));
                    break;
                case 'R': // Result
                    result.results.push(parseResult(fields, delimiters));
                    break;
                case 'C': // Comment
                    // Add to last result if exists
                    if (result.results.length > 0) {
                        result.results[result.results.length - 1].comment = fields[3] || '';
                    }
                    break;
                case 'L': // Terminator
                    result.terminator = { type: 'L', sequence: fields[1] };
                    break;
                case 'Q': // Query
                    result.query = parseQuery(fields, delimiters);
                    break;
                default:
                    result.parseErrors.push(`Unknown record type: ${recordType}`);
            }
        }
    } catch (error) {
        result.parseErrors.push(`Parse error: ${error.message}`);
    }

    return result;
}

/**
 * Parse Header record
 */
function parseHeader(fields, delimiters) {
    return {
        type: 'H',
        delimiters: fields[1] || '\\^&',
        messageControlId: fields[2] || '',
        accessPassword: fields[3] || '',
        senderName: parseComponent(fields[4], delimiters.component),
        senderAddress: fields[5] || '',
        reserved: fields[6] || '',
        senderPhone: fields[7] || '',
        characterSet: fields[8] || '',
        receiverId: fields[9] || '',
        comments: fields[10] || '',
        processingId: fields[11] || 'P', // P=Production, D=Debug
        versionNo: fields[12] || '1',
        timestamp: fields[13] || ''
    };
}

/**
 * Parse Patient record
 */
function parsePatient(fields, delimiters) {
    const dob = fields[7] || '';
    return {
        type: 'P',
        sequence: fields[1] || '1',
        practicePatientId: fields[2] || '',
        labPatientId: fields[3] || '',
        patientIdNo3: fields[4] || '',
        patientName: parseComponent(fields[5], delimiters.component),
        mothersMaidenName: fields[6] || '',
        birthdate: dob ? formatDate(dob) : null,
        sex: fields[8] || '',
        race: fields[9] || '',
        address: fields[10] || '',
        phone: fields[11] || '',
        attendingPhysician: parseComponent(fields[12], delimiters.component),
        specialField1: fields[13] || '',
        specialField2: fields[14] || '',
        height: fields[15] || '',
        weight: fields[16] || '',
        diagnosis: fields[17] || '',
        medications: fields[18] || '',
        diet: fields[19] || '',
        practiceField1: fields[20] || '',
        practiceField2: fields[21] || '',
        admissionDate: fields[22] || '',
        admissionStatus: fields[23] || '',
        location: fields[24] || ''
    };
}

/**
 * Parse Order record
 */
function parseOrder(fields, delimiters) {
    const testId = parseComponent(fields[4], delimiters.component);
    return {
        type: 'O',
        sequence: fields[1] || '1',
        specimenId: fields[2] || '',
        instrumentSpecimenId: fields[3] || '',
        universalTestId: testId,
        testName: Array.isArray(testId) ? testId[3] : testId,
        priority: fields[5] || 'R', // R=Routine, S=STAT
        requestedDateTime: fields[6] || '',
        collectionDateTime: fields[7] || '',
        collectionEndDateTime: fields[8] || '',
        collectionVolume: fields[9] || '',
        collectorId: fields[10] || '',
        actionCode: fields[11] || '', // A=Add, C=Cancel, N=New
        dangerCode: fields[12] || '',
        clinicalInfo: fields[13] || '',
        receivedDateTime: fields[14] || '',
        specimenDescriptor: fields[15] || '',
        orderingPhysician: parseComponent(fields[16], delimiters.component),
        physicianPhone: fields[17] || '',
        userField1: fields[18] || '',
        userField2: fields[19] || '',
        labField1: fields[20] || '',
        labField2: fields[21] || '',
        reportedDateTime: fields[22] || '',
        instrumentChargeCode: fields[23] || '',
        instrumentSectionId: fields[24] || '',
        reportType: fields[25] || '', // O=Order, F=Final, X=Cancel
        reserved: fields[26] || ''
    };
}

/**
 * Parse Result record
 */
function parseResult(fields, delimiters) {
    const testId = parseComponent(fields[2], delimiters.component);
    return {
        type: 'R',
        sequence: fields[1] || '1',
        universalTestId: testId,
        testCode: Array.isArray(testId) ? testId[3] : testId,
        testName: Array.isArray(testId) ? testId[4] : '',
        value: parseComponent(fields[3], delimiters.component),
        units: fields[4] || '',
        referenceRange: fields[5] || '',
        abnormalFlag: fields[6] || '', // L=Low, H=High, LL=Critical Low, HH=Critical High, N=Normal
        nature: fields[7] || '', // N=Normal, R=Repeat, C=Corrected
        resultStatus: fields[8] || 'F', // F=Final, P=Preliminary, C=Corrected, X=Cancelled
        dateOfChange: fields[9] || '',
        operatorId: fields[10] || '',
        dateStarted: fields[11] || '',
        dateCompleted: fields[12] || '',
        instrumentId: fields[13] || ''
    };
}

/**
 * Parse Query record
 */
function parseQuery(fields, delimiters) {
    return {
        type: 'Q',
        sequence: fields[1] || '1',
        startingRange: fields[2] || '',
        endingRange: fields[3] || '',
        universalTestId: parseComponent(fields[4], delimiters.component),
        natureOfRequest: fields[5] || '', // S=Status, R=Result
        requestedDateTime: fields[6] || ''
    };
}

/**
 * Build ASTM message from structured data
 * @param {object} data - Message data
 * @param {object} config - Builder configuration  
 * @returns {string} ASTM formatted message
 */
function buildASTMMessage(data, config = {}) {
    const delimiters = { ...DEFAULT_DELIMITERS, ...config };
    const lines = [];
    let frameNumber = 1;

    // Header
    lines.push(buildHeader(data.header || {}, delimiters, frameNumber++));

    // Patients
    if (data.patients) {
        for (const patient of data.patients) {
            lines.push(buildPatient(patient, delimiters, frameNumber++));
        }
    }

    // Orders
    if (data.orders) {
        for (const order of data.orders) {
            lines.push(buildOrder(order, delimiters, frameNumber++));
        }
    }

    // Terminator
    lines.push(`L|1|N${ASTM.CR}`);

    // Wrap in ASTM framing
    return wrapASTMFrame(lines.join(''));
}

/**
 * Build Header record
 */
function buildHeader(header, delimiters, seq) {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    return `H|${delimiters.repeat}${delimiters.component}${delimiters.escape}|||${header.senderName || 'WOLF_HMS'}|||||${header.receiverId || ''}||P|1|${timestamp}${ASTM.CR}`;
}

/**
 * Build Patient record
 */
function buildPatient(patient, delimiters, seq) {
    return `P|${seq}||${patient.patientId || ''}||${patient.name || ''}||${patient.birthdate || ''}|${patient.sex || ''}${ASTM.CR}`;
}

/**
 * Build Order record
 */
function buildOrder(order, delimiters, seq) {
    const testId = `^^^${order.testCode || ''}`;
    return `O|${seq}|${order.specimenId || ''}||${testId}|${order.priority || 'R'}|||||||A${ASTM.CR}`;
}

/**
 * Wrap message in ASTM E1381 frame with checksum
 */
function wrapASTMFrame(content) {
    // Calculate checksum (sum of all chars mod 256, as 2-digit hex)
    let checksum = 0;
    for (let i = 0; i < content.length; i++) {
        checksum = (checksum + content.charCodeAt(i)) % 256;
    }
    const checksumHex = checksum.toString(16).toUpperCase().padStart(2, '0');

    return `${ASTM.STX}${content}${ASTM.ETX}${checksumHex}${ASTM.CR}${ASTM.LF}`;
}

/**
 * Validate ASTM frame checksum
 */
function validateChecksum(frame) {
    if (frame.length < 5) return false;

    const content = frame.slice(1, -4); // Remove STX and ETX+checksum+CRLF
    const receivedChecksum = frame.slice(-4, -2);

    let calculatedChecksum = 0;
    for (let i = 0; i < content.length; i++) {
        calculatedChecksum = (calculatedChecksum + content.charCodeAt(i)) % 256;
    }

    return calculatedChecksum.toString(16).toUpperCase().padStart(2, '0') === receivedChecksum;
}

// Utility functions
function splitFields(record, delimiter) {
    return record.split(delimiter);
}

function parseComponent(field, delimiter) {
    if (!field) return '';
    if (field.includes(delimiter)) {
        return field.split(delimiter);
    }
    return field;
}

function formatDate(dateStr) {
    // YYYYMMDD to YYYY-MM-DD
    if (dateStr.length === 8) {
        return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    return dateStr;
}

// Export functions
module.exports = {
    ASTM,
    DEFAULT_DELIMITERS,
    parseASTMMessage,
    buildASTMMessage,
    wrapASTMFrame,
    validateChecksum,
    parseHeader,
    parsePatient,
    parseOrder,
    parseResult
};
