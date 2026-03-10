const { pool } = require('../db');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getServiceRate = async (code, hospitalId) => {
    try {
        const res = await pool.query('SELECT base_price FROM service_master WHERE code = $1 AND (hospital_id = $2 OR hospital_id IS NULL) LIMIT 1', [code, hospitalId]);
        if (res.rows.length > 0) return parseFloat(res.rows[0].base_price);
    } catch (e) {
        console.error(`Error fetching rate for ${code}:`, e.message);
    }
    return null;
};

async function test() {
    console.log('🧪 Testing Granular Billing...');
    
    // 1. Create a dummy patient & admission
    const patient = await prisma.patients.create({
        data: {
             name: 'Test Patient Granular',
             gender: 'Male',
             phone: '9999999999',
             hospital_id: 1,
             uhid: `TEST-${Date.now()}`
        }
    });
    
    const admission = await prisma.admissions.create({
        data: {
            patient_id: patient.id,
            ward: 'General',
            bed_number: 'G-101',
            status: 'Admitted',
            hospital_id: 1,
            admission_date: new Date()
        }
    });

    console.log(`✅ Created Admission: ${admission.id}`);

    // 2. Add Completed Lab Request
    // First ensure we have a test type
    let testType = await prisma.lab_test_types.findFirst({ where: { name: 'CBC' } });
    if (!testType) {
        testType = await prisma.lab_test_types.create({
            data: { name: 'CBC', price: 300, hospital_id: 1 }
        });
    }

    await prisma.lab_requests.create({
        data: {
            admission_id: admission.id,
            patient_id: patient.id,
            test_type_id: testType.id,
            test_name: 'Complete Blood Count (Test)',
            status: 'Completed',
            hospital_id: 1
        }
    });
    console.log(`✅ Added Lab Request: CBC (Price: ${testType.price})`);

    // DEBUG: Test Service Master Access
    try {
        const smCheck = await prisma.service_master.findFirst();
        console.log(`[TEST SCRIPT] Service Master (Prisma) Found: ${smCheck ? smCheck.code : 'None'}`);
    } catch (e) {
        console.error('[TEST SCRIPT] Service Master Query Failed:', e);
    }

    // 3. Add Completed Medication Task
    // We need to use pool for care_tasks if it's not in prisma or use raw query
    // Since I don't see care_tasks in prisma schema file I viewed earlier, I'll use raw SQL
    // Wait, let's try raw insert to be safe
    await pool.query(`
        INSERT INTO care_tasks (admission_id, type, description, status, hospital_id)
        VALUES ($1, 'Medication', 'Paracetamol 500mg', 'Completed', 1)
    `, [admission.id]);
    console.log(`✅ Added Medication: Paracetamol`);

    // 4. Trigger Invoice Generation
    // We'll call the controller logic (simulated by calling the API or just running the logic code?)
    // Simulating the controller logic by calling a helper function would be best, 
    // but here I will just call the API endpoint if server is running, OR 
    // better, I'll invoke the generateInvoice logic via an internal "tester" if I exported it.
    // Or I can copy the logic here? No, I want to test the actual controller.
    // I can use `supertest` or just `axios` against localhost?
    // Since I am in the `server` folder and access to DB, I can just emulate the HTTP request using a script that imports the controller?
    // But controller expects `req, res`.
    
    // Let's rely on manual axios call to the running server?
    // Or I can just write a unit test style script that imports the controller.
    
    const { generateInvoice } = require('../controllers/financeController');
    
    const req = {
        body: { admission_id: admission.id, patient_id: patient.id },
        user: { id: 1 }
    };
    
    const res = {
        status: (code) => {
             console.log(`Response Status: ${code}`);
             return res;
        },
        json: (data) => {
             console.log('--- INVOICE GENERATED ---');
             console.log(`Total Amount: ${data.data.invoice.total_amount}`);
             console.log('Items:');
             // Fetch items from DB to be sure
             return data;
        },
        // responseHandler uses .json({ success: ..., data: ... })
        // Let's mock responseHandler behavior which calls res.status().json()
    };
    
    // Mocking response handler usage in controller: ResponseHandler.success(res, ...)
    // which calls res.status(200).json(...)
    
    // Mock Next function
    const next = (err) => {
        console.log('❌ Controller threw error:', err);
    };

    console.log('[TEST] Calling generateInvoice...');
    await generateInvoice(req, res, next);
    console.log('[TEST] generateInvoice returned.');

    // 5. Query the invoice items to verify
    const invoices = await prisma.invoices.findMany({
        where: { admission_id: admission.id },
        include: { invoice_items: true },
        orderBy: { generated_at: 'desc' }
    });
    
    if (invoices.length === 0) {
        console.error('❌ No invoices generated!');
        process.exit(1);
    }

    const latestInv = invoices[0];
    console.log(`\n🔍 Verification for Invoice #${latestInv.id}:`);
    latestInv.invoice_items.forEach(item => {
        console.log(` - ${item.description}: ₹${item.total_price}`);
    });

    const hasLab = latestInv.invoice_items.some(i => i.description && i.description.includes('Lab:'));
    const hasMeds = latestInv.invoice_items.some(i => i.description && i.description.includes('Meds:'));
    
    if (hasLab && hasMeds) {
        console.log('\nSUCCESS: Granular items found! 🚀');
    } else {
        console.error(`\nFAILURE: Missing granular items! (Lab: ${hasLab}, Meds: ${hasMeds}) ❌`);
        // Don't exit 1 yet, let's see output
    }
}

test()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
