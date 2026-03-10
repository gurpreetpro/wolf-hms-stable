/**
 * WolfGuard AI - Claims Auditor
 * Services: PII Scrubbing, Clinical Rule Validation, Fraud Detection
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ClaimsAuditor {

    /**
     * Scrub PII from Clinical Data
     * @param {Object} data - Raw claim data
     * @returns {Object} Scrubbed data safe for AI processing
     */
    static scrubPII(data) {
        if (!data) return {};
        const scrubbed = JSON.parse(JSON.stringify(data)); // Deep Copy

        // 1. Redact Direct Identifiers
        if (scrubbed.patient_name) scrubbed.patient_name = '[REDACTED]';
        if (scrubbed.phone) scrubbed.phone = '[REDACTED]';
        if (scrubbed.email) scrubbed.email = '[REDACTED]';
        if (scrubbed.uhid) scrubbed.uhid = 'UHID-XXXX';
        if (scrubbed.policy_number) scrubbed.policy_number = 'POL-XXXX';

        // 2. Redact Narratives (Basic Regex)
        const sensitivePatterns = [
            /\b\d{10}\b/g, // Phone numbers
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g // Emails
        ];

        if (scrubbed.diagnosis_notes) {
            sensitivePatterns.forEach(regex => {
                scrubbed.diagnosis_notes = scrubbed.diagnosis_notes.replace(regex, '[REDACTED]');
            });
        }

        return scrubbed;
    }

    /**
     * Analyze Claim for Risk (Rule-Based + Mock AI)
     * @param {Object} claimData 
     */
    static async auditClaim(claimData) {
        const rules = [];
        let riskScore = 0; // 0-100 (100 = High Risk)

        // --- Rule 1: High Value without Preauth ---
        if (claimData.amount > 50000 && !claimData.preauth_id) {
            rules.push('High value claim (>50k) missing Pre-Auth');
            riskScore += 40;
        }

        // --- Rule 2: ICU Mismatch ---
        // Example: ICU Charge present but Diagnosis is 'Fever'
        if (JSON.stringify(claimData).toLowerCase().includes('icu') && 
            ['fever', 'headache', 'weakness'].some(t => JSON.stringify(claimData).toLowerCase().includes(t))) {
            rules.push('Clinical Mismatch: ICU charges for minor ailment');
            riskScore += 30;
        }

        // --- Rule 3: Length of Stay ---
        if (claimData.admission_date && claimData.discharge_date) {
            const days = (new Date(claimData.discharge_date) - new Date(claimData.admission_date)) / (1000 * 60 * 60 * 24);
            if (days < 1 && claimData.amount > 20000) {
                rules.push('Day-care procedure with unexpectedly high cost');
                riskScore += 20;
            }
        }

        return {
            isSafe: riskScore < 50,
            riskScore,
            flags: rules,
            auditId: `AUD-${Date.now()}`
        };
    }

    /**
     * Predict Denial Reason (Mocked LLM)
     */
    static async predictDenial(claimData) {
        // In a real implementation, this would call OpenAI/Gemini with scrubbed data
        const scrubbed = this.scrubPII(claimData);
        
        // Mock Response
        if (scrubbed.amount > 100000) {
            return {
                probability: 0.85,
                likelyReason: 'DOCUMENTS_MISSING',
                suggestion: 'Attach detailed surgical notes and implant stickers.'
            };
        }
        
        return {
            probability: 0.15,
            likelyReason: 'NONE',
            suggestion: 'Claim looks clean.'
        };
    }
}

module.exports = ClaimsAuditor;
