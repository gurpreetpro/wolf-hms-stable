// Script to create demo invoice items for detailed billing breakdown
const pool = require('./config/db');

async function createDemoInvoiceItems() {
    try {
        console.log('Creating detailed invoice items...\n');

        // Get existing invoices
        const invoices = await pool.query('SELECT id, total_amount, patient_id FROM invoices ORDER BY id LIMIT 10');

        if (invoices.rows.length === 0) {
            console.log('No invoices found! Run create_demo_invoices.js first.');
            process.exit(1);
        }

        // Sample billing items by category
        const itemTemplates = {
            ward: [
                { desc: 'General Ward Bed Charges', unit_price: 1500 },
                { desc: 'Semi-Private Room', unit_price: 3000 },
                { desc: 'Private Room', unit_price: 5000 },
                { desc: 'ICU Bed Charges', unit_price: 8000 },
                { desc: 'Nursing Charges', unit_price: 500 },
            ],
            medicines: [
                { desc: 'Paracetamol 500mg', unit_price: 5 },
                { desc: 'Amoxicillin 500mg', unit_price: 12 },
                { desc: 'Omeprazole 20mg', unit_price: 8 },
                { desc: 'IV Saline 500ml', unit_price: 45 },
                { desc: 'Injection Ceftriaxone 1g', unit_price: 120 },
                { desc: 'Insulin Injection', unit_price: 350 },
            ],
            consumables: [
                { desc: 'Surgical Gloves (pair)', unit_price: 15 },
                { desc: 'IV Cannula', unit_price: 35 },
                { desc: 'Urinary Catheter', unit_price: 85 },
                { desc: 'Bandage Roll', unit_price: 25 },
                { desc: 'Cotton Pack 100g', unit_price: 40 },
                { desc: 'Syringe 5ml', unit_price: 8 },
            ],
            procedures: [
                { desc: 'Blood Test - CBC', unit_price: 350 },
                { desc: 'Blood Test - LFT', unit_price: 600 },
                { desc: 'Blood Test - KFT', unit_price: 550 },
                { desc: 'X-Ray Chest', unit_price: 450 },
                { desc: 'ECG', unit_price: 300 },
                { desc: 'Ultrasound Abdomen', unit_price: 1200 },
                { desc: 'CT Scan', unit_price: 4500 },
                { desc: 'MRI Scan', unit_price: 8000 },
            ],
            services: [
                { desc: 'OPD Consultation', unit_price: 500 },
                { desc: 'Specialist Consultation', unit_price: 1000 },
                { desc: 'Emergency Charges', unit_price: 2000 },
                { desc: 'Ventilator Support (per day)', unit_price: 3000 },
                { desc: 'Oxygen Therapy (per day)', unit_price: 800 },
                { desc: 'Physiotherapy Session', unit_price: 400 },
            ]
        };

        // Clear existing invoice items
        await pool.query('DELETE FROM invoice_items');
        console.log('Cleared existing invoice items.\n');

        // Create items for each invoice
        for (const invoice of invoices.rows) {
            const targetAmount = parseFloat(invoice.total_amount);
            let currentTotal = 0;
            const items = [];

            // Add ward/room charge (30-40% of total)
            const wardItem = itemTemplates.ward[Math.floor(Math.random() * itemTemplates.ward.length)];
            const wardDays = Math.ceil(targetAmount * 0.35 / wardItem.unit_price);
            if (wardDays > 0) {
                items.push({ desc: wardItem.desc, qty: wardDays, price: wardItem.unit_price });
                currentTotal += wardDays * wardItem.unit_price;
            }

            // Add medicines (15-20% of total)
            const medicineCount = Math.floor(Math.random() * 3) + 2;
            for (let i = 0; i < medicineCount && currentTotal < targetAmount * 0.8; i++) {
                const med = itemTemplates.medicines[Math.floor(Math.random() * itemTemplates.medicines.length)];
                const qty = Math.floor(Math.random() * 20) + 5;
                items.push({ desc: med.desc, qty, price: med.unit_price });
                currentTotal += qty * med.unit_price;
            }

            // Add consumables (5-10% of total)
            const consumableCount = Math.floor(Math.random() * 2) + 1;
            for (let i = 0; i < consumableCount && currentTotal < targetAmount * 0.85; i++) {
                const cons = itemTemplates.consumables[Math.floor(Math.random() * itemTemplates.consumables.length)];
                const qty = Math.floor(Math.random() * 5) + 1;
                items.push({ desc: cons.desc, qty, price: cons.unit_price });
                currentTotal += qty * cons.unit_price;
            }

            // Add procedures/tests (10-15% of total)
            const procedureCount = Math.floor(Math.random() * 2) + 1;
            for (let i = 0; i < procedureCount && currentTotal < targetAmount * 0.95; i++) {
                const proc = itemTemplates.procedures[Math.floor(Math.random() * itemTemplates.procedures.length)];
                items.push({ desc: proc.desc, qty: 1, price: proc.unit_price });
                currentTotal += proc.unit_price;
            }

            // Add service to balance remaining amount
            const remaining = targetAmount - currentTotal;
            if (remaining > 100) {
                items.push({ desc: 'Hospital Service Charges', qty: 1, price: Math.round(remaining) });
            }

            // Insert items into database
            for (const item of items) {
                await pool.query(
                    `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [invoice.id, item.desc, item.qty, item.price, item.qty * item.price]
                );
            }

            console.log(`✓ Invoice #${invoice.id}: Added ${items.length} line items`);
        }

        // Show summary
        const itemCount = await pool.query('SELECT COUNT(*) FROM invoice_items');
        console.log('\n=====================================');
        console.log('✅ Invoice items created successfully!');
        console.log('=====================================');
        console.log(`Total line items: ${itemCount.rows[0].count}`);
        console.log('Categories included:');
        console.log('  - Ward/Room Charges');
        console.log('  - Medicines');
        console.log('  - Consumables');
        console.log('  - Procedures/Tests');
        console.log('  - Service Charges');
        console.log('=====================================');

        process.exit(0);
    } catch (err) {
        console.error('Error creating invoice items:', err);
        process.exit(1);
    }
}

createDemoInvoiceItems();
