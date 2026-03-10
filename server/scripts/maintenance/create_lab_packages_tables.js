const pool = require('./config/db');

const createTablesQuery = `
    -- Lab Packages Table
    CREATE TABLE IF NOT EXISTS lab_packages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        category VARCHAR(50) DEFAULT 'General', -- e.g., Basic, Advanced, Specialized
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Lab Package Items (Linking Packages to Test Types)
    CREATE TABLE IF NOT EXISTS lab_package_items (
        id SERIAL PRIMARY KEY,
        package_id INTEGER REFERENCES lab_packages(id) ON DELETE CASCADE,
        test_type_id INTEGER REFERENCES lab_test_types(id) ON DELETE CASCADE
    );

    -- Lab Change Requests (For Price Changes and New Tests)
    CREATE TABLE IF NOT EXISTS lab_change_requests (
        id SERIAL PRIMARY KEY,
        request_type VARCHAR(20) NOT NULL, -- 'PRICE_CHANGE', 'NEW_TEST', 'TOGGLE_VISIBILITY'
        test_id INTEGER REFERENCES lab_test_types(id), -- Nullable for NEW_TEST
        new_name VARCHAR(255),
        new_price DECIMAL(10, 2),
        new_category_id INTEGER REFERENCES lab_test_categories(id),
        requested_by INTEGER REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Denied'
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP,
        processed_by INTEGER REFERENCES users(id)
    );
`;

const run = async () => {
    try {
        await pool.query(createTablesQuery);
        console.log('✅ Lab Packages & Change Requests tables created successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating tables:', err);
        process.exit(1);
    }
};

run();
