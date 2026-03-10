const pool = require('./config/db');

async function seed() {
    try {
        console.log('Seeding: Updating Inventory Data (Phase 4.2)...');

        // 1. Update Paracetamol
        await pool.query(`
            UPDATE inventory_items 
            SET generic_name = 'Paracetamol', 
                manufacturer = 'GSK', 
                schedule_type = 'General', 
                rack_location = 'Row A - Shelf 2',
                purchase_price = 4.00,
                mrp = 6.00,
                gst_percent = 12.00,
                hsn_code = '300490'
            WHERE name ILIKE '%Paracetamol%'
        `);

        // 2. Upsert Amoxicillin (H1 Drug)
        const checkAmox = await pool.query("SELECT id FROM inventory_items WHERE name ILIKE '%Amoxicillin%'");
        if (checkAmox.rows.length === 0) {
            await pool.query(`
                INSERT INTO inventory_items (name, category, stock_quantity, price_per_unit, generic_name, manufacturer, schedule_type, rack_location, purchase_price, mrp, gst_percent, hsn_code, batch_number, expiry_date)
                VALUES ('Amoxicillin 500mg', 'Antibiotic', 100, 2.00, 'Amoxicillin', 'Sun Pharma', 'H1', 'Row B - Secure Cabinet', 1.00, 1.50, 18.00, '300410', 'BATCH-AMOX-01', '2025-12-31')
            `);
            console.log('Inserted Amoxicillin');
        } else {
            await pool.query(`
                UPDATE inventory_items 
                SET generic_name = 'Amoxicillin', 
                    manufacturer = 'Sun Pharma', 
                    schedule_type = 'H1', 
                    rack_location = 'Row B - Secure Cabinet',
                    purchase_price = 1.00,
                    mrp = 1.50,
                    gst_percent = 18.00,
                    hsn_code = '300410'
                WHERE name ILIKE '%Amoxicillin%'
            `);
            console.log('Updated Amoxicillin');
        }

        console.log('✅ Seed Data Updated (H1 & General Examples)');
        process.exit();
    } catch (err) {
        console.error('Seed Failed:', err);
        process.exit(1);
    }
}

seed();
