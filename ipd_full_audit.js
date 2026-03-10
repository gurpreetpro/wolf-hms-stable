const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });
const { pool } = require('./server/db');
const FinanceService = require('./server/services/FinanceService');
const prisma = require('./server/config/prisma');
const { addToInvoice } = require('./server/services/billingService');

async function testFullAudit() {
    console.log('🧪 Starting IPD Full Audit (Services & Consumables)...');
    let patientId, admissionId, hospitalId = 1;

    try {
        // 1. Setup
        const patient = await prisma.patients.create({
            data: { name: 'Full Audit Patient', hospital_id: hospitalId }
        });
        patientId = patient.id;

        const admission = await prisma.admissions.create({
            data: {
                patients: { connect: { id: patientId } },
                hospitals: { connect: { id: hospitalId } },
                admission_date: new Date(),
                status: 'Admitted'
            }
        });
        admissionId = admission.id;
        console.log(`Setup: Patient ${patientId}, Admission ${admissionId}`);

        // 2. Simulate Real-time Billing (e.g. Lab Order or Consumable)
        console.log('--- Simulating Real-time Charge (Nurse/Lab) ---');
        // Simulate what NurseController.recordConsumable does:
        // It inserts into patient_consumables AND calls addToInvoice
        
        // A. Insert into source table (so FinanceService sees it)
        // We'll mock a "Consumable" by inserting into patient_consumables direct, 
        // assuming a consumable exists. Or better, allow FinanceService to fail gracefully 
        // if we cheat. Let's try to be realistic.
        // Actually, let's just use addToInvoice directly, mimicking the Controller's billing action.
        // AND insert into a source table that FinanceService reads.
        
        // Mock Source: Lab Request
        await pool.query(`INSERT INTO lab_requests (admission_id, patient_id, test_type_id, status, test_price, hospital_id) VALUES ($1, $2, 1, 'Completed', 500, $3)`, [admissionId, patientId, hospitalId]);
        
        // Mock Billing Action (Controller does this)
        await addToInvoice(patientId, admissionId, "Lab Test: CBC (Real-time)", 1, 500, 1, hospitalId);
        console.log('✅ Real-time charge added.');

        // 3. Check Pending Invoice
        const pendingInvoices = await prisma.invoices.findMany({
            where: { patient_id: patientId, status: 'Pending' },
            include: { invoice_items: true }
        });
        console.log(`Pending Invoices (Pre-Discharge): ${pendingInvoices.length}`);
        if(pendingInvoices.length > 0) {
             console.log('Items:', pendingInvoices[0].invoice_items.map(i => i.description));
        }

        // 4. Run Discharge Billing
        console.log('--- Running Discharge (FinanceService) ---');
        // We assume Lab Requests are read by FinanceService.calculateLabCharges
        // We need to ensure calculateLabCharges actually finds something. 
        // It looks for "Completed" requests. We inserted one above.
        
        // Note: FinanceService.calculateLabCharges logic:
        /*
            const labRequests = await prisma.lab_requests.findMany({
                where: { admission_id: ..., status: 'Completed', ... }
            });
        */
        
        const dischargeInvoice = await FinanceService.generateInvoice({
            admissionId: admissionId,
            patientId: patientId,
            userId: 1,
            hospitalId: hospitalId
        });
        console.log(`Generated Discharge Invoice: ${dischargeInvoice.id}`);

        // 5. Final Check
        const finalInvoices = await prisma.invoices.findMany({
            where: { patient_id: patientId, status: 'Pending' },
            include: { invoice_items: true }
        });

        console.log(`\nTOTAL Pending Invoices: ${finalInvoices.length}`);
        finalInvoices.forEach(inv => {
            console.log(`Invoice #${inv.id} (Total: ${inv.total_amount})`);
            inv.invoice_items.forEach(item => {
                console.log(` - ${item.description}: ${item.total_price}`);
            });
        });

        if (finalInvoices.length > 1) {
            console.log('🚨 FAIL: Double Billing Confirmed (Multiple Invoices)');
        } else if (finalInvoices[0].invoice_items.length > 2) { 
             // 1 Room + 1 Lab (Realtime) + 1 Lab (Discharge)?? 
             // Wait, FinanceService creates a NEW invoice usually.
             console.log('🚨 FAIL: Check for duplicate items in single invoice?');
        } else {
             console.log('✅ PASS: Single Invoice, Correct Items?');
        }

    } catch (e) {
        console.error(e);
    } finally {
        // Cleanup
        await prisma.$disconnect();
    }
}

testFullAudit();
