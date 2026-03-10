-- Migration 202: Seed Comprehensive Indian Medicines (NLEM based)
DO $$
DECLARE h_id INT := 1;
-- Default to Kokila Hospital
BEGIN -- Helper temp table for insertions
CREATE TEMPORARY TABLE IF NOT EXISTS temp_meds (
    name VARCHAR(255),
    generic_name VARCHAR(255),
    category VARCHAR(100),
    stock INT,
    price DECIMAL(10, 2),
    min_lvl INT
);
-- Clear temp table just in case
DELETE FROM temp_meds;
-- Insert data into temp table
INSERT INTO temp_meds (
        name,
        generic_name,
        category,
        stock,
        price,
        min_lvl
    )
VALUES -- Antibiotics
    (
        'Augmentin 625 Duo',
        'Amoxicillin 500mg + Clavulanic Acid 125mg',
        'Antibiotic',
        1000,
        22.00,
        100
    ),
    (
        'Azithral 500',
        'Azithromycin 500mg',
        'Antibiotic',
        800,
        25.00,
        50
    ),
    (
        'Taxim-O 200',
        'Cefixime 200mg',
        'Antibiotic',
        1200,
        18.00,
        100
    ),
    (
        'Ciplox 500',
        'Ciprofloxacin 500mg',
        'Antibiotic',
        1000,
        7.00,
        100
    ),
    (
        'Flagyl 400',
        'Metronidazole 400mg',
        'Antibiotic',
        1500,
        4.00,
        100
    ),
    (
        'Monocef 1g Inj',
        'Ceftriaxone 1g Injection',
        'Antibiotic',
        500,
        55.00,
        50
    ),
    (
        'Pipzo 4.5g Inj',
        'Piperacillin 4g + Tazobactam 0.5g',
        'Antibiotic',
        200,
        350.00,
        20
    ),
    (
        'Clavam 625',
        'Amoxicillin + Clavulanic Acid',
        'Antibiotic',
        1000,
        20.00,
        100
    ),
    (
        'Oflox 200',
        'Ofloxacin 200mg',
        'Antibiotic',
        800,
        9.00,
        80
    ),
    -- Pain, Fever, Inflammation
    (
        'Dolo 650',
        'Paracetamol 650mg',
        'Analgesic/Antipyretic',
        5000,
        2.50,
        500
    ),
    (
        'Calpol 650',
        'Paracetamol 650mg',
        'Analgesic/Antipyretic',
        3000,
        2.00,
        300
    ),
    (
        'Zerodol-P',
        'Aceclofenac 100mg + Paracetamol 325mg',
        'Analgesic',
        2000,
        6.00,
        200
    ),
    (
        'Zerodol-SP',
        'Aceclofenac + Paracetamol + Serratiopeptidase',
        'Analgesic',
        1500,
        10.00,
        150
    ),
    (
        'Combiflam',
        'Ibuprofen 400mg + Paracetamol 325mg',
        'Analgesic',
        2000,
        4.00,
        200
    ),
    (
        'Voveran Inj',
        'Diclofenac Sodium 75mg/ml',
        'Analgesic',
        600,
        22.00,
        50
    ),
    (
        'Ultracet',
        'Tramadol 37.5mg + Paracetamol 325mg',
        'Analgesic',
        500,
        15.00,
        40
    ),
    (
        'Meftal-Spas',
        'Mefenamic Acid + Dicyclomine',
        'Antispasmodic',
        1000,
        5.00,
        100
    ),
    -- Gastrointestinal
    (
        'Pan 40',
        'Pantoprazole 40mg',
        'Antacid/PPI',
        3000,
        9.00,
        300
    ),
    (
        'Pan-D',
        'Pantoprazole 40mg + Domperidone 30mg',
        'Antacid/PPI',
        2500,
        12.00,
        200
    ),
    (
        'Rantac 150',
        'Ranitidine 150mg',
        'Antacid/H2 Blocker',
        2000,
        2.00,
        200
    ),
    (
        'Emeset 4mg',
        'Ondansetron 4mg',
        'Anti-emetic',
        1500,
        6.00,
        150
    ),
    (
        'Emeset Inj',
        'Ondansetron 2ml Injection',
        'Anti-emetic',
        500,
        15.00,
        50
    ),
    (
        'Sucrafil Syrup',
        'Sucralfate Suspension',
        'Antacid',
        200,
        180.00,
        20
    ),
    (
        'Duphalac Syrup',
        'Lactulose Solution',
        'Laxative',
        150,
        250.00,
        15
    ),
    (
        'Gelusil MPS',
        'Antacid Gel',
        'Antacid',
        300,
        110.00,
        30
    ),
    -- Cardiac & Hypertension
    (
        'Amlong 5',
        'Amlodipine 5mg',
        'Antihypertensive',
        2000,
        4.00,
        200
    ),
    (
        'Telma 40',
        'Telmisartan 40mg',
        'Antihypertensive',
        2000,
        8.00,
        200
    ),
    (
        'Telma-H',
        'Telmisartan 40mg + Hydrochlorothiazide 12.5mg',
        'Antihypertensive',
        1500,
        12.00,
        150
    ),
    (
        'Atorva 10',
        'Atorvastatin 10mg',
        'Statin',
        1500,
        10.00,
        150
    ),
    (
        'Rosuvas 10',
        'Rosuvastatin 10mg',
        'Statin',
        1000,
        15.00,
        100
    ),
    (
        'Ecosprin 75',
        'Aspirin 75mg',
        'Antiplatelet',
        2000,
        0.50,
        200
    ),
    (
        'Clopilet 75',
        'Clopidogrel 75mg',
        'Antiplatelet',
        1000,
        6.00,
        100
    ),
    -- Diabetes
    (
        'Glycomet 500',
        'Metformin 500mg',
        'Antidiabetic',
        3000,
        3.00,
        300
    ),
    (
        'Glycomet-GP 1',
        'Glimepiride 1mg + Metformin 500mg',
        'Antidiabetic',
        2000,
        7.00,
        200
    ),
    (
        'Janumet 50/500',
        'Sitagliptin 50mg + Metformin 500mg',
        'Antidiabetic',
        800,
        25.00,
        80
    ),
    (
        'Human Mixtard 30/70',
        'Biphasic Isophane Insulin',
        'Insulin',
        100,
        350.00,
        10
    ),
    (
        'Lantus',
        'Insulin Glargine',
        'Insulin',
        50,
        650.00,
        5
    ),
    -- Respiratory & Allergy
    (
        'Montair-LC',
        'Montelukast 10mg + Levocetirizine 5mg',
        'Antiallergic',
        1500,
        14.00,
        150
    ),
    (
        'Cetzine',
        'Cetirizine 10mg',
        'Antihistamine',
        2000,
        3.00,
        200
    ),
    (
        'Allegra 120',
        'Fexofenadine 120mg',
        'Antihistamine',
        800,
        18.00,
        80
    ),
    (
        'Asthalin Inhaler',
        'Salbutamol 100mcg',
        'Bronchodilator',
        200,
        150.00,
        20
    ),
    (
        'Budecort Respules',
        'Budesonide',
        'Steroid',
        300,
        25.00,
        30
    ),
    (
        'Duolin Respules',
        'Levosalbutamol + Ipratropium',
        'Bronchodilator',
        300,
        30.00,
        30
    ),
    (
        'Deriphyllin Retard 150',
        'Etofylline + Theophylline',
        'Bronchodilator',
        1000,
        3.00,
        100
    ),
    (
        'Ascoril-D Syrup',
        'Dextromethorphan + Chlorpheniramine',
        'Cough Syrup',
        300,
        110.00,
        30
    ),
    (
        'Grilinctus Syrup',
        'Dextromethorphan + Guaifenesin',
        'Cough Syrup',
        300,
        120.00,
        30
    ),
    -- Vitamins & Supplements
    (
        'Shelcal 500',
        'Calcium 500mg + Vitamin D3 250IU',
        'Supplement',
        2000,
        6.00,
        200
    ),
    (
        'Neurobion Forte',
        'Vitamin B Complex + B12',
        'Supplement',
        2000,
        2.00,
        200
    ),
    (
        'Limcee',
        'Vitamin C 500mg (Chewable)',
        'Supplement',
        1500,
        1.50,
        150
    ),
    (
        'Orofer XT',
        'Ferrous Ascorbate + Folic Acid',
        'Iron Supplement',
        1200,
        12.00,
        120
    ),
    (
        'Becosules',
        'B-Complex + Vitamin C',
        'Supplement',
        2000,
        2.50,
        200
    ),
    (
        'Evion 400',
        'Vitamin E 400mg',
        'Supplement',
        1000,
        4.00,
        100
    ),
    -- Emergency & ICU
    (
        'Adrenaline Inj',
        'Adrenaline 1mg/ml',
        'Emergency',
        200,
        10.00,
        20
    ),
    (
        'Atropine Inj',
        'Atropine Sulphate 0.6mg',
        'Emergency',
        200,
        8.00,
        20
    ),
    (
        'Lasix Inj',
        'Furosemide 20mg',
        'Diuretic',
        300,
        12.00,
        30
    ),
    (
        'Avil Inj',
        'Pheniramine Maleate',
        'Antiallergic',
        300,
        6.00,
        30
    ),
    (
        'Hydrocort Inj',
        'Hydrocortisone 100mg',
        'Steroid',
        200,
        45.00,
        20
    ),
    (
        'Dexamethasone Inj',
        'Dexamethasone 4mg',
        'Steroid',
        300,
        10.00,
        30
    ),
    (
        'Norad Inj',
        'Noradrenaline',
        'Vasopressor',
        100,
        80.00,
        10
    ),
    (
        'Pantodac Inj',
        'Pantoprazole 40mg IV',
        'Antacid/PPI',
        400,
        45.00,
        40
    ),
    -- Dermatological
    (
        'Betadine Ointment',
        'Povidone Iodine 5%',
        'Antiseptic',
        200,
        60.00,
        20
    ),
    (
        'Silverex Cream',
        'Silver Sulfadiazine',
        'Burn Cream',
        100,
        110.00,
        10
    ),
    (
        'Candid-B Cream',
        'Clotrimazole + Beclomethasone',
        'Antifungal',
        150,
        85.00,
        15
    ),
    -- Fluids
    (
        'NS 500ml',
        'Normal Saline 0.9%',
        'IV Fluid',
        500,
        35.00,
        50
    ),
    (
        'RL 500ml',
        'Ringer Lactate',
        'IV Fluid',
        500,
        40.00,
        50
    ),
    (
        'DNS 500ml',
        'Dextrose Normal Saline',
        'IV Fluid',
        400,
        42.00,
        40
    ),
    (
        'D5 500ml',
        'Dextrose 5%',
        'IV Fluid',
        200,
        38.00,
        20
    );
-- Insert into inventory from temp table, avoiding duplicates
INSERT INTO inventory (
        name,
        generic_name,
        batch_number,
        stock_quantity,
        unit_price,
        expiry_date,
        min_level,
        hospital_id,
        supplier
    )
SELECT tm.name,
    tm.generic_name,
    UPPER(SUBSTRING(tm.name, 1, 3)) || '-' || FLOOR(RANDOM() * 1000 + 1000)::TEXT,
    -- Generate random batch
    tm.stock,
    tm.price,
    CURRENT_DATE + (FLOOR(RANDOM() * 700 + 365) || ' days')::INTERVAL,
    -- Random expiry 1-3 years
    tm.min_lvl,
    h_id,
    'Global Pharma Distributors'
FROM temp_meds tm
WHERE NOT EXISTS (
        SELECT 1
        FROM inventory i
        WHERE i.name = tm.name
            AND i.hospital_id = h_id
    );
-- Clean up
DROP TABLE temp_meds;
END $$;