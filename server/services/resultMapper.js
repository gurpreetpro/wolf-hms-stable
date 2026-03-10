/**
 * Result Mapper Service
 * Maps instrument results to WOLF HMS LIS format
 * Matches results with pending lab requests
 */

const pool = require('../config/db');

class ResultMapper {
    constructor() {
        this.testCodeCache = new Map(); // Cache for test type lookups
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Map instrument result to LIS format
     * @param {number} instrumentId - Source instrument ID
     * @param {object} result - Parsed result from instrument
     * @param {object} patient - Patient info from message (if available)
     * @param {object} order - Order info from message (if available)
     * @returns {object} Mapped result with lab request match
     */
    async mapResult(instrumentId, result, patient = null, order = null) {
        const mappedResult = {
            matched: false,
            labRequestId: null,
            patientId: null,
            admissionId: null,
            testCode: result.testCode || result.universalTestId?.identifier || '',
            testName: result.testName || result.universalTestId?.text || '',
            value: this.parseValue(result.value),
            unit: this.parseUnit(result.units),
            referenceRange: result.referenceRange || result.refRange || '',
            flag: this.normalizeFlag(result.abnormalFlag || result.flag),
            status: result.resultStatus || 'F',
            instrumentId,
            rawResult: result
        };

        // Try to match with pending lab request
        const match = await this.findMatchingRequest(
            mappedResult.testCode,
            mappedResult.testName,
            order?.specimenId,
            patient?.labPatientId || patient?.patientId
        );

        if (match) {
            mappedResult.matched = true;
            mappedResult.labRequestId = match.id;
            mappedResult.patientId = match.patient_id;
            mappedResult.admissionId = match.admission_id;
        }

        return mappedResult;
    }

    /**
     * Find matching lab request for result
     */
    async findMatchingRequest(testCode, testName, specimenId = null, patientId = null) {
        // Priority 1: Match by specimen barcode
        if (specimenId) {
            const barcodeMatch = await pool.query(`
                SELECT lr.id, lr.patient_id, lr.admission_id, ltt.name as test_name
                FROM lab_requests lr
                JOIN lab_test_types ltt ON lr.test_type_id = ltt.id
                WHERE lr.barcode = $1
                AND lr.status IN ('Sample Collected', 'In Progress', 'Pending')
                LIMIT 1
            `, [specimenId]);

            if (barcodeMatch.rows.length > 0) {
                return barcodeMatch.rows[0];
            }
        }

        // Priority 2: Match by test code + recent pending request
        const testType = await this.getTestTypeByCode(testCode, testName);
        if (testType) {
            let query = `
                SELECT lr.id, lr.patient_id, lr.admission_id, ltt.name as test_name
                FROM lab_requests lr
                JOIN lab_test_types ltt ON lr.test_type_id = ltt.id
                WHERE lr.test_type_id = $1
                AND lr.status IN ('Sample Collected', 'In Progress')
            `;
            const params = [testType.id];

            // If patient ID available, add to query
            if (patientId) {
                query += ` AND lr.patient_id = $2`;
                params.push(patientId);
            }

            query += ` ORDER BY lr.created_at DESC LIMIT 1`;

            const match = await pool.query(query, params);
            if (match.rows.length > 0) {
                return match.rows[0];
            }
        }

        // Priority 3: Fuzzy match by test name
        if (testName) {
            const fuzzyMatch = await pool.query(`
                SELECT lr.id, lr.patient_id, lr.admission_id, ltt.name as test_name
                FROM lab_requests lr
                JOIN lab_test_types ltt ON lr.test_type_id = ltt.id
                WHERE ltt.name ILIKE $1
                AND lr.status IN ('Sample Collected', 'In Progress')
                ORDER BY lr.created_at DESC
                LIMIT 1
            `, [`%${testName}%`]);

            if (fuzzyMatch.rows.length > 0) {
                return fuzzyMatch.rows[0];
            }
        }

        return null;
    }

    /**
     * Get test type by code or name
     */
    async getTestTypeByCode(code, name = '') {
        // Check cache first
        const cacheKey = `${code}_${name}`.toLowerCase();
        const cached = this.testCodeCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }

        // Query database
        let result = await pool.query(`
            SELECT id, name, code FROM lab_test_types 
            WHERE code = $1 OR name ILIKE $2
            LIMIT 1
        `, [code, `%${name}%`]);

        // Try common mappings if no direct match
        if (result.rows.length === 0) {
            const commonCode = this.mapCommonTestCode(code);
            if (commonCode !== code) {
                result = await pool.query(`
                    SELECT id, name, code FROM lab_test_types 
                    WHERE code = $1 OR name ILIKE $2
                    LIMIT 1
                `, [commonCode, `%${commonCode}%`]);
            }
        }

        const data = result.rows[0] || null;

        // Update cache
        this.testCodeCache.set(cacheKey, { data, timestamp: Date.now() });

        return data;
    }

    /**
     * Map common instrument test codes to standard names
     */
    mapCommonTestCode(code) {
        const codeMap = {
            // Biochemistry
            'GLU': 'Glucose',
            'GLUC': 'Glucose',
            'UREA': 'Blood Urea',
            'BUN': 'Blood Urea Nitrogen',
            'CREAT': 'Creatinine',
            'CRE': 'Creatinine',
            'SGOT': 'AST',
            'SGPT': 'ALT',
            'AST': 'AST',
            'ALT': 'ALT',
            'ALP': 'Alkaline Phosphatase',
            'TBIL': 'Total Bilirubin',
            'DBIL': 'Direct Bilirubin',
            'TP': 'Total Protein',
            'ALB': 'Albumin',
            'CHOL': 'Cholesterol',
            'TG': 'Triglycerides',
            'HDL': 'HDL Cholesterol',
            'LDL': 'LDL Cholesterol',
            'UA': 'Uric Acid',
            'CA': 'Calcium',
            'PHOS': 'Phosphorus',
            'NA': 'Sodium',
            'K': 'Potassium',
            'CL': 'Chloride',

            // Hematology
            'WBC': 'WBC Count',
            'RBC': 'RBC Count',
            'HGB': 'Hemoglobin',
            'HCT': 'Hematocrit',
            'MCV': 'MCV',
            'MCH': 'MCH',
            'MCHC': 'MCHC',
            'PLT': 'Platelet Count',
            'NEUT': 'Neutrophils',
            'LYMPH': 'Lymphocytes',
            'MONO': 'Monocytes',
            'EOS': 'Eosinophils',
            'BASO': 'Basophils',
            'ESR': 'ESR',

            // Others
            'TSH': 'TSH',
            'T3': 'T3',
            'T4': 'T4',
            'FT3': 'Free T3',
            'FT4': 'Free T4',
            'HBA1C': 'HbA1c',
            'PSA': 'PSA'
        };

        return codeMap[code.toUpperCase()] || code;
    }

    /**
     * Parse result value
     */
    parseValue(value) {
        if (!value) return '';

        // Handle array format (from some parsers)
        if (Array.isArray(value)) {
            return value[0]?.toString() || '';
        }

        // Handle object format
        if (typeof value === 'object') {
            return value.value || value.v || JSON.stringify(value);
        }

        return value.toString().trim();
    }

    /**
     * Parse unit
     */
    parseUnit(units) {
        if (!units) return '';

        if (Array.isArray(units)) {
            return units[0] || '';
        }

        if (typeof units === 'object') {
            return units.identifier || units.text || '';
        }

        return units.toString().trim();
    }

    /**
     * Normalize abnormal flag
     */
    normalizeFlag(flag) {
        if (!flag) return 'N';

        const flagStr = flag.toString().toUpperCase().trim();

        // Standard flags
        const flagMap = {
            'H': 'H',      // High
            'HH': 'HH',    // Critical High
            'L': 'L',      // Low
            'LL': 'LL',    // Critical Low
            'N': 'N',      // Normal
            'A': 'A',      // Abnormal
            '>': 'H',
            '<': 'L',
            '*': 'A'
        };

        return flagMap[flagStr] || 'N';
    }

    /**
     * Batch map multiple results
     */
    async mapResults(instrumentId, results, patient = null, order = null) {
        const mappedResults = [];

        for (const result of results) {
            const mapped = await this.mapResult(instrumentId, result, patient, order);
            mappedResults.push(mapped);
        }

        return mappedResults;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.testCodeCache.clear();
    }
}

module.exports = { ResultMapper };
