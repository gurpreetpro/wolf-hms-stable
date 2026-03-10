const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'server', '.env') });
const prisma = require('./server/config/prisma');

// Constants
const HOSPITAL_ID = 1;
const DOCTOR_ID = 1; 

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function runAudit() {
    console.log('🚀 Starting System-Wide Payment Audit...');

    try {
        // --- SCENARIO 1: Finance Service (Discharge/Manual) ---
        console.log('\n--- 1. Testing FinanceService (Discharge/Manual) ---');
        const FinanceService = require('./server/services/FinanceService');

        // Create a test patient & admission
        const patient = await prisma.patients.create({
            data: {
                name: 'Audit Finance Patient',
                gender: 'Male',
                dob: new Date('1990-01-01'),
                phone: '9999999991',
                hospital_id: HOSPITAL_ID
            }
        });

        const admission = await prisma.admissions.create({
            data: {
                patients: { connect: { id: patient.id } },
                // users: { connect: { id: DOCTOR_ID } }, // Removed: No direct relation in schema
                hospitals: { connect: { id: HOSPITAL_ID } },
                admission_date: new Date(),
                status: 'Admitted',
                ward: 'General',
                bed_number: 'AUDIT-01'
            }
        });

        // Generate Invoice
        const invRes = await pool.query(
            `INSERT INTO invoices (patient_id, admission_id, total_amount, amount_paid, status, hospital_id, generated_at) 
             VALUES ($1, $2, 1000, 0, 'Pending', $3, NOW()) RETURNING id`,
            [patient.id, admission.id, HOSPITAL_ID]
        );
        const invoiceId = invRes.rows[0].id;
        console.log(`Created Invoice #${invoiceId} (Pending, ₹1000)`);

        // Record Payment via FinanceService
        const paymentRes = await FinanceService.recordPayment({
            invoiceId: invoiceId,
            amount: 1000,
            paymentMode: 'Cash',
            referenceNumber: 'MANUAL-TEST',
            notes: 'Audit Manual Payment',
            userId: 1, // Admin
            hospitalId: HOSPITAL_ID
        });

        // Verify Status
        if (paymentRes.invoice.status === 'Paid') {
            console.log('✅ FinanceService: Invoice marked as Paid correctly.');
        } else {
            console.error('❌ FinanceService Failed: Invoice status is ' + paymentRes.invoice.status);
        }

        // --- SCENARIO 2: Payment Gateway (Webhook) ---
        console.log('\n--- 2. Testing PaymentGateway (Online Webhook simulation) ---');
        const { getPaymentGateway } = require('./server/services/paymentGateway');
        const gateway = getPaymentGateway();

        // Create another invoice
        const invRes2 = await pool.query(
            `INSERT INTO invoices (patient_id, admission_id, total_amount, amount_paid, status, hospital_id, generated_at) 
             VALUES ($1, $2, 2000, 0, 'Pending', $3, NOW()) RETURNING id`,
            [patient.id, admission.id, HOSPITAL_ID]
        );
        const invoiceId2 = invRes2.rows[0].id;
        console.log(`Created Invoice #${invoiceId2} (Pending, ₹2000)`);

        // Simulate verified transaction object (internal method test)
        // We are testing `_recordPaymentToInvoice` which we refactored
        await gateway._recordPaymentToInvoice({
            invoice_id: invoiceId2,
            amount: 2000,
            gateway_payment_id: 'pay_test_123',
            gateway_order_id: 'order_test_123',
            hospital_id: HOSPITAL_ID
        });

        // Check Invoice Status directly
        const checkInv = await prisma.invoices.findUnique({ where: { id: invoiceId2 } });
        console.log(`Invoice #${invoiceId2} Status: ${checkInv.status}, Paid: ${checkInv.amount_paid}`);

        if (checkInv.status === 'Paid' && checkInv.amount_paid >= 2000) {
            console.log('✅ PaymentGateway: Invoice marked as Paid correctly.');
        } else {
            console.error('❌ PaymentGateway Failed: Invoice status is ' + checkInv.status);
        }

        // Cleanup
        console.log('\n🧹 Cleaning up test data...');
        // (Optional cleanup code)

    } catch (e) {
        console.error('Audit Failed:', e);
    } finally {
        await pool.end();
        await prisma.$disconnect();
    }
}

runAudit();
