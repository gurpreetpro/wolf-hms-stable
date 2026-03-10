const pool = require('./config/db');

const medicines = [
    // Analgesics & Antipyretics
    { name: 'Paracetamol 100mg Paediatric Drops', price: 25.00, stock: 200, batch: 'PCM-P01' },
    { name: 'Paracetamol 125mg/5ml Syrup', price: 35.00, stock: 300, batch: 'PCM-S02' },
    { name: 'Paracetamol 500mg Tablet', price: 2.00, stock: 2000, batch: 'PCM-T03' },
    { name: 'Paracetamol 650mg Tablet (Dolo)', price: 3.50, stock: 1500, batch: 'DOLO-04' },
    { name: 'Paracetamol 1g/100ml IV Infusion', price: 250.00, stock: 100, batch: 'PCM-IV05' },

    { name: 'Ibuprofen 200mg Tablet', price: 2.50, stock: 500, batch: 'IBU-200' },
    { name: 'Ibuprofen 400mg Tablet', price: 4.00, stock: 1000, batch: 'IBU-400' },
    { name: 'Ibuprofen 100mg/5ml Suspension', price: 40.00, stock: 200, batch: 'IBU-S01' },

    { name: 'Diclofenac Sodium 50mg Tablet', price: 3.00, stock: 800, batch: 'DIC-50' },
    { name: 'Diclofenac 75mg Injection', price: 15.00, stock: 300, batch: 'DIC-INJ' },
    { name: 'Tramadol 50mg Capsule', price: 12.00, stock: 400, batch: 'TRA-50' },
    { name: 'Tramadol 100mg Injection', price: 45.00, stock: 100, batch: 'TRA-INJ' },

    // Antibiotics
    { name: 'Amoxicillin 250mg Capsule', price: 5.00, stock: 500, batch: 'AMX-250' },
    { name: 'Amoxicillin 500mg Capsule', price: 10.00, stock: 1000, batch: 'AMX-500' },
    { name: 'Amoxicillin 125mg/5ml Dry Syrup', price: 60.00, stock: 200, batch: 'AMX-S01' },

    { name: 'Azithromycin 250mg Tablet', price: 15.00, stock: 400, batch: 'AZI-250' },
    { name: 'Azithromycin 500mg Tablet', price: 25.00, stock: 600, batch: 'AZI-500' },
    { name: 'Azithromycin 200mg/5ml Suspension', price: 80.00, stock: 150, batch: 'AZI-S01' },

    { name: 'Ceftriaxone 250mg Injection', price: 35.00, stock: 100, batch: 'CEF-250' },
    { name: 'Ceftriaxone 500mg Injection', price: 55.00, stock: 100, batch: 'CEF-500' },
    { name: 'Ceftriaxone 1g Injection', price: 90.00, stock: 200, batch: 'CEF-1G' },

    { name: 'Ciprofloxacin 500mg Tablet', price: 10.00, stock: 600, batch: 'CIP-500' },
    { name: 'Metronidazole 400mg Tablet', price: 3.00, stock: 500, batch: 'MET-400' },
    { name: 'Metronidazole 100ml IV Infusion', price: 45.00, stock: 100, batch: 'MET-IV' },
    { name: 'Augmentin 625mg Tablet', price: 35.00, stock: 400, batch: 'AUG-625' },

    // Cardiac & Hypertension
    { name: 'Amlodipine 2.5mg Tablet', price: 3.00, stock: 400, batch: 'AML-2.5' },
    { name: 'Amlodipine 5mg Tablet', price: 5.00, stock: 800, batch: 'AML-5' },
    { name: 'Amlodipine 10mg Tablet', price: 8.00, stock: 400, batch: 'AML-10' },

    { name: 'Atorvastatin 10mg Tablet', price: 7.00, stock: 500, batch: 'ATO-10' },
    { name: 'Atorvastatin 20mg Tablet', price: 12.00, stock: 500, batch: 'ATO-20' },
    { name: 'Atorvastatin 40mg Tablet', price: 20.00, stock: 300, batch: 'ATO-40' },

    { name: 'Losartan 50mg Tablet', price: 6.00, stock: 500, batch: 'LOS-50' },
    { name: 'Telmisartan 40mg Tablet', price: 7.00, stock: 500, batch: 'TEL-40' },
    { name: 'Clopidogrel 75mg Tablet', price: 15.00, stock: 400, batch: 'CLO-75' },

    // Diabetes
    { name: 'Metformin 500mg Tablet', price: 3.00, stock: 1000, batch: 'MET-500' },
    { name: 'Metformin 850mg Tablet', price: 4.50, stock: 500, batch: 'MET-850' },
    { name: 'Metformin 1000mg SR Tablet', price: 5.50, stock: 800, batch: 'MET-1G' },

    { name: 'Glimepiride 1mg Tablet', price: 4.00, stock: 400, batch: 'GLI-1' },
    { name: 'Glimepiride 2mg Tablet', price: 7.00, stock: 400, batch: 'GLI-2' },
    { name: 'Insulin Human Mixtard 40IU Vial', price: 180.00, stock: 50, batch: 'INS-MIX' },

    // Acid/Gut
    { name: 'Pantoprazole 20mg Tablet', price: 5.00, stock: 500, batch: 'PAN-20' },
    { name: 'Pantoprazole 40mg Tablet', price: 8.00, stock: 1000, batch: 'PAN-40' },
    { name: 'Pantoprazole 40mg Injection', price: 45.00, stock: 200, batch: 'PAN-INJ' },

    { name: 'Ranitidine 150mg Tablet', price: 2.00, stock: 600, batch: 'RAN-150' },
    { name: 'Domperidone 10mg Tablet', price: 4.00, stock: 500, batch: 'DOM-10' },
    { name: 'Ondansetron 4mg Tablet', price: 6.00, stock: 400, batch: 'OND-4' },
    { name: 'Ondansetron 2mg/ml Injection', price: 25.00, stock: 100, batch: 'OND-INJ' },
    { name: 'ORS Sachet (Electral)', price: 22.00, stock: 1000, batch: 'ORS-01' },

    // Respiratory / Allergy
    { name: 'Cetirizine 10mg Tablet', price: 3.50, stock: 800, batch: 'CET-10' },
    { name: 'Levocetirizine 5mg Tablet', price: 5.00, stock: 600, batch: 'LEV-5' },
    { name: 'Salbutamol Inhaler (200 doses)', price: 150.00, stock: 50, batch: 'SAL-INH' },
    { name: 'Deriphyllin Tablet', price: 2.50, stock: 400, batch: 'DER-TAB' },

    // Emergency / Critical
    { name: 'Adrenaline 1mg/1ml Injection', price: 35.00, stock: 50, batch: 'ADR-1' },
    { name: 'Atropine 0.6mg/ml Injection', price: 25.00, stock: 50, batch: 'ATR-1' },
    { name: 'Furosemide 20mg/2ml Injection (Lasix)', price: 18.00, stock: 100, batch: 'FUR-INJ' },
    { name: 'Furosemide 40mg Tablet', price: 2.00, stock: 300, batch: 'FUR-TAB' },
    { name: 'Hydrocortisone 100mg Injection', price: 55.00, stock: 60, batch: 'HYD-100' },
    { name: 'Avil (Pheniramine) 2ml Injection', price: 15.00, stock: 100, batch: 'AVI-INJ' }
];

async function seedMedicines() {
    try {
        console.log('💊 Starting Exact Dosage Seeding...');
        let addedCount = 0;

        // Future expiry date (approx 2 years from now)
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 2);

        for (const med of medicines) {
            // Check if exact name exists to avoid duplicates
            const check = await pool.query('SELECT id FROM inventory_items WHERE name = $1', [med.name]);

            if (check.rows.length === 0) {
                await pool.query(
                    'INSERT INTO inventory_items (name, stock_quantity, price_per_unit, batch_number, expiry_date) VALUES ($1, $2, $3, $4, $5)',
                    [med.name, med.stock, med.price, med.batch, expiryDate]
                );
                process.stdout.write('+'); // Progress indicator
                addedCount++;
            } else {
                process.stdout.write('.'); // Skip indicator
            }
        }

        console.log(`\n\n✅ Seeding Complete! Added ${addedCount} new medicines.`);
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Seeding Failed:', err);
        process.exit(1);
    }
}

seedMedicines();
