const { pool } = require('../../config/db');
const { addToInvoice } = require('../billingService');

class MidnightBedRunner {

    /**
     * Run the midnight job to post room charges
     */
    static async runJob() {
        console.log('[BedRunner] 🌙 Starting Midnight Bed Charge Job...');
        
        try {
            // 1. Get all currently admitted patients
            const admittedPatients = await pool.query(
                `SELECT a.id as admission_id, a.patient_id, a.ward, a.bed_number, a.hospital_id, p.name as patient_name
                 FROM admissions a
                 JOIN patients p ON a.patient_id = p.id
                 WHERE a.status = 'Admitted'`
            );

            console.log(`[BedRunner] Found ${admittedPatients.rows.length} active admissions.`);

            for (const admission of admittedPatients.rows) {
                await this.processPatient(admission);
            }

            console.log('[BedRunner] ✅ Midnight Job Completed.');

        } catch (error) {
            console.error('[BedRunner] ❌ Job Failed:', error);
        }
    }

    /**
     * Process a single patient
     */
    static async processPatient(admission) {
        const { admission_id, patient_id, ward, bed_number, hospital_id, patient_name } = admission;

        // RATE CARD (Mock - In real app, fetch from hospital_profile or rates table)
        const RATES = {
            'General': 1500, 'Semi-Private': 3000, 'Private': 5000, 'ICU': 8000
        };
        const price = RATES[ward] || 2000;

        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const chargeDesc = `Nightly Charge - ${ward} (Bed ${bed_number}) [${todayStr}]`;

            // Check if already billed for today (Idempotency via Description)
            const check = await pool.query(
                `SELECT ii.id FROM invoice_items ii
                 JOIN invoices i ON ii.invoice_id = i.id
                 WHERE i.admission_id = $1 
                 AND ii.description = $2`, 
                [admission_id, chargeDesc]
            );

            if (check.rows.length > 0) {
                console.log(`[BedRunner] Skipping ${patient_name} (Already billed today)`);
                return;
            }

            // Create Charge
            // We use a dedicated "System" user ID usually, or null
            const SYSTEM_USER_ID = 1; // Assuming 1 is Admin/System
            
            await addToInvoice(
                patient_id,
                admission_id,
                chargeDesc,
                1,
                price,
                SYSTEM_USER_ID,
                hospital_id
            );

            console.log(`[BedRunner] 💰 Billed ₹${price} to ${patient_name}`);

        } catch (err) {
            console.error(`[BedRunner] Failed to bill ${patient_name}:`, err.message);
        }
    }
}

module.exports = MidnightBedRunner;
