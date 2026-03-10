const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });
const { pool } = require('./server/db');
const prisma = require('./server/config/prisma');
const { addToInvoice, recordPayment } = require('./server/services/billingService');

// Mock Data
const HOSPITAL_ID = 1;
const DOCTOR_ID = 1; // Assuming admin/doctor exists

async function testOPDAudit() {
    console.log('🧪 Starting OPD Audit (Ghost Debt Check)...');
    let patientId;

    try {
        // 1. Register Patient (Simulating opdController.registerOPD logic)
        console.log('--- Step 1: OPD Registration (Paid) ---');
        // ... (patient creation)
        
        // Create Invoice (Consultation)
        const consultFee = 500;
        const invoiceId = await addToInvoice(patientId, null, "OPD Consult", 1, consultFee, DOCTOR_ID, HOSPITAL_ID);
        console.log(`Invoice Created: #${invoiceId}`);
        
        // Record Payment (Using NEW Helper)
        await recordPayment({
            invoice_id: invoiceId,
            patient_id: patientId,
            amount: consultFee,
            payment_mode: 'Cash',
            hospital_id: HOSPITAL_ID,
            notes: 'Audit Payment'
        });
        console.log('Payment Recorded (Cash) via recordPayment');

        // CHECK INVOICE STATUS
        let inv = await prisma.invoices.findUnique({ where: { id: invoiceId } });
        console.log(`[Check 1] Invoice Status: ${inv.status} (Expected: Paid)`);
        if (inv.status === 'Pending') console.log('⚠️  Ghost Debt Warning: Invoice is still Pending after payment!');

        // 2. Order Lab Test (Simulating LabController)
        console.log('\n--- Step 2: Lab Order (Paid) ---');
        const labFee = 300;
        // Add to SAME invoice
        await addToInvoice(patientId, null, "Lab: Blood Test", 1, labFee, DOCTOR_ID, HOSPITAL_ID);
        console.log('Lab Charge Added to Invoice');

        // ... (verify total)

        // Simulate Lab Payment (Using NEW Helper)
        await recordPayment({
            invoice_id: invoiceId,
            patient_id: patientId,
            amount: labFee,
            payment_mode: 'UPI',
            hospital_id: HOSPITAL_ID,
            notes: 'Audit Lab Payment'
        });
         console.log('Lab Payment Recorded (UPI) via recordPayment');

         // Final Check
         inv = await prisma.invoices.findUnique({ where: { id: invoiceId } });
         // ... (assertions)

         // Final Check
         inv = await prisma.invoices.findUnique({ where: { id: invoiceId } });
         console.log(`[Check 3] Final Invoice Status: ${inv.status}`);
         
         // Calculate Total Paid
         const payments = await prisma.payments.findMany({ where: { invoice_id: invoiceId } });
         const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
         console.log(`Total Invoiced: ${inv.total_amount}, Total Paid: ${totalPaid}`);
         
         if (inv.status === 'Pending' && totalPaid >= inv.total_amount) {
             console.log('🚨 FAIL: Ghost Debt Confirmed. Patient paid in full, but Invoice is Pending.');
         } else {
             console.log('✅ PASS: Invoice is Closed/Paid.');
         }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

testOPDAudit();
