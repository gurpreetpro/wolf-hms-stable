const { pool } = require('../db');

/**
 * AI Data Steward Agent
 * "The Custodian of Data Quality"
 * 
 * Capabilities:
 * 1. Drift Detection (Regex/Pattern analysis)
 * 2. Deduplication (Fuzzy Matching)
 * 3. Semantic Normalization (Proposal generation)
 */

class AIDataSteward {

    /**
     * Scan a specific table/column for formatting drift.
     * @param {string} table - Database table name
     * @param {string} column - Column to scan
     * @param {string} type - 'PHONE', 'EMAIL', 'NAME', 'ADDRESS', 'CITY'
     */
    static async scanForDrift(table, column, type) {
        // Safety check to prevent SQL Injection via table/column names
        const allowedTables = ['patients', 'users', 'doctors'];
        const allowedColumns = ['phone', 'email', 'name', 'address', 'city'];
        
        if (!allowedTables.includes(table) || !allowedColumns.includes(column)) {
            throw new Error('Invalid table or column for scanning');
        }

        const query = `SELECT id, ${column} as value FROM ${table}`;
        const result = await pool.query(query);
        
        const driftCandidates = [];

        for (const row of result.rows) {
            const val = row.value;
            if (!val) continue;

            let issue = null;
            let suggestion = null;

            switch (type) {
                case 'PHONE':
                    // Rule: Must be 10 digits, no spaces/dashes
                    const cleanPhone = val.replace(/\D/g, '');
                    if (cleanPhone.length !== 10) {
                        issue = 'Invalid Length';
                    } else if (val !== cleanPhone) {
                        issue = 'Formatting (contains non-digits)';
                        suggestion = cleanPhone;
                    }
                    break;

                case 'EMAIL':
                    // Basic Regex
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                        issue = 'Invalid Email Format';
                    }
                    break;
                
                case 'NAME':
                    // Rule: Should not be all lowercase or all uppercase (unless short)
                    if (val.length > 3 && (val === val.toUpperCase() || val === val.toLowerCase())) {
                        issue = 'Casing Issue';
                        // Simple Title Case suggestion
                        suggestion = val.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
                    }
                    break;

                case 'CITY':
                    // Semantic Clustering (Simple Map for now)
                    const cityMap = {
                        'blore': 'Bengaluru',
                        'bangalore': 'Bengaluru',
                        'bengaluru': 'Bengaluru', // Standard
                        'bombay': 'Mumbai',
                        'mumbai': 'Mumbai', // Standard
                        'calcutta': 'Kolkata'
                    };
                    const lowerVal = val.toLowerCase().replace(/[^a-z]/g, '');
                    if (cityMap[lowerVal] && cityMap[lowerVal] !== val) {
                         issue = 'Non-Standard City Name';
                         suggestion = cityMap[lowerVal];
                    }
                    break;
            }

            if (issue) {
                driftCandidates.push({
                    id: row.id,
                    current_value: val,
                    issue_type: issue,
                    proposed_fix: suggestion || 'Manual Review'
                });
            }
        }

        return driftCandidates;
    }

    /**
     * Find potential duplicates in patients table using fuzzy logic.
     * @returns {Array} List of duplicate groups
     */
    static async findDuplicates() {
        // Fetch all patients (Naive approach for < 10k records is fine)
        const result = await pool.query('SELECT id, name, phone FROM patients');
        const patients = result.rows;
        
        const candidates = [];
        const seen = new Set();

        for (let i = 0; i < patients.length; i++) {
            if (seen.has(patients[i].id)) continue;

            const group = [patients[i]];
            
            for (let j = i + 1; j < patients.length; j++) {
                if (seen.has(patients[j].id)) continue;

                const p1 = patients[i];
                const p2 = patients[j];
                
                let score = 0;

                // 1. Phone Match (Strong Signal)
                if (p1.phone && p2.phone && p1.phone === p2.phone) {
                    score += 50;
                }

                // 2. Name Match (Levenshtein/Similarity exact for now or simple includes)
                // Using simple containment or exact match for MVP
                if (p1.name.toLowerCase() === p2.name.toLowerCase()) {
                    score += 40;
                } else if (p1.name.toLowerCase().includes(p2.name.toLowerCase()) || p2.name.toLowerCase().includes(p1.name.toLowerCase())) {
                    score += 20;
                }

                // Threshold
                if (score >= 50) {
                    group.push(p2);
                    seen.add(p2.id);
                }
            }

            if (group.length > 1) {
                candidates.push({
                    confidence: 'High',
                    patients: group
                });
                seen.add(patients[i].id);
            }
        }

        return candidates;
    }
}

module.exports = AIDataSteward;
