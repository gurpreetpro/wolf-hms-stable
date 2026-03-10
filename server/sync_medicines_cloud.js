/**
 * Sync Medicine Catalog to Cloud Database
 * Runs the Indian medicines seed against the cloud database
 */

require('dotenv').config();

// Create a pool specifically for cloud database
const { Pool } = require('pg');

// Cloud database connection (from .env or hardcoded)
const cloudPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ukd6zDVFIj9O@ep-twilight-smoke-a1l2nf9f-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

const medicines = [
    // Antibiotics
    { name: 'Augmentin 625 Duo', generic: 'Amoxicillin 500mg + Clavulanic Acid 125mg', category: 'Antibiotic', stock: 1000, price: 22.00, minLevel: 100 },
    { name: 'Azithral 500', generic: 'Azithromycin 500mg', category: 'Antibiotic', stock: 800, price: 25.00, minLevel: 50 },
    { name: 'Taxim-O 200', generic: 'Cefixime 200mg', category: 'Antibiotic', stock: 1200, price: 18.00, minLevel: 100 },
    { name: 'Ciplox 500', generic: 'Ciprofloxacin 500mg', category: 'Antibiotic', stock: 1000, price: 7.00, minLevel: 100 },
    { name: 'Flagyl 400', generic: 'Metronidazole 400mg', category: 'Antibiotic', stock: 1500, price: 4.00, minLevel: 100 },
    { name: 'Monocef 1g Inj', generic: 'Ceftriaxone 1g Injection', category: 'Antibiotic', stock: 500, price: 55.00, minLevel: 50 },
    { name: 'Pipzo 4.5g Inj', generic: 'Piperacillin 4g + Tazobactam 0.5g', category: 'Antibiotic', stock: 200, price: 350.00, minLevel: 20 },
    { name: 'Clavam 625', generic: 'Amoxicillin + Clavulanic Acid', category: 'Antibiotic', stock: 1000, price: 20.00, minLevel: 100 },
    { name: 'Oflox 200', generic: 'Ofloxacin 200mg', category: 'Antibiotic', stock: 800, price: 9.00, minLevel: 80 },
    
    // Pain, Fever, Inflammation
    { name: 'Dolo 650', generic: 'Paracetamol 650mg', category: 'Analgesic/Antipyretic', stock: 5000, price: 2.50, minLevel: 500 },
    { name: 'Calpol 650', generic: 'Paracetamol 650mg', category: 'Analgesic/Antipyretic', stock: 3000, price: 2.00, minLevel: 300 },
    { name: 'Zerodol-P', generic: 'Aceclofenac 100mg + Paracetamol 325mg', category: 'Analgesic', stock: 2000, price: 6.00, minLevel: 200 },
    { name: 'Zerodol-SP', generic: 'Aceclofenac + Paracetamol + Serratiopeptidase', category: 'Analgesic', stock: 1500, price: 10.00, minLevel: 150 },
    { name: 'Combiflam', generic: 'Ibuprofen 400mg + Paracetamol 325mg', category: 'Analgesic', stock: 2000, price: 4.00, minLevel: 200 },
    { name: 'Voveran Inj', generic: 'Diclofenac Sodium 75mg/ml', category: 'Analgesic', stock: 600, price: 22.00, minLevel: 50 },
    { name: 'Ultracet', generic: 'Tramadol 37.5mg + Paracetamol 325mg', category: 'Analgesic', stock: 500, price: 15.00, minLevel: 40 },
    { name: 'Meftal-Spas', generic: 'Mefenamic Acid + Dicyclomine', category: 'Antispasmodic', stock: 1000, price: 5.00, minLevel: 100 },
    
    // Gastrointestinal
    { name: 'Pan 40', generic: 'Pantoprazole 40mg', category: 'Antacid/PPI', stock: 3000, price: 9.00, minLevel: 300 },
    { name: 'Pan-D', generic: 'Pantoprazole 40mg + Domperidone 30mg', category: 'Antacid/PPI', stock: 2500, price: 12.00, minLevel: 200 },
    { name: 'Rantac 150', generic: 'Ranitidine 150mg', category: 'Antacid/H2 Blocker', stock: 2000, price: 2.00, minLevel: 200 },
    { name: 'Emeset 4mg', generic: 'Ondansetron 4mg', category: 'Anti-emetic', stock: 1500, price: 6.00, minLevel: 150 },
    { name: 'Emeset Inj', generic: 'Ondansetron 2ml Injection', category: 'Anti-emetic', stock: 500, price: 15.00, minLevel: 50 },
    { name: 'Sucrafil Syrup', generic: 'Sucralfate Suspension', category: 'Antacid', stock: 200, price: 180.00, minLevel: 20 },
    { name: 'Duphalac Syrup', generic: 'Lactulose Solution', category: 'Laxative', stock: 150, price: 250.00, minLevel: 15 },
    { name: 'Gelusil MPS', generic: 'Antacid Gel', category: 'Antacid', stock: 300, price: 110.00, minLevel: 30 },
    
    // Cardiac & Hypertension
    { name: 'Amlong 5', generic: 'Amlodipine 5mg', category: 'Antihypertensive', stock: 2000, price: 4.00, minLevel: 200 },
    { name: 'Telma 40', generic: 'Telmisartan 40mg', category: 'Antihypertensive', stock: 2000, price: 8.00, minLevel: 200 },
    { name: 'Telma-H', generic: 'Telmisartan 40mg + Hydrochlorothiazide 12.5mg', category: 'Antihypertensive', stock: 1500, price: 12.00, minLevel: 150 },
    { name: 'Atorva 10', generic: 'Atorvastatin 10mg', category: 'Statin', stock: 1500, price: 10.00, minLevel: 150 },
    { name: 'Rosuvas 10', generic: 'Rosuvastatin 10mg', category: 'Statin', stock: 1000, price: 15.00, minLevel: 100 },
    { name: 'Ecosprin 75', generic: 'Aspirin 75mg', category: 'Antiplatelet', stock: 2000, price: 0.50, minLevel: 200 },
    { name: 'Clopilet 75', generic: 'Clopidogrel 75mg', category: 'Antiplatelet', stock: 1000, price: 6.00, minLevel: 100 },
    
    // Diabetes
    { name: 'Glycomet 500', generic: 'Metformin 500mg', category: 'Antidiabetic', stock: 3000, price: 3.00, minLevel: 300 },
    { name: 'Glycomet-GP 1', generic: 'Glimepiride 1mg + Metformin 500mg', category: 'Antidiabetic', stock: 2000, price: 7.00, minLevel: 200 },
    { name: 'Janumet 50/500', generic: 'Sitagliptin 50mg + Metformin 500mg', category: 'Antidiabetic', stock: 800, price: 25.00, minLevel: 80 },
    { name: 'Human Mixtard 30/70', generic: 'Biphasic Isophane Insulin', category: 'Insulin', stock: 100, price: 350.00, minLevel: 10 },
    { name: 'Lantus', generic: 'Insulin Glargine', category: 'Insulin', stock: 50, price: 650.00, minLevel: 5 },
    
    // Respiratory & Allergy
    { name: 'Montair-LC', generic: 'Montelukast 10mg + Levocetirizine 5mg', category: 'Antiallergic', stock: 1500, price: 14.00, minLevel: 150 },
    { name: 'Cetzine', generic: 'Cetirizine 10mg', category: 'Antihistamine', stock: 2000, price: 3.00, minLevel: 200 },
    { name: 'Allegra 120', generic: 'Fexofenadine 120mg', category: 'Antihistamine', stock: 800, price: 18.00, minLevel: 80 },
    { name: 'Asthalin Inhaler', generic: 'Salbutamol 100mcg', category: 'Bronchodilator', stock: 200, price: 150.00, minLevel: 20 },
    { name: 'Budecort Respules', generic: 'Budesonide', category: 'Steroid', stock: 300, price: 25.00, minLevel: 30 },
    { name: 'Duolin Respules', generic: 'Levosalbutamol + Ipratropium', category: 'Bronchodilator', stock: 300, price: 30.00, minLevel: 30 },
    { name: 'Deriphyllin Retard 150', generic: 'Etofylline + Theophylline', category: 'Bronchodilator', stock: 1000, price: 3.00, minLevel: 100 },
    { name: 'Ascoril-D Syrup', generic: 'Dextromethorphan + Chlorpheniramine', category: 'Cough Syrup', stock: 300, price: 110.00, minLevel: 30 },
    { name: 'Grilinctus Syrup', generic: 'Dextromethorphan + Guaifenesin', category: 'Cough Syrup', stock: 300, price: 120.00, minLevel: 30 },
    
    // Vitamins & Supplements
    { name: 'Shelcal 500', generic: 'Calcium 500mg + Vitamin D3 250IU', category: 'Supplement', stock: 2000, price: 6.00, minLevel: 200 },
    { name: 'Neurobion Forte', generic: 'Vitamin B Complex + B12', category: 'Supplement', stock: 2000, price: 2.00, minLevel: 200 },
    { name: 'Limcee', generic: 'Vitamin C 500mg (Chewable)', category: 'Supplement', stock: 1500, price: 1.50, minLevel: 150 },
    { name: 'Orofer XT', generic: 'Ferrous Ascorbate + Folic Acid', category: 'Iron Supplement', stock: 1200, price: 12.00, minLevel: 120 },
    { name: 'Becosules', generic: 'B-Complex + Vitamin C', category: 'Supplement', stock: 2000, price: 2.50, minLevel: 200 },
    { name: 'Evion 400', generic: 'Vitamin E 400mg', category: 'Supplement', stock: 1000, price: 4.00, minLevel: 100 },
    
    // Emergency & ICU
    { name: 'Adrenaline Inj', generic: 'Adrenaline 1mg/ml', category: 'Emergency', stock: 200, price: 10.00, minLevel: 20 },
    { name: 'Atropine Inj', generic: 'Atropine Sulphate 0.6mg', category: 'Emergency', stock: 200, price: 8.00, minLevel: 20 },
    { name: 'Lasix Inj', generic: 'Furosemide 20mg', category: 'Diuretic', stock: 300, price: 12.00, minLevel: 30 },
    { name: 'Avil Inj', generic: 'Pheniramine Maleate', category: 'Antiallergic', stock: 300, price: 6.00, minLevel: 30 },
    { name: 'Hydrocort Inj', generic: 'Hydrocortisone 100mg', category: 'Steroid', stock: 200, price: 45.00, minLevel: 20 },
    { name: 'Dexamethasone Inj', generic: 'Dexamethasone 4mg', category: 'Steroid', stock: 300, price: 10.00, minLevel: 30 },
    { name: 'Norad Inj', generic: 'Noradrenaline', category: 'Vasopressor', stock: 100, price: 80.00, minLevel: 10 },
    { name: 'Pantodac Inj', generic: 'Pantoprazole 40mg IV', category: 'Antacid/PPI', stock: 400, price: 45.00, minLevel: 40 },
    
    // Dermatological
    { name: 'Betadine Ointment', generic: 'Povidone Iodine 5%', category: 'Antiseptic', stock: 200, price: 60.00, minLevel: 20 },
    { name: 'Silverex Cream', generic: 'Silver Sulfadiazine', category: 'Burn Cream', stock: 100, price: 110.00, minLevel: 10 },
    { name: 'Candid-B Cream', generic: 'Clotrimazole + Beclomethasone', category: 'Antifungal', stock: 150, price: 85.00, minLevel: 15 },
    
    // IV Fluids
    { name: 'NS 500ml', generic: 'Normal Saline 0.9%', category: 'IV Fluid', stock: 500, price: 35.00, minLevel: 50 },
    { name: 'RL 500ml', generic: 'Ringer Lactate', category: 'IV Fluid', stock: 500, price: 40.00, minLevel: 50 },
    { name: 'DNS 500ml', generic: 'Dextrose Normal Saline', category: 'IV Fluid', stock: 400, price: 42.00, minLevel: 40 },
    { name: 'D5 500ml', generic: 'Dextrose 5%', category: 'IV Fluid', stock: 200, price: 38.00, minLevel: 20 }
];

async function seedMedicines() {
    console.log('💊 Syncing Medicine Catalog to Cloud Database...\n');
    
    try {
        // Check connection
        await cloudPool.query('SELECT NOW()');
        console.log('✅ Connected to cloud database\n');

        // Check if inventory table exists
        const tableCheck = await cloudPool.query(`
            SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory')
        `);
        
        if (!tableCheck.rows[0].exists) {
            console.log('⚠️ inventory table not found. Creating...');
            await cloudPool.query(`
                CREATE TABLE IF NOT EXISTS inventory (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    generic_name VARCHAR(255),
                    batch_number VARCHAR(100),
                    stock_quantity INTEGER DEFAULT 0,
                    unit_price DECIMAL(10,2),
                    expiry_date DATE,
                    min_level INTEGER DEFAULT 10,
                    hospital_id INTEGER DEFAULT 1,
                    supplier VARCHAR(255) DEFAULT 'Global Pharma',
                    category VARCHAR(100),
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            console.log('✅ inventory table created\n');
        }

        // Check current count
        const existingCount = await cloudPool.query('SELECT COUNT(*) FROM inventory');
        console.log(`📊 Current inventory items: ${existingCount.rows[0].count}\n`);

        let addedCount = 0;
        let skippedCount = 0;
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 2);

        for (const med of medicines) {
            // Check if exists
            const check = await cloudPool.query(
                'SELECT id FROM inventory WHERE name = $1 AND hospital_id = 1', 
                [med.name]
            );

            if (check.rows.length === 0) {
                const batchNumber = med.name.substring(0,3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
                
                await cloudPool.query(`
                    INSERT INTO inventory (name, generic_name, batch_number, stock_quantity, unit_price, expiry_date, min_level, hospital_id, supplier, category)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 'Global Pharma Distributors', $8)
                `, [med.name, med.generic, batchNumber, med.stock, med.price, expiryDate, med.minLevel, med.category]);
                
                process.stdout.write('+');
                addedCount++;
            } else {
                process.stdout.write('.');
                skippedCount++;
            }
        }

        console.log(`\n\n✅ Medicine Catalog Sync Complete!`);
        console.log(`   ➕ Added: ${addedCount}`);
        console.log(`   ⏭️ Skipped (already exists): ${skippedCount}`);
        
        // Verify final count
        const finalCount = await cloudPool.query('SELECT COUNT(*) FROM inventory');
        console.log(`\n📊 Total inventory items now: ${finalCount.rows[0].count}`);

    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err.stack);
    } finally {
        await cloudPool.end();
    }
}

seedMedicines();
