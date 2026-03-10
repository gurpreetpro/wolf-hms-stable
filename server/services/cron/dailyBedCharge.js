const cron = require('node-cron');
const pool = require('../../config/db');
const { addToInvoice } = require('../billingService');

// Bed Rates (Ideally should be fetched from DB/Config)
const BED_RATES = {
    'General': 1500, 'Semi-Private': 3000, 'Private': 5000,
    'ICU': 8000, 'NICU': 10000, 'Emergency': 3500, 'Deluxe': 7500
};

const runDailyBedCharges = async () => {
    console.log('⏰ Running Daily Bed Charge Cron Job...');
    try {
        // Get all active admissions
        // We only charge if they were admitted BEFORE today (i.e., stayed overnight)
        // OR we can charge for the current day at midnight. 
        // Standard practice: Midnight census. If you are here at 00:00, you are charged for the previous day.
        
        const activeAdmissions = await pool.query(
            "SELECT * FROM admissions WHERE status = 'Admitted'"
        );

        console.log(`Found ${activeAdmissions.rows.length} active patients for bed billing.`);

        for (const patient of activeAdmissions.rows) {
            if (!patient.patient_id || !patient.hospital_id) {
                console.warn(`[DailyBedCharge] Skipping invalid admission ${patient.id}: Missing patient_id or hospital_id`);
                continue;
            }
            const rate = BED_RATES[patient.ward] || 1500; // Default to General if unknown
            const description = `Bed Charge: ${patient.ward} (${patient.bed_number}) - Nightly Charge`;
            
            // Add quantity 1 unit at current rate
            // Assuming 'system' as the user (id: 1 or null if allowed) for the biller
            // We'll use a specific system user ID if available, or just null/1. 
            // `addToInvoice` takes (patient_id, admission_id, description, quantity, unit_price, added_by)
            
            try {
                console.log('Billing Bed Charge:', { pId: patient.patient_id, aId: patient.id, rate, hId: patient.hospital_id });
                await addToInvoice(
                    patient.patient_id,
                    patient.id,
                    description,
                    1,
                    rate,
                    1, // Admin/System ID
                    patient.hospital_id // [FIX] Hospital ID
                );
                console.log(`Charged ${patient.patient_id} for ${patient.ward}`);
            } catch (err) {
                console.error(`Failed to charge patient ${patient.patient_id}:`, err.message);
            }
        }
        console.log('✅ Daily Bed Charges applied successfully.');
    } catch (err) {
        console.error('❌ Error in Daily Bed Charge Cron:', err);
    }
};

// Schedule for 00:00 (Midnight) every day
const initCron = () => {
    // cron.schedule('0 0 * * *', runDailyBedCharges);
    console.log('📅 Bed Charge Cron DISABLED (Audit Fix)');
    // console.log('📅 Bed Charge Cron Scheduled for Midnight');
};

module.exports = { initCron, runDailyBedCharges };
