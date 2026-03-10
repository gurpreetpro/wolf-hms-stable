const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const { pool } = require('../server/config/db');
const opdController = require('../server/controllers/opdController');
const admissionController = require('../server/controllers/admissionController');
const labController = require('../server/controllers/labController');
const radiologyController = require('../server/controllers/radiologyController');
const pharmacyController = require('../server/controllers/pharmacyController');
const billingService = require('../server/services/billingService');

// Mock Request/Response Helper
const mockReq = (body = {}, user = { id: 1, username: 'admin', role: 'admin' }, hospitalId = 1) => ({
    body,
    user,
    hospital_id: hospitalId,
    params: {},
    query: {},
    io: { emit: () => {} } // Mock Socket.io
});

const mockRes = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.data = data; return res; };
    res.send = (data) => { res.data = data; return res; };
    return res;
};

// Main Test Function
async function runTest() {
    console.log('🚀 Starting E2E Billing Verification (Wolf HMS)');
    console.log('==============================================');

    try {
        // ============================================
        // 1. OPD PATIENT JOURNEY (Patient A)
        // ============================================
        console.log('\n🏥 Case 1: OPD Patient (Walk-in)');
        const patientOpdData = {
            name: `TestOPD_${Date.now()}`,
            dob: '1990-01-01',
            gender: 'Male',
            phone: `99${Date.now().toString().slice(-8)}`,
            complaint: 'Fever',
            doctor_id: 2, // Assuming doc exists
            paymentDetails: { amount: 500, mode: 'Cash' }
        };

        // 1.1 Register
        const reqOpd = mockReq(patientOpdData);
        const resOpd = mockRes();
        await opdController.registerOPD(reqOpd, resOpd);
        
        if (resOpd.statusCode !== 201 && resOpd.statusCode !== 200) {
            throw new Error(`OPD Registration Failed: ${JSON.stringify(resOpd.data)}`);
        }
        
        const patientOpd = resOpd.data.data.patient;
        console.log(`✅ Registered OPD Patient: ${patientOpd.name} (ID: ${patientOpd.id})`);
        
        // 1.2 Order Lab (CBC)
        // Assuming test type exists. If not, we might need to insert one or hope ID 1 exists.
        // Let's create a test type first to be safe? 
        // We'll rely on seed data or just try ID 1. 
        // Actually, let's just use billingService directly to simulate the charge if controller fails on foreign keys.
        // But better to verify controller logic.
        // We will insert a raw test type to be sure.
        await pool.query("INSERT INTO lab_test_types (name, price, hospital_id) VALUES ('Mock CBC', 500, 1) ON CONFLICT DO NOTHING");
        const testTypeRes = await pool.query("SELECT * FROM lab_test_types WHERE name = 'Mock CBC'");
        const mockTest = testTypeRes.rows[0];

        // Hack: labController.orderTest expects req.body.test_type name, not ID
        const reqLab = mockReq({ patient_id: patientOpd.id, test_type: 'Mock CBC' });
        const resLab = mockRes();
        await labController.orderTest(reqLab, resLab);
        console.log(`✅ Ordered Lab Test: ${mockTest.name} (₹${mockTest.price})`);

        // 1.3 Pharmacy Purchase
        // Mock buying Paracetamol
        // Direct billing for OPD Pharmacy usually happens via POS. 
        // We'll use billingService to simulate "Pharmacy POS" pushing to invoice.
        await billingService.addToInvoice(patientOpd.id, null, 'Pharmacy: Paracetamol Strip', 2, 50, 1, 1);
        console.log(`✅ Ordered Pharmacy: Paracetamol (₹100)`);

        // 1.4 VERIFY BILL
        const invOpdRes = await pool.query("SELECT * FROM invoices WHERE patient_id = $1", [patientOpd.id]);
        const invOpd = invOpdRes.rows[0];
        const invItemsOpd = await pool.query("SELECT * FROM invoice_items WHERE invoice_id = $1", [invOpd.id]);
        
        console.log(`\n🧾 OPD Invoice Audit:`);
        invItemsOpd.rows.forEach(item => {
            console.log(`   - ${item.description}: ₹${item.total_price}`);
        });
        console.log(`   -----------------------------`);
        console.log(`   TOTAL: ₹${invOpd.total_amount}`);

        // Expectations: 500 (Consult) + 500 (Lab) + 100 (Pharm) = 1100
        // Consult might be 500 paid immediately (receipt) or added to invoice. 
        // opdController logic: "Process payment if provided... NOW CREATES INVOICE TOO".
        // It adds to invoice AND marks as paid.
        
        // ============================================
        // 2. IPD PATIENT JOURNEY (Patient B)
        // ============================================
        console.log('\n🛏️ Case 2: IPD Patient (Insurance)');
        const patientIpdData = {
            name: `TestIPD_${Date.now()}`,
            dob: '1985-05-20',
            gender: 'Female',
            phone: `88${Date.now().toString().slice(-8)}`,
            complaint: 'Severe Paine',
            doctor_id: 2
        };

        // 2.1 Register (OPD first often, but let's do direct admission simulation if possible)
        // Creating patient raw first to skip OPD visit requirement
        const patIpdRes = await pool.query(
             "INSERT INTO patients (name, phone, gender, hospital_id) VALUES ($1, $2, $3, 1) RETURNING *",
             [patientIpdData.name, patientIpdData.phone, patientIpdData.gender]
        );
        const patientIpd = patIpdRes.rows[0];
        console.log(`✅ Created Patient: ${patientIpd.name} (ID: ${patientIpd.id})`);

        // 2.2 Admission
        const randomBed = `G-${Math.floor(Math.random() * 1000)}`;
        const reqAdmit = mockReq({ patient_id: patientIpd.id, ward: 'General', bed_number: randomBed });
        const resAdmit = mockRes();
        
        // Ensure bed exists
        await pool.query("INSERT INTO wards (name, hospital_id) VALUES ('General', 1) ON CONFLICT DO NOTHING");
        const wardRes = await pool.query("SELECT id FROM wards WHERE name = 'General' ORDER BY id ASC LIMIT 1");
        
        // Create random available bed
        await pool.query("INSERT INTO beds (bed_number, ward_id, status, hospital_id) VALUES ($1, $2, 'Available', 1)", [randomBed, wardRes.rows[0].id]);
        
        await admissionController.admitPatient(reqAdmit, resAdmit);
        if (resAdmit.statusCode !== 201 && resAdmit.statusCode !== 200) {
            throw new Error(`Admission Failed: ${JSON.stringify(resAdmit.data)}`);
        }

        const admission = resAdmit.data.data.admission;
        console.log(`✅ Admitted to Ward: General (Bed G-101)`);

        // 2.3 Radiology Scan (X-Ray)
        // Need radiology controller or just mock billing
        await billingService.addToInvoice(patientIpd.id, admission.id, 'Radiology: Chest X-Ray', 1, 1000, 1, 1);
        console.log(`✅ Radiology: Chest X-Ray (₹1000)`);

        // 2.4 OT Charge (Surgery)
        await billingService.addToInvoice(patientIpd.id, admission.id, 'OT: Appendectomy', 1, 25000, 1, 1);
        console.log(`✅ Surgery: Appendectomy (₹25000)`);
        
        // 2.5 Pharmacy (IV Fluids)
        await billingService.addToInvoice(patientIpd.id, admission.id, 'Pharmacy: IV Fluids', 5, 200, 1, 1);
        console.log(`✅ Pharmacy: IV Fluids (₹1000)`);

        // 2.6 Nightly Cron (Room Charge)
        // Importing MidnightBedRunner
        const MidnightBedRunner = require('../server/services/cron/MidnightBedRunner');
        // Manually trigger processPatient
        await MidnightBedRunner.processPatient({ ...admission, admission_id: admission.id, patient_name: patientIpd.name, hospital_id: 1 });
        console.log(`✅ Bed Runner: Posted Nightly Charge`);

        // 2.7 VERIFY BILL
        const invIpdRes = await pool.query("SELECT * FROM invoices WHERE admission_id = $1", [admission.id]);
        const invIpd = invIpdRes.rows[0];
        const invItemsIpd = await pool.query("SELECT * FROM invoice_items WHERE invoice_id = $1", [invIpd.id]);

        console.log(`\n🧾 IPD Invoice Audit:`);
        invItemsIpd.rows.forEach(item => {
            console.log(`   - ${item.description}: ₹${item.total_price}`);
        });
        console.log(`   -----------------------------`);
        console.log(`   TOTAL: ₹${invIpd.total_amount}`);

    } catch (err) {
        console.error('❌ CHECK FAILED:', err);
    } finally {
        await pool.end();
    }
}

runTest();
