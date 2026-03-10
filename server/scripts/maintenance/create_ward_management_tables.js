const pool = require('./config/db');

const createTablesQuery = `
    -- Ward Consumables (Items used in wards like IV sets, cotton, etc.)
    CREATE TABLE IF NOT EXISTS ward_consumables (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'General',
        price DECIMAL(10, 2) NOT NULL,
        stock_quantity INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Ward Service Charges (Bed charges, Ventilator, Monitors, etc.)
    -- This maps names like 'ICU Bed', 'Ventilator' to a daily rate
    CREATE TABLE IF NOT EXISTS ward_service_charges (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL, -- e.g. 'Standard Bed', 'ICU Bed', 'Ventilator'
        category VARCHAR(50) NOT NULL, -- 'BED', 'EQUIPMENT', 'SERVICE'
        price DECIMAL(10, 2) NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Ward Change Requests (For approval workflow)
    CREATE TABLE IF NOT EXISTS ward_change_requests (
        id SERIAL PRIMARY KEY,
        request_type VARCHAR(50) NOT NULL, -- 'PRICE_CHANGE', 'NEW_ITEM', 'TOGGLE_STATUS'
        item_type VARCHAR(20) NOT NULL, -- 'CONSUMABLE', 'SERVICE'
        item_id INTEGER, -- Can be null for NEW_ITEM
        new_name VARCHAR(255),
        new_price DECIMAL(10, 2),
        requested_by INTEGER REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Denied'
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP,
        processed_by INTEGER REFERENCES users(id)
    );

    -- Seed Initial Service Charges if empty
    INSERT INTO ward_service_charges (name, category, price, description)
    SELECT 'Standard Bed', 'BED', 1000.00, 'Daily charge for standard ward bed'
    WHERE NOT EXISTS (SELECT 1 FROM ward_service_charges WHERE name = 'Standard Bed');

    INSERT INTO ward_service_charges (name, category, price)
    SELECT 'ICU Bed', 'BED', 5000.00
    WHERE NOT EXISTS (SELECT 1 FROM ward_service_charges WHERE name = 'ICU Bed');

    INSERT INTO ward_service_charges (name, category, price)
    SELECT 'Ventilator Usage', 'EQUIPMENT', 3000.00
    WHERE NOT EXISTS (SELECT 1 FROM ward_service_charges WHERE name = 'Ventilator Usage');

    -- Seed Initial Consumables if empty
    INSERT INTO ward_consumables (name, category, price, stock_quantity)
    SELECT 'IV Set', 'Medical Supplies', 150.00, 100
    WHERE NOT EXISTS (SELECT 1 FROM ward_consumables WHERE name = 'IV Set');

    INSERT INTO ward_consumables (name, category, price, stock_quantity)
    SELECT 'Paracetamol Infusion', 'Medicines', 300.00, 50
    WHERE NOT EXISTS (SELECT 1 FROM ward_consumables WHERE name = 'Paracetamol Infusion');
`;

const run = async () => {
    try {
        await pool.query(createTablesQuery);
        console.log('✅ Ward Management tables created successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating Ward tables:', err);
        process.exit(1);
    }
};

run();
