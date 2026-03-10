/**
 * Sync Medicine Catalog to Cloud
 * Uses the inventory_items table (correct schema)
 * Sends via /api/sync/sql endpoint
 */

const CLOUD_URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app';
const SYNC_SECRET = 'WolfHMS_Migration_Secret_2026';

const medicines = [
    // Antibiotics
    { name: 'Augmentin 625 Duo', generic: 'Amoxicillin + Clavulanic Acid', category: 'Antibiotic', stock: 1000, price: 22.00 },
    { name: 'Azithral 500', generic: 'Azithromycin 500mg', category: 'Antibiotic', stock: 800, price: 25.00 },
    { name: 'Taxim-O 200', generic: 'Cefixime 200mg', category: 'Antibiotic', stock: 1200, price: 18.00 },
    { name: 'Ciplox 500', generic: 'Ciprofloxacin 500mg', category: 'Antibiotic', stock: 1000, price: 7.00 },
    { name: 'Flagyl 400', generic: 'Metronidazole 400mg', category: 'Antibiotic', stock: 1500, price: 4.00 },
    { name: 'Monocef 1g Inj', generic: 'Ceftriaxone 1g Injection', category: 'Antibiotic', stock: 500, price: 55.00 },
    { name: 'Clavam 625', generic: 'Amoxicillin + Clavulanic Acid', category: 'Antibiotic', stock: 1000, price: 20.00 },
    { name: 'Oflox 200', generic: 'Ofloxacin 200mg', category: 'Antibiotic', stock: 800, price: 9.00 },
    
    // Pain & Fever
    { name: 'Dolo 650', generic: 'Paracetamol 650mg', category: 'Analgesic', stock: 5000, price: 2.50 },
    { name: 'Calpol 650', generic: 'Paracetamol 650mg', category: 'Analgesic', stock: 3000, price: 2.00 },
    { name: 'Zerodol-P', generic: 'Aceclofenac + Paracetamol', category: 'Analgesic', stock: 2000, price: 6.00 },
    { name: 'Zerodol-SP', generic: 'Aceclofenac + Paracetamol + Serratiopeptidase', category: 'Analgesic', stock: 1500, price: 10.00 },
    { name: 'Combiflam', generic: 'Ibuprofen + Paracetamol', category: 'Analgesic', stock: 2000, price: 4.00 },
    { name: 'Voveran Inj', generic: 'Diclofenac Sodium 75mg/ml', category: 'Analgesic', stock: 600, price: 22.00 },
    { name: 'Ultracet', generic: 'Tramadol + Paracetamol', category: 'Analgesic', stock: 500, price: 15.00 },
    { name: 'Meftal-Spas', generic: 'Mefenamic Acid + Dicyclomine', category: 'Antispasmodic', stock: 1000, price: 5.00 },
    
    // Gastrointestinal
    { name: 'Pan 40', generic: 'Pantoprazole 40mg', category: 'Antacid/PPI', stock: 3000, price: 9.00 },
    { name: 'Pan-D', generic: 'Pantoprazole + Domperidone', category: 'Antacid/PPI', stock: 2500, price: 12.00 },
    { name: 'Rantac 150', generic: 'Ranitidine 150mg', category: 'Antacid', stock: 2000, price: 2.00 },
    { name: 'Emeset 4mg', generic: 'Ondansetron 4mg', category: 'Anti-emetic', stock: 1500, price: 6.00 },
    { name: 'Emeset Inj', generic: 'Ondansetron 2ml Injection', category: 'Anti-emetic', stock: 500, price: 15.00 },
    { name: 'Sucrafil Syrup', generic: 'Sucralfate Suspension', category: 'Antacid', stock: 200, price: 180.00 },
    { name: 'Duphalac Syrup', generic: 'Lactulose Solution', category: 'Laxative', stock: 150, price: 250.00 },
    { name: 'Gelusil MPS', generic: 'Antacid Gel', category: 'Antacid', stock: 300, price: 110.00 },
    
    // Cardiac & Hypertension
    { name: 'Amlong 5', generic: 'Amlodipine 5mg', category: 'Antihypertensive', stock: 2000, price: 4.00 },
    { name: 'Telma 40', generic: 'Telmisartan 40mg', category: 'Antihypertensive', stock: 2000, price: 8.00 },
    { name: 'Telma-H', generic: 'Telmisartan + HCTZ', category: 'Antihypertensive', stock: 1500, price: 12.00 },
    { name: 'Atorva 10', generic: 'Atorvastatin 10mg', category: 'Statin', stock: 1500, price: 10.00 },
    { name: 'Rosuvas 10', generic: 'Rosuvastatin 10mg', category: 'Statin', stock: 1000, price: 15.00 },
    { name: 'Ecosprin 75', generic: 'Aspirin 75mg', category: 'Antiplatelet', stock: 2000, price: 0.50 },
    { name: 'Clopilet 75', generic: 'Clopidogrel 75mg', category: 'Antiplatelet', stock: 1000, price: 6.00 },
    
    // Diabetes
    { name: 'Glycomet 500', generic: 'Metformin 500mg', category: 'Antidiabetic', stock: 3000, price: 3.00 },
    { name: 'Glycomet-GP 1', generic: 'Glimepiride + Metformin', category: 'Antidiabetic', stock: 2000, price: 7.00 },
    { name: 'Janumet 50/500', generic: 'Sitagliptin + Metformin', category: 'Antidiabetic', stock: 800, price: 25.00 },
    { name: 'Human Mixtard 30/70', generic: 'Biphasic Insulin', category: 'Insulin', stock: 100, price: 350.00 },
    { name: 'Lantus', generic: 'Insulin Glargine', category: 'Insulin', stock: 50, price: 650.00 },
    
    // Respiratory & Allergy
    { name: 'Montair-LC', generic: 'Montelukast + Levocetirizine', category: 'Antiallergic', stock: 1500, price: 14.00 },
    { name: 'Cetzine', generic: 'Cetirizine 10mg', category: 'Antihistamine', stock: 2000, price: 3.00 },
    { name: 'Allegra 120', generic: 'Fexofenadine 120mg', category: 'Antihistamine', stock: 800, price: 18.00 },
    { name: 'Asthalin Inhaler', generic: 'Salbutamol 100mcg', category: 'Bronchodilator', stock: 200, price: 150.00 },
    { name: 'Budecort Respules', generic: 'Budesonide', category: 'Steroid', stock: 300, price: 25.00 },
    { name: 'Duolin Respules', generic: 'Levosalbutamol + Ipratropium', category: 'Bronchodilator', stock: 300, price: 30.00 },
    { name: 'Deriphyllin Retard 150', generic: 'Etofylline + Theophylline', category: 'Bronchodilator', stock: 1000, price: 3.00 },
    { name: 'Ascoril-D Syrup', generic: 'Dextromethorphan + Chlorpheniramine', category: 'Cough Syrup', stock: 300, price: 110.00 },
    
    // Vitamins & Supplements
    { name: 'Shelcal 500', generic: 'Calcium + Vitamin D3', category: 'Supplement', stock: 2000, price: 6.00 },
    { name: 'Neurobion Forte', generic: 'Vitamin B Complex + B12', category: 'Supplement', stock: 2000, price: 2.00 },
    { name: 'Limcee', generic: 'Vitamin C 500mg', category: 'Supplement', stock: 1500, price: 1.50 },
    { name: 'Orofer XT', generic: 'Iron + Folic Acid', category: 'Iron Supplement', stock: 1200, price: 12.00 },
    { name: 'Becosules', generic: 'B-Complex + Vitamin C', category: 'Supplement', stock: 2000, price: 2.50 },
    { name: 'Evion 400', generic: 'Vitamin E 400mg', category: 'Supplement', stock: 1000, price: 4.00 },
    
    // Emergency & ICU
    { name: 'Adrenaline Inj', generic: 'Adrenaline 1mg/ml', category: 'Emergency', stock: 200, price: 10.00 },
    { name: 'Atropine Inj', generic: 'Atropine Sulphate 0.6mg', category: 'Emergency', stock: 200, price: 8.00 },
    { name: 'Lasix Inj', generic: 'Furosemide 20mg', category: 'Diuretic', stock: 300, price: 12.00 },
    { name: 'Avil Inj', generic: 'Pheniramine Maleate', category: 'Antiallergic', stock: 300, price: 6.00 },
    { name: 'Hydrocort Inj', generic: 'Hydrocortisone 100mg', category: 'Steroid', stock: 200, price: 45.00 },
    { name: 'Dexamethasone Inj', generic: 'Dexamethasone 4mg', category: 'Steroid', stock: 300, price: 10.00 },
    { name: 'Norad Inj', generic: 'Noradrenaline', category: 'Vasopressor', stock: 100, price: 80.00 },
    { name: 'Pantodac Inj', generic: 'Pantoprazole 40mg IV', category: 'Antacid/PPI', stock: 400, price: 45.00 },
    
    // Dermatological
    { name: 'Betadine Ointment', generic: 'Povidone Iodine 5%', category: 'Antiseptic', stock: 200, price: 60.00 },
    { name: 'Silverex Cream', generic: 'Silver Sulfadiazine', category: 'Burn Cream', stock: 100, price: 110.00 },
    { name: 'Candid-B Cream', generic: 'Clotrimazole + Beclomethasone', category: 'Antifungal', stock: 150, price: 85.00 },
    
    // IV Fluids
    { name: 'NS 500ml', generic: 'Normal Saline 0.9%', category: 'IV Fluid', stock: 500, price: 35.00 },
    { name: 'RL 500ml', generic: 'Ringer Lactate', category: 'IV Fluid', stock: 500, price: 40.00 },
    { name: 'DNS 500ml', generic: 'Dextrose Normal Saline', category: 'IV Fluid', stock: 400, price: 42.00 },
    { name: 'D5 500ml', generic: 'Dextrose 5%', category: 'IV Fluid', stock: 200, price: 38.00 }
];

async function syncMedicines() {
    console.log('💊 SYNCING MEDICINE CATALOG TO CLOUD\n');
    console.log(`Total medicines to sync: ${medicines.length}\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Calculate expiry date (2 years from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 2);
    const expiryStr = expiryDate.toISOString().split('T')[0];
    
    for (const med of medicines) {
        const batch = med.name.substring(0, 3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
        
        // Build INSERT SQL for inventory_items table
        const sql = `
            INSERT INTO inventory_items (name, generic_name, category, batch_number, expiry_date, stock_quantity, price_per_unit, hospital_id, reorder_level)
            VALUES ('${med.name.replace(/'/g, "''")}', '${med.generic.replace(/'/g, "''")}', '${med.category}', '${batch}', '${expiryStr}', ${med.stock}, ${med.price}, 1, ${Math.floor(med.stock * 0.1)})
            ON CONFLICT (name, hospital_id) DO NOTHING
        `;
        
        try {
            const response = await fetch(`${CLOUD_URL}/api/sync/sql`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret: SYNC_SECRET, sql })
            });
            
            const result = await response.json();
            
            if (result.success) {
                process.stdout.write('✓');
                successCount++;
            } else {
                process.stdout.write('✗');
                errorCount++;
                console.log(`\n  Error for ${med.name}: ${result.message}`);
            }
        } catch (err) {
            process.stdout.write('✗');
            errorCount++;
            console.log(`\n  Network error for ${med.name}: ${err.message}`);
        }
    }
    
    console.log('\n\n=== SYNC COMPLETE ===');
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    // Verify count
    console.log('\n📊 Verifying cloud inventory count...');
    try {
        const countResponse = await fetch(`${CLOUD_URL}/api/sync/sql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                secret: SYNC_SECRET, 
                sql: 'SELECT COUNT(*) as total FROM inventory_items'
            })
        });
        const countResult = await countResponse.json();
        if (countResult.success) {
            console.log(`   Total items in cloud: ${countResult.rows[0].total}`);
        }
    } catch (e) {
        console.log('   Could not verify count');
    }
}

syncMedicines();
