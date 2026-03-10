require('dotenv').config();
const pool = require('./config/db');

// Kokila Hospital prices as provided by user
const kokilaPrices = [
    { name: 'HCV - RNA Quantitative', price: 6000 },
    { name: 'ESR', price: 100 },
    { name: 'RBS (Random Blood Sugar)', price: 100 },
    { name: 'BG (Blood Group)', price: 100 },
    { name: 'Semen Analysis', price: 200 },
    { name: 'U/R (Urine Routine)', price: 100 },
    { name: 'PCT', price: 2500 },
    { name: 'Feretin (Ferritin)', price: 400 },
    { name: 'Pus C/S', price: 500 },
    { name: 'Fluid Culture', price: 500 },
    { name: 'Blood C/S', price: 1000 },
    { name: 'RFT (Renal Function Test)', price: 400 },
    { name: 'Urea', price: 100 },
    { name: 'S. Crt (Serum Creatinine)', price: 100 },
    { name: 'Na+ (Sodium)', price: 100 },
    { name: 'FNAC', price: 800 },
    { name: 'LFT (Liver Function Test)', price: 400 },
    { name: 'OT (SGOT)', price: 80 },
    { name: 'PT (SGPT)', price: 80 },
    { name: 'Bilirubin', price: 100 },
    { name: 'Lipid Profile', price: 400 },
    { name: 'Cholestrol', price: 100 },
    { name: 'VDRL', price: 100 },
    { name: 'TFT (Thyroid Function Test)', price: 500 },
    { name: 'TSH', price: 300 },
    { name: 'LH', price: 800 },
    { name: 'FSH', price: 750 },
    { name: 'E2 (Estradiol)', price: 600 },
    { name: 'S. Prolactin', price: 700 },
    { name: 'Beta HCG', price: 500 },
    { name: 'S. Testosterone', price: 1200 },
    { name: 'Lipase', price: 400 },
    { name: 'Amylase', price: 400 },
    { name: 'CK-MB', price: 600 },
    { name: 'HBA1c', price: 400 },
    { name: 'Dengue', price: 1000 },
    { name: 'ALP', price: 80 },
    { name: 'IgE', price: 1000 },
    { name: 'Fluid Cytology', price: 500 },
    { name: 'Biochemistry', price: 500 },
    { name: 'S. ADA', price: 900 },
    { name: 'S. AFB', price: 400 },
    { name: 'CA-125', price: 1000 },
    { name: 'CA-19.9', price: 1000 },
    { name: 'Mantoux', price: 100 },
    { name: 'Electrolyte', price: 300 },
    { name: 'ABG', price: 1000 },
    { name: 'ESH', price: 500 },
    { name: 'Protein', price: 100 },
    { name: 'Albumin', price: 100 },
    { name: 'S. Ammonia', price: 1000 },
    { name: 'CB-NAAT', price: 2200 },
    { name: 'KOH Smear', price: 150 },
    { name: 'LL/CLPD Renal basic', price: 8000 },
    { name: 'CLL/CLPD Comprehensive', price: 13000 },
    { name: 'CSF Fluid', price: 500 },
    { name: 'Malignant Cytology', price: 500 },
    { name: 'TB Gold', price: 2500 },
    { name: 'Pap Smear', price: 800 },
    { name: 'APTT', price: 600 },
    { name: 'Widal Slide Method', price: 100 },
    { name: 'MP Card', price: 200 },
    { name: 'Gram Stain', price: 400 },
    { name: 'CBC', price: 150 },
    { name: 'Uric Acid', price: 100 },
    { name: 'Calcium', price: 200 },
    { name: 'RA Factor', price: 100 },
    { name: 'Quantitative RA', price: 400 },
    { name: 'PT/INR', price: 400 },
    { name: 'Vit-D', price: 1000 },
    { name: 'CRP', price: 400 },
    { name: 'PBF', price: 200 },
    { name: 'PSA', price: 600 },
    { name: 'AFP', price: 700 },
    { name: 'Iron Studies', price: 1500 },
    { name: 'Vit B12', price: 1000 },
    { name: 'Folic Acid', price: 1000 },
    { name: 'Urine C/S', price: 500 },
    { name: 'Stool R/E', price: 150 },
    { name: 'Occult Blood', price: 400 },
    { name: 'Stool Culture', price: 500 },
    { name: 'CEA', price: 700 },
    { name: 'Sputum C/S', price: 550 },
    { name: 'Retic Count', price: 150 }
];

// Alternate name mapping (when test might have different stored name)
const altNames = {
    'RBS (Random Blood Sugar)': ['Random Blood Sugar', 'RBS', 'Blood Sugar Random'],
    'BG (Blood Group)': ['Blood Group', 'Blood Grouping', 'BG'],
    'U/R (Urine Routine)': ['Urine Routine', 'Urine R/E', 'Urine Analysis'],
    'Feretin (Ferritin)': ['Ferritin', 'Serum Ferritin'],
    'S. Crt (Serum Creatinine)': ['Serum Creatinine', 'Creatinine'],
    'Na+ (Sodium)': ['Sodium', 'Serum Sodium', 'Na'],
    'OT (SGOT)': ['SGOT', 'AST', 'SGOT (AST)'],
    'PT (SGPT)': ['SGPT', 'ALT', 'SGPT (ALT)'],
    'TFT (Thyroid Function Test)': ['Thyroid Function Test', 'TFT', 'Thyroid Profile'],
    'E2 (Estradiol)': ['Estradiol', 'E2', 'Serum Estradiol'],
    'RFT (Renal Function Test)': ['Renal Function Test', 'RFT', 'KFT', 'Kidney Function Test'],
    'LFT (Liver Function Test)': ['Liver Function Test', 'LFT'],
    'Cholestrol': ['Cholesterol', 'Total Cholesterol'],
    'HBA1c': ['HbA1c', 'Glycated Hemoglobin'],
    'Vit-D': ['Vitamin D', 'Vit D', '25-OH Vitamin D'],
    'Vit B12': ['Vitamin B12', 'B12'],
    'Stool R/E': ['Stool Routine', 'Stool Examination']
};

async function run() {
    try {
        // First, find Kokila Hospital ID
        const hospitalRes = await pool.query(`SELECT id, name FROM hospitals WHERE name ILIKE '%kokila%' OR code = 'kokila'`);
        if (hospitalRes.rows.length === 0) {
            console.log('❌ Kokila hospital not found. Checking all hospitals...');
            const allHospitals = await pool.query('SELECT id, name, code FROM hospitals LIMIT 10');
            console.log('Available hospitals:', allHospitals.rows);
            process.exit(1);
        }
        const kokilaHospitalId = hospitalRes.rows[0].id;
        console.log(`✅ Found Kokila Hospital: ID=${kokilaHospitalId}, Name=${hospitalRes.rows[0].name}`);
        
        // Check lab_change_requests table schema
        const schemaRes = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'lab_change_requests'
            ORDER BY ordinal_position
        `);
        console.log('\n📋 lab_change_requests table columns:');
        schemaRes.rows.forEach(c => console.log(`   ${c.column_name}: ${c.data_type}`));
        
        // Check lab_test_types schema
        const testTypesSchema = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'lab_test_types'
            ORDER BY ordinal_position
        `);
        console.log('\n📋 lab_test_types table columns:');
        testTypesSchema.rows.forEach(c => console.log(`   ${c.column_name}: ${c.data_type}`));
        
        // Get current tests for Kokila Hospital
        const existingTests = await pool.query(`
            SELECT id, name, price, hospital_id 
            FROM lab_test_types 
            WHERE hospital_id = $1 OR hospital_id IS NULL
            ORDER BY name
        `, [kokilaHospitalId]);
        console.log(`\n📊 Found ${existingTests.rows.length} lab tests for Kokila Hospital`);
        
        // Update prices
        let updated = 0;
        let notFound = [];
        
        for (const priceItem of kokilaPrices) {
            // Try exact match first
            let test = existingTests.rows.find(t => 
                t.name.toLowerCase() === priceItem.name.toLowerCase()
            );
            
            // Try alternate names if not found
            if (!test && altNames[priceItem.name]) {
                for (const altName of altNames[priceItem.name]) {
                    test = existingTests.rows.find(t => 
                        t.name.toLowerCase() === altName.toLowerCase()
                    );
                    if (test) break;
                }
            }
            
            // Try partial match
            if (!test) {
                test = existingTests.rows.find(t => 
                    t.name.toLowerCase().includes(priceItem.name.toLowerCase()) ||
                    priceItem.name.toLowerCase().includes(t.name.toLowerCase())
                );
            }
            
            if (test) {
                const oldPrice = parseFloat(test.price) || 0;
                if (oldPrice !== priceItem.price) {
                    await pool.query(
                        'UPDATE lab_test_types SET price = $1 WHERE id = $2',
                        [priceItem.price, test.id]
                    );
                    console.log(`✅ Updated: ${test.name} | ₹${oldPrice} → ₹${priceItem.price}`);
                    updated++;
                } else {
                    console.log(`⏭️ Same price: ${test.name} = ₹${priceItem.price}`);
                }
            } else {
                notFound.push(priceItem.name);
            }
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`   ✅ Updated: ${updated} tests`);
        console.log(`   ❌ Not found: ${notFound.length} tests`);
        
        if (notFound.length > 0) {
            console.log('\n⚠️ Tests not found (may need to be added):');
            notFound.forEach(name => console.log(`   - ${name}`));
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
    process.exit(0);
}

run();
