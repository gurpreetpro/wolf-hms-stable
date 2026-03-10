const pool = require('./config/db');

const consumables = [
    { name: '3-Ply Surgical Mask', category: 'Protective Gear', price: 10.00, stock_quantity: 1000 },
    { name: 'N95 Mask', category: 'Protective Gear', price: 40.00, stock_quantity: 500 },
    { name: 'Latex Examination Gloves (Pair)', category: 'Protective Gear', price: 15.00, stock_quantity: 2000 },
    { name: 'Sterile Surgical Gloves (Pair)', category: 'Protective Gear', price: 25.00, stock_quantity: 1000 },
    { name: 'Disposable Shoe Covers (Pair)', category: 'Protective Gear', price: 5.00, stock_quantity: 2000 },
    { name: 'Disposable Head Cap', category: 'Protective Gear', price: 5.00, stock_quantity: 2000 },
    { name: 'IV Cannula (18G)', category: 'Medical Supplies', price: 50.00, stock_quantity: 300 },
    { name: 'IV Cannula (20G)', category: 'Medical Supplies', price: 50.00, stock_quantity: 300 },
    { name: 'IV Cannula (22G)', category: 'Medical Supplies', price: 50.00, stock_quantity: 300 },
    { name: 'IV Infusion Set', category: 'Medical Supplies', price: 40.00, stock_quantity: 500 },
    { name: 'Syringe 5ml with Needle', category: 'Medical Supplies', price: 10.00, stock_quantity: 1000 },
    { name: 'Syringe 10ml with Needle', category: 'Medical Supplies', price: 15.00, stock_quantity: 1000 },
    { name: 'Absorbent Cotton Roll (500g)', category: 'Medical Supplies', price: 250.00, stock_quantity: 100 },
    { name: 'Gauze Bandage Roll', category: 'Medical Supplies', price: 30.00, stock_quantity: 500 },
    { name: 'Micropore Tape (1 inch)', category: 'Medical Supplies', price: 40.00, stock_quantity: 200 },
    { name: 'Hand Sanitizer (500ml)', category: 'Hygiene', price: 250.00, stock_quantity: 100 },
    { name: 'Spirit/Alcohol Swab', category: 'Hygiene', price: 2.00, stock_quantity: 5000 },
    { name: 'ECG Electrodes (Pack of 50)', category: 'Diagnostic', price: 300.00, stock_quantity: 50 },
    { name: 'Urine Collection Bag', category: 'Medical Supplies', price: 60.00, stock_quantity: 200 },
    { name: 'Ryles Tube (Nasogastric Tube)', category: 'Medical Supplies', price: 40.00, stock_quantity: 100 },
    { name: 'Foley Catheter', category: 'Medical Supplies', price: 80.00, stock_quantity: 100 },
    { name: 'Nebulizer Mask', category: 'Respiratory', price: 90.00, stock_quantity: 100 },
    { name: 'Oxygen Mask', category: 'Respiratory', price: 85.00, stock_quantity: 100 },
    { name: 'Surgical Gown (Disposable)', category: 'Protective Gear', price: 150.00, stock_quantity: 200 },
    { name: 'Bed Sheet (Disposable)', category: 'General', price: 45.00, stock_quantity: 500 }
];

const seed = async () => {
    try {
        console.log('🌱 Starting seed for Indian Consumables...');

        for (const item of consumables) {
            try {
                const check = await pool.query('SELECT 1 FROM ward_consumables WHERE name = $1', [item.name]);
                if (check.rowCount === 0) {
                    await pool.query(
                        'INSERT INTO ward_consumables (name, category, price, stock_quantity) VALUES ($1, $2, $3, $4)',
                        [item.name, item.category, item.price, item.stock_quantity]
                    );
                    console.log(`+ Added: ${item.name}`);
                } else {
                    // Update price/stock if exists
                    await pool.query(
                        'UPDATE ward_consumables SET price = $2, stock_quantity = $3 WHERE name = $1',
                        [item.name, item.price, item.stock_quantity]
                    );
                    console.log(`= Updated: ${item.name}`);
                }
            } catch (innerErr) {
                console.error(`Error processing ${item.name}:`, innerErr.message);
            }
        }

        console.log('✅ Successfully seeded/updated consumable catalog.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding consumables:', err);
        process.exit(1);
    }
};

seed();
