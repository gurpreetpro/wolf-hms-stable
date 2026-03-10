const pool = require('./config/db');

async function seed() {
    try {
        console.log('Seeding Expiry Data...');

        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
        const nextMonth = new Date(now.setMonth(now.getMonth() + 1)).toISOString().slice(0, 7);
        const farFuture = new Date(now.setMonth(now.getMonth() + 5)).toISOString().slice(0, 7); // +6 months total

        // 1. Expiring THIS Month (Red)
        await pool.query(`
            INSERT INTO inventory_items (name, category, stock_quantity, price_per_unit, expiry_date)
            VALUES ('Expiring Drug A', 'Tablets', 50, 10.00, '${currentMonth}-28')
        `);

        // 2. Expiring NEXT Month (Orange)
        await pool.query(`
            INSERT INTO inventory_items (name, category, stock_quantity, price_per_unit, expiry_date)
            VALUES ('Expiring Drug B', 'Syrup', 20, 50.00, '${nextMonth}-15')
        `);

        // 3. Safe (Green)
        await pool.query(`
            INSERT INTO inventory_items (name, category, stock_quantity, price_per_unit, expiry_date)
            VALUES ('Safe Drug C', 'Injection', 100, 100.00, '${farFuture}-01')
        `);

        console.log('✅ Added Expiry Test Items');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
