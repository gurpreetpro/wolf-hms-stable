const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: 'Hospital456!',
    port: 5432
});

async function createProceduresTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS procedures (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                code VARCHAR(20),
                price DECIMAL(10, 2) NOT NULL,
                description TEXT
            );
        `);
        console.log('✅ Created procedures table');

        // Seed some data
        await pool.query(`
            INSERT INTO procedures (name, code, price, description) VALUES
            ('General Consultation', 'OPD001', 500.00, 'Standard OPD consultation'),
            ('Appendectomy', 'SURG001', 25000.00, 'Surgical removal of the appendix'),
            ('Cataract Surgery', 'SURG002', 15000.00, 'Removal of cataract'),
            ('Normal Delivery', 'OBS001', 10000.00, 'Normal vaginal delivery'),
            ('Cesarean Section', 'OBS002', 35000.00, 'C-Section delivery')
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✅ Seeded procedures data');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

createProceduresTable();
