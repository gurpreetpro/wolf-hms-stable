const pool = require('./config/db');

const createTableQuery = `
    CREATE TABLE IF NOT EXISTS price_change_requests (
        id SERIAL PRIMARY KEY,
        inventory_id INTEGER REFERENCES inventory_items(id),
        old_price DECIMAL(10, 2) NOT NULL,
        new_price DECIMAL(10, 2) NOT NULL,
        requested_by INTEGER REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
    );
`;

const run = async () => {
    try {
        await pool.query(createTableQuery);
        console.log('✅ price_change_requests table created successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating table:', err);
        process.exit(1);
    }
};

run();
