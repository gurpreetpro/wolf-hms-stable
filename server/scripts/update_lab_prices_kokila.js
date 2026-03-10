const pool = require('../config/db');

const rawData = `HCV - RNA Quantitative,6000/-
ESR,100/-
RBS (Random Blood Sugar),100/-
BG (Blood Group),100/-
Semen Analysis,200/-
U/R (Urine Routine),100/-
PCT,2500/-
Feretin (Ferritin),400/-
Pus C/S,500/-
Fluid Culture,500/-
Blood C/S,1000/-
RFT (Renal Function Test),400/-
Urea,100/-
S. Crt (Serum Creatinine),100/-
Na+ (Sodium),100/-
FNAC,800/-
LFT (Liver Function Test),400/-
OT (SGOT),80/-
PT (SGPT),80/-
Bilirubin,100/-
Lipid Profile,400/-
Cholestrol,100/-
VDRL,100/-
TFT (Thyroid Function Test),500/-
TSH,300/-
LH,800/-
FSH,750/-
E2 (Estradiol),600/-
S. Prolactin,700/-
Beta HCG,500/-
S. Testosterone,1200/-
Lipase,400/-
Amylase,400/-
CK-MB,600/-
HBA1c,400/-
Dengue,1000/-
ALP,80/-
IgE,1000/-
Fluid Cytology,500/-
Biochemistry,500/-
S. ADA,900/-
S. AFB,400/-
CA-125,1000/-
CA-19.9,1000/-
Mantoux,100/-
Electrolyte,300/-
ABG,1000/-
ESH,500/-
Protein,100/-
Albumin,100/-
S. Ammonia,1000/-
CB-NAAT,2200/-
KOH Smear,150/-
LL/CLPD Renal basic,8000/-
CLL/CLPD Comprehensive,13000/-
CSF Fluid,500/-
Malignant Cytology,500/-
TB Gold,2500/-
Pap Smear,800/-
APTT,600/-
Widal Slide Method,100/-
MP Card,200/-
Gram Stain,400/-
CBC,150/-
Uric Acid,100/-
Calcium,200/-
RA Factor,100/-
Quantitative RA,400/-
PT/INR,400/-
Vit-D,1000/-
CRP,400/-
PBF,200/-
PSA,600/-
AFP,700/-
Iron Studies,1500/-
Vit B12,1000/-
Folic Acid,1000/-
Urine C/S,500/-
Stool R/E,150/-
Occult Blood,400/-
Stool Culture,500/-
CEA,700/-
Sputum C/S,550/-
Retic Count,150/-`;

async function update() {
    try {
        console.log('🔄 Updating Lab Prices for Kokila Hospital (ID: 1)...');
        const lines = rawData.split('\n').map(l => l.trim()).filter(l => l);

        let updated = 0;
        let inserted = 0;

        for (const line of lines) {
            // Split by last comma to handle "Name, with comma, Price" logic if any
            const lastCommaIdx = line.lastIndexOf(',');
            if (lastCommaIdx === -1) {
                console.log(`⚠️ skipping invalid line: ${line}`);
                continue;
            }

            const name = line.substring(0, lastCommaIdx).trim();
            let priceStr = line.substring(lastCommaIdx + 1).trim();

            // Clean price "6000/-" -> "6000"
            priceStr = priceStr.replace('/-', '').replace(',', ''); // remove /- and commas in price
            const price = parseFloat(priceStr);

            if (isNaN(price)) {
                console.log(`⚠️ Invalid price for ${name}: ${priceStr}`);
                continue;
            }

            // Upsert Logic
            // Check if exists
            const res = await pool.query("SELECT id, price FROM lab_test_types WHERE name ILIKE $1 AND hospital_id = 1", [name]);
            if (res.rows.length > 0) {
                // Update
                if (parseFloat(res.rows[0].price) !== price) {
                    await pool.query("UPDATE lab_test_types SET price = $1 WHERE id = $2", [price, res.rows[0].id]);
                    console.log(`✅ Updated ${name}: ${price}`);
                    updated++;
                } else {
                    // console.log(`.. ${name} already ${price}`);
                }
            } else {
                // Insert (Default Category 1 = General/Biochem? We'll assume 1 exists)
                // We should check if category 1 exists, else use any valid category logic
                // For now assuming category_id 1 is valid.
                await pool.query("INSERT INTO lab_test_types (name, price, category_id, hospital_id) VALUES ($1, $2, 1, 1)", [name, price]);
                console.log(`✅ Inserted ${name}: ${price}`);
                inserted++;
            }
        }
        console.log(`✨ Price Update Complete. Updated: ${updated}, Inserted: ${inserted}`);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        // pool.end(); // Don't close pool if used via API!
        if (require.main === module) pool.end();
    }
}

if (require.main === module) {
    update();
}

module.exports = { update };
