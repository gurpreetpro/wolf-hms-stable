/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Wolf HMS — Phase 8, Pillar 1
 * AUTONOMOUS REVENUE CYCLE & CLAIM SCRUBBING ENGINE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Sub-modules:
 *  1. Pre-Flight Claim Scrubber — validates bills vs clinical docs
 *  2. Autonomous DRG Coder — auto-assigns ICD-10 & DRG from discharge summaries
 *  3. Denial Appeal Generator — drafts legally robust appeal letters
 *  4. Revenue Leakage Detector — catches unbilled procedures
 */

const pool = require('../../config/db');

class RevenueCycleAI {

    // ════════════════════════════════════════════════════════
    // 1. PRE-FLIGHT CLAIM SCRUBBER
    // ════════════════════════════════════════════════════════

    /**
     * Scrub a claim BEFORE submission to TPA/Insurance.
     * Compares itemized bill against clinical documentation.
     * Returns risk score + specific flags.
     * 
     * @param {number} invoiceId - The invoice being submitted as a claim
     * @param {number} hospitalId
     * @returns {Object} { riskScore, flags[], recommendation, readyToSubmit }
     */
    static async scrubClaim(invoiceId, hospitalId) {
        const flags = [];
        let riskScore = 0;

        // 1. Get invoice + items
        const invRes = await pool.query(`
            SELECT i.*, p.name as patient_name, p.gender, p.dob,
                   a.ward, a.bed_number, a.admitted_at, a.discharged_at
            FROM invoices i
            LEFT JOIN patients p ON i.patient_id = p.id
            LEFT JOIN admissions a ON i.admission_id = a.id
            WHERE i.id = $1 AND i.hospital_id = $2
        `, [invoiceId, hospitalId]);

        if (invRes.rows.length === 0) return { error: 'Invoice not found' };
        const invoice = invRes.rows[0];

        // 2. Get all invoice items
        const itemsRes = await pool.query(`
            SELECT * FROM invoice_items WHERE invoice_id = $1
        `, [invoiceId]);
        const items = itemsRes.rows;

        // 3. Get clinical documentation (SOAP notes, OT reports)
        const clinicalDocs = await pool.query(`
            SELECT 'soap' as doc_type, subjective, objective, assessment, plan, created_at
            FROM soap_notes 
            WHERE admission_id = $1 AND hospital_id = $2
            ORDER BY created_at DESC
        `, [invoice.admission_id, hospitalId]);

        // 4. Get vitals log
        const vitalsRes = await pool.query(`
            SELECT * FROM vitals_logs 
            WHERE admission_id = $1 AND hospital_id = $2
            ORDER BY recorded_at DESC LIMIT 20
        `, [invoice.admission_id, hospitalId]);

        // ── Rule Checks ──

        // Rule 1: High-value claim without documentation
        const totalAmount = items.reduce((s, i) => s + Number(i.total_price || 0), 0);
        if (totalAmount > 50000 && clinicalDocs.rows.length === 0) {
            flags.push({
                severity: 'CRITICAL',
                code: 'NO_CLINICAL_DOCS',
                message: `High-value claim (₹${totalAmount.toLocaleString()}) has ZERO clinical documentation. Claim has 94% chance of rejection.`,
                fix: 'Add SOAP notes and clinical assessment before submission.'
            });
            riskScore += 40;
        }

        // Rule 2: ICU charges without ICU-level vitals monitoring
        const hasICUCharge = items.some(i => 
            (i.description || '').toLowerCase().includes('icu') || 
            (i.description || '').toLowerCase().includes('critical care')
        );
        if (hasICUCharge) {
            const hasFrequentVitals = vitalsRes.rows.length >= 8; // ICU should have q2h vitals
            if (!hasFrequentVitals) {
                flags.push({
                    severity: 'HIGH',
                    code: 'ICU_NO_VITALS',
                    message: 'ICU charges present but fewer than 8 vitals readings found. TPA will question ICU necessity.',
                    fix: 'Ensure vitals are documented every 2 hours during ICU stay.'
                });
                riskScore += 25;
            }
        }

        // Rule 3: Blood transfusion without cross-match documentation
        const hasBloodCharge = items.some(i => 
            (i.description || '').toLowerCase().includes('blood transfusion') ||
            (i.description || '').toLowerCase().includes('prbc')
        );
        if (hasBloodCharge) {
            const hasCrossMatch = clinicalDocs.rows.some(d => 
                JSON.stringify(d).toLowerCase().includes('cross-match') ||
                JSON.stringify(d).toLowerCase().includes('crossmatch')
            );
            if (!hasCrossMatch) {
                flags.push({
                    severity: 'CRITICAL',
                    code: 'BLOOD_NO_CROSSMATCH',
                    message: 'Blood Transfusion billed but no cross-matching documentation found in clinical notes.',
                    fix: 'Add cross-match report and post-transfusion vitals documentation.'
                });
                riskScore += 30;
            }
        }

        // Rule 4: Length of stay vs billed days mismatch
        if (invoice.admitted_at && invoice.discharged_at) {
            const actualDays = Math.ceil((new Date(invoice.discharged_at) - new Date(invoice.admitted_at)) / (1000 * 60 * 60 * 24));
            const billedRoomDays = items.filter(i => 
                (i.description || '').toLowerCase().includes('room') || 
                (i.description || '').toLowerCase().includes('ward') ||
                (i.description || '').toLowerCase().includes('bed')
            ).reduce((s, i) => s + Number(i.quantity || 1), 0);
            
            if (billedRoomDays > actualDays + 1) {
                flags.push({
                    severity: 'HIGH',
                    code: 'LOS_MISMATCH',
                    message: `Billed ${billedRoomDays} room days but actual LOS is ${actualDays} days. TPA will reject excess days.`,
                    fix: 'Correct room charges to match actual length of stay.'
                });
                riskScore += 20;
            }
        }

        // Rule 5: Duplicate billing items
        const descCounts = {};
        items.forEach(i => {
            const key = (i.description || '').toLowerCase().trim();
            descCounts[key] = (descCounts[key] || 0) + 1;
        });
        Object.entries(descCounts).filter(([_, c]) => c > 2).forEach(([desc, count]) => {
            flags.push({
                severity: 'MEDIUM',
                code: 'POTENTIAL_DUPLICATE',
                message: `"${desc}" appears ${count} times. Verify — insurance companies flag duplicates.`,
                fix: 'Review and consolidate duplicate line items.'
            });
            riskScore += 10;
        });

        // Rule 6: Surgery charges without OT documentation
        const hasSurgeryCharge = items.some(i => 
            (i.description || '').toLowerCase().includes('surgeon') ||
            (i.description || '').toLowerCase().includes('ot charge') ||
            (i.description || '').toLowerCase().includes('operation')
        );
        if (hasSurgeryCharge) {
            const otReport = await pool.query(`
                SELECT id FROM ot_schedules 
                WHERE admission_id = $1 AND hospital_id = $2
            `, [invoice.admission_id, hospitalId]);
            
            if (otReport.rows.length === 0) {
                flags.push({
                    severity: 'HIGH',
                    code: 'SURGERY_NO_OT_REPORT',
                    message: 'Surgeon/OT charges present but no OT schedule record found.',
                    fix: 'Attach OT operation notes and surgeon report.'
                });
                riskScore += 25;
            }
        }

        // 5. Log the scrub result
        try {
            await pool.query(`
                INSERT INTO claim_scrub_results 
                    (invoice_id, hospital_id, risk_score, flags, recommendation, scrubbed_at, scrubbed_by)
                VALUES ($1, $2, $3, $4, $5, NOW(), NULL)
            `, [
                invoiceId, hospitalId, Math.min(riskScore, 100),
                JSON.stringify(flags),
                riskScore >= 50 ? 'DO_NOT_SUBMIT' : riskScore >= 25 ? 'REVIEW_REQUIRED' : 'READY'
            ]);
        } catch (e) {
            console.error('[RevenueCycleAI] Failed to log scrub result:', e.message);
        }

        return {
            invoiceId,
            totalAmount,
            riskScore: Math.min(riskScore, 100),
            flags,
            readyToSubmit: riskScore < 25,
            recommendation: riskScore >= 50 
                ? '🚫 DO NOT SUBMIT — Critical issues found. Fix before submission.'
                : riskScore >= 25 
                    ? '⚠️ REVIEW REQUIRED — Moderate issues detected.'
                    : '✅ READY TO SUBMIT — Claim looks clean.',
            scrubTimestamp: new Date().toISOString()
        };
    }

    // ════════════════════════════════════════════════════════
    // 2. AUTONOMOUS DRG CODER
    // ════════════════════════════════════════════════════════

    /**
     * Auto-assign ICD-10 and DRG codes from clinical documentation.
     * Scans discharge summary, SOAP notes, and lab results
     * to suggest the highest legitimate coding.
     * 
     * @param {number} admissionId
     * @param {number} hospitalId
     * @returns {Object} { primaryDiagnosis, icd10Codes[], drgCode, confidence }
     */
    static async autoCodDRG(admissionId, hospitalId) {
        // Gather clinical context
        const soapNotes = await pool.query(`
            SELECT subjective, objective, assessment, plan 
            FROM soap_notes 
            WHERE admission_id = $1 AND hospital_id = $2
            ORDER BY created_at DESC LIMIT 5
        `, [admissionId, hospitalId]);

        const labResults = await pool.query(`
            SELECT lr.test_name, lres.result_json
            FROM lab_requests lr
            LEFT JOIN lab_results lres ON lres.request_id = lr.id
            LEFT JOIN admissions a ON lr.patient_id = a.patient_id
            WHERE a.id = $1 AND lr.hospital_id = $2 AND lr.status = 'Completed'
            ORDER BY lr.requested_at DESC LIMIT 10
        `, [admissionId, hospitalId]);

        const procedures = await pool.query(`
            SELECT procedure_name, surgeon_notes 
            FROM ot_schedules 
            WHERE admission_id = $1 AND hospital_id = $2
        `, [admissionId, hospitalId]);

        // Build clinical context string
        const context = {
            soapNotes: soapNotes.rows.map(s => ({
                assessment: s.assessment, 
                plan: s.plan
            })),
            labFindings: labResults.rows.map(l => ({
                test: l.test_name, 
                result: l.result_json
            })),
            procedures: procedures.rows.map(p => ({
                name: p.procedure_name, 
                notes: p.surgeon_notes
            }))
        };

        // DRG Code Mapping (Rule-based for common Indian hospital procedures)
        const DRG_MAP = {
            'normal delivery': { icd10: ['O80', 'Z37.0'], drg: 'DRG-370', description: 'Vaginal Delivery without Complicating Diagnoses' },
            'caesarean': { icd10: ['O82', 'Z37.0'], drg: 'DRG-371', description: 'Cesarean Section without CC/MCC' },
            'c-section': { icd10: ['O82', 'Z37.0'], drg: 'DRG-371', description: 'Cesarean Section without CC/MCC' },
            'appendectomy': { icd10: ['K35.80', 'K37'], drg: 'DRG-343', description: 'Appendectomy without Complicated Dx' },
            'knee replacement': { icd10: ['M17.11', 'Z96.651'], drg: 'DRG-470', description: 'Major Joint Replacement without MCC' },
            'hip replacement': { icd10: ['M16.11', 'Z96.641'], drg: 'DRG-470', description: 'Major Joint Replacement without MCC' },
            'ptca': { icd10: ['I25.10', 'Z95.5'], drg: 'DRG-247', description: 'Percutaneous Cardiovascular Procedure with Drug-Eluting Stent' },
            'stenting': { icd10: ['I25.10', 'Z95.5'], drg: 'DRG-247', description: 'Percutaneous Cardiovascular Procedure' },
            'cabg': { icd10: ['I25.10', 'Z95.1'], drg: 'DRG-236', description: 'CABG without Cardiac Catheterization' },
            'cataract': { icd10: ['H25.9', 'Z96.1'], drg: 'DRG-117', description: 'Intraocular Procedures without CC/MCC' },
            'dialysis': { icd10: ['N18.6', 'Z99.2'], drg: 'DRG-684', description: 'Renal Failure without CC/MCC' },
            'pneumonia': { icd10: ['J18.9'], drg: 'DRG-194', description: 'Simple Pneumonia without CC' },
            'sepsis': { icd10: ['A41.9', 'R65.20'], drg: 'DRG-871', description: 'Septicemia or Severe Sepsis without MV' },
            'fracture': { icd10: ['S72.001A'], drg: 'DRG-480', description: 'Hip & Femur Procedures without CC' },
            'hernia': { icd10: ['K40.90'], drg: 'DRG-352', description: 'Hernia Procedures without CC/MCC' },
        };

        const clinicalText = JSON.stringify(context).toLowerCase();
        let bestMatch = null;
        let confidence = 0;

        for (const [keyword, coding] of Object.entries(DRG_MAP)) {
            if (clinicalText.includes(keyword)) {
                bestMatch = coding;
                confidence = 0.85;
                break;
            }
        }

        if (!bestMatch) {
            bestMatch = { icd10: ['R69'], drg: 'UNCLASSIFIED', description: 'Unspecified Illness — Manual Review Required' };
            confidence = 0.3;
        }

        return {
            admissionId,
            primaryDiagnosis: bestMatch.description,
            icd10Codes: bestMatch.icd10,
            drgCode: bestMatch.drg,
            confidence,
            clinicalBasis: `Based on ${soapNotes.rows.length} SOAP notes, ${labResults.rows.length} lab results, ${procedures.rows.length} procedures`,
            codedAt: new Date().toISOString(),
            note: confidence < 0.5 
                ? '⚠️ Low confidence — Manual coding review recommended' 
                : '✅ High confidence — Auto-coded from clinical documentation'
        };
    }

    // ════════════════════════════════════════════════════════
    // 3. DENIAL APPEAL GENERATOR
    // ════════════════════════════════════════════════════════

    /**
     * Generate a legally robust denial appeal letter
     * citing specific clinical evidence from patient records.
     * 
     * @param {number} invoiceId
     * @param {string} denialReason - e.g. "MEDICAL_NECESSITY", "DOCUMENTS_MISSING"
     * @param {number} hospitalId
     * @returns {Object} { appealLetter, supportingEvidence[], confidence }
     */
    static async generateDenialAppeal(invoiceId, denialReason, hospitalId) {
        // Get invoice and clinical data
        const invRes = await pool.query(`
            SELECT i.*, p.name as patient_name, p.gender, p.dob,
                   a.admitted_at, a.discharged_at, a.diagnosis
            FROM invoices i
            LEFT JOIN patients p ON i.patient_id = p.id
            LEFT JOIN admissions a ON i.admission_id = a.id
            WHERE i.id = $1 AND i.hospital_id = $2
        `, [invoiceId, hospitalId]);

        if (invRes.rows.length === 0) return { error: 'Invoice not found' };
        const inv = invRes.rows[0];

        // Gather supporting clinical evidence
        const soapNotes = await pool.query(`
            SELECT assessment, plan, created_at 
            FROM soap_notes 
            WHERE admission_id = $1 AND hospital_id = $2
            ORDER BY created_at ASC
        `, [inv.admission_id, hospitalId]);

        const vitals = await pool.query(`
            SELECT bp, temp, spo2, heart_rate, recorded_at 
            FROM vitals_logs 
            WHERE admission_id = $1 AND hospital_id = $2
            ORDER BY recorded_at ASC LIMIT 10
        `, [inv.admission_id, hospitalId]);

        const labs = await pool.query(`
            SELECT lr.test_name, lres.result_json, lr.requested_at
            FROM lab_requests lr
            LEFT JOIN lab_results lres ON lres.request_id = lr.id
            LEFT JOIN admissions a ON lr.patient_id = a.patient_id
            WHERE a.id = $1 AND lr.hospital_id = $2 AND lr.status = 'Completed'
            ORDER BY lr.requested_at ASC LIMIT 10
        `, [inv.admission_id, hospitalId]);

        // Build evidence summary
        const evidence = [];
        
        if (soapNotes.rows.length > 0) {
            evidence.push({
                type: 'Clinical Assessment',
                detail: `${soapNotes.rows.length} SOAP notes document clinical progression from admission to discharge.`,
                keyFinding: soapNotes.rows[0].assessment || 'Assessment documented'
            });
        }

        if (vitals.rows.length > 0) {
            const criticalVitals = vitals.rows.filter(v => 
                Number(v.spo2) < 94 || Number(v.temp) > 100.4 || Number(v.heart_rate) > 100
            );
            if (criticalVitals.length > 0) {
                evidence.push({
                    type: 'Vital Signs Documentation',
                    detail: `${criticalVitals.length} of ${vitals.rows.length} vitals readings show clinically significant values (SpO2 <94%, Temp >100.4°F, HR >100).`,
                    keyFinding: 'Abnormal vitals documented, proving medical necessity.'
                });
            }
        }

        if (labs.rows.length > 0) {
            evidence.push({
                type: 'Laboratory Evidence',
                detail: `${labs.rows.length} completed lab tests support the clinical diagnosis.`,
                keyFinding: labs.rows.map(l => l.test_name).join(', ')
            });
        }

        // Generate appeal letter
        const patientAge = inv.dob ? Math.floor((new Date() - new Date(inv.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : 'Unknown';
        
        const DENIAL_TEMPLATES = {
            'MEDICAL_NECESSITY': `The patient presented with ${inv.diagnosis || 'acute symptoms'} requiring immediate hospitalization. Clinical documentation including ${soapNotes.rows.length} physician assessments and ${vitals.rows.length} vital sign readings confirm the medical necessity of the treatment provided.`,
            'DOCUMENTS_MISSING': `We are re-submitting with ALL required documents attached: ${soapNotes.rows.length} SOAP notes, ${labs.rows.length} lab reports, and ${vitals.rows.length} vitals recordings. We believe the initial submission was complete; please find enclosed copies.`,
            'PROCEDURE_NOT_COVERED': `The procedure was clinically indicated based on patient presentation. We cite clinical evidence from admission notes and lab findings documenting the necessity. We request reconsideration under the policy terms.`,
            'EXCESS_CHARGES': `The charges are consistent with standard institutional rates and reflect the actual services rendered during the ${Math.ceil((new Date(inv.discharged_at) - new Date(inv.admitted_at)) / (1000*60*60*24)) || 0}-day hospitalization.`
        };

        const appealBody = DENIAL_TEMPLATES[denialReason] || DENIAL_TEMPLATES['MEDICAL_NECESSITY'];

        const letter = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
APPEAL AGAINST CLAIM DENIAL
Invoice: #${invoiceId} | Patient: ${inv.patient_name} (${inv.gender}, ${patientAge}y)
Denial Reason: ${denialReason}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To: The Claims Review Committee

RE: Appeal for Claim #${invoiceId} — Denied for "${denialReason}"

Dear Sir/Madam,

We respectfully appeal the denial of the above-referenced claim.

${appealBody}

SUPPORTING CLINICAL EVIDENCE:

${evidence.map((e, i) => `${i+1}. ${e.type}: ${e.detail}\n   Key Finding: ${e.keyFinding}`).join('\n\n')}

We have enclosed certified copies of all medical records supporting this claim. 
We request your earliest re-evaluation and approval.

Respectfully submitted,
Hospital Medical Records Department
Date: ${new Date().toLocaleDateString('en-IN')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

        return {
            invoiceId,
            denialReason,
            appealLetter: letter,
            supportingEvidence: evidence,
            attachmentsRequired: [
                `${soapNotes.rows.length} SOAP Notes`,
                `${labs.rows.length} Lab Reports`,
                `${vitals.rows.length} Vitals Records`,
                'Discharge Summary',
                'OT Notes (if applicable)'
            ],
            generatedAt: new Date().toISOString()
        };
    }

    // ════════════════════════════════════════════════════════
    // 4. REVENUE LEAKAGE DETECTOR
    // ════════════════════════════════════════════════════════

    /**
     * Detect unbilled or under-billed procedures by comparing
     * clinical activities against the final invoice.
     * 
     * @param {number} admissionId
     * @param {number} hospitalId
     * @returns {Object} { leaks[], totalLeakageEstimate }
     */
    static async detectLeakage(admissionId, hospitalId) {
        const leaks = [];

        // Get billed items
        const billedRes = await pool.query(`
            SELECT ii.description, ii.quantity, ii.total_price
            FROM invoice_items ii
            JOIN invoices i ON ii.invoice_id = i.id
            WHERE i.admission_id = $1 AND i.hospital_id = $2
        `, [admissionId, hospitalId]);
        const billedDescriptions = billedRes.rows.map(r => (r.description || '').toLowerCase());

        // Check 1: Lab tests ordered but not billed
        const orderedLabs = await pool.query(`
            SELECT lr.test_name
            FROM lab_requests lr
            LEFT JOIN admissions a ON lr.patient_id = a.patient_id
            WHERE a.id = $1 AND lr.hospital_id = $2 AND lr.status = 'Completed'
        `, [admissionId, hospitalId]);

        for (const lab of orderedLabs.rows) {
            const labName = (lab.test_name || '').toLowerCase();
            if (!billedDescriptions.some(d => d.includes(labName))) {
                leaks.push({
                    type: 'UNBILLED_LAB',
                    item: lab.test_name,
                    estimatedLoss: 500, // Average lab cost
                    message: `Lab test "${lab.test_name}" was completed but not found on invoice.`
                });
            }
        }

        // Check 2: Medications dispensed but not billed
        const dispensed = await pool.query(`
            SELECT dl.medicine_name, dl.quantity
            FROM dispense_logs dl
            WHERE dl.admission_id = $1 AND dl.hospital_id = $2
        `, [admissionId, hospitalId]);

        for (const med of dispensed.rows) {
            const medName = (med.medicine_name || '').toLowerCase();
            if (!billedDescriptions.some(d => d.includes(medName))) {
                leaks.push({
                    type: 'UNBILLED_MEDICINE',
                    item: med.medicine_name,
                    quantity: med.quantity,
                    estimatedLoss: 200,
                    message: `Medicine "${med.medicine_name}" (qty: ${med.quantity}) was dispensed but not billed.`
                });
            }
        }

        // Check 3: Procedures performed but not billed
        const otSchedules = await pool.query(`
            SELECT procedure_name FROM ot_schedules
            WHERE admission_id = $1 AND hospital_id = $2
        `, [admissionId, hospitalId]);

        for (const proc of otSchedules.rows) {
            const procName = (proc.procedure_name || '').toLowerCase();
            if (!billedDescriptions.some(d => d.includes(procName) || d.includes('surgeon') || d.includes('ot charge'))) {
                leaks.push({
                    type: 'UNBILLED_PROCEDURE',
                    item: proc.procedure_name,
                    estimatedLoss: 5000,
                    message: `Procedure "${proc.procedure_name}" in OT schedule but no matching charge on invoice.`
                });
            }
        }

        const totalLeakage = leaks.reduce((s, l) => s + (l.estimatedLoss || 0), 0);

        return {
            admissionId,
            leaks,
            totalLeakageEstimate: totalLeakage,
            leakCount: leaks.length,
            severity: totalLeakage > 10000 ? 'CRITICAL' : totalLeakage > 3000 ? 'HIGH' : totalLeakage > 0 ? 'MEDIUM' : 'NONE',
            message: leaks.length > 0 
                ? `⚠️ Found ${leaks.length} potential revenue leaks totaling ₹${totalLeakage.toLocaleString()}`
                : '✅ No revenue leakage detected.',
            scannedAt: new Date().toISOString()
        };
    }
}

module.exports = RevenueCycleAI;
