const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const http = require('http');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hms_db',
    password: 'Hospital456!',
    port: 5432
});

app.get('/api/lab/tests', async (req, res) => {
    console.log('📥 GET /api/lab/tests called');
    try {
        const result = await pool.query(`
            SELECT 
                t.id,
                t.name,
                c.name as category
            FROM lab_test_types t
            LEFT JOIN lab_test_categories c ON t.category_id = c.id
            ORDER BY c.name, t.name
        `);
        console.log(`📤 Returning ${result.rows.length} tests`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

const PORT = 5001;
app.listen(PORT, () => {
    console.log(`🚀 Test Server running on port ${PORT}`);

    setTimeout(() => {
        console.log('🧪 Running self-test...');
        http.get(`http://localhost:${PORT}/api/lab/tests`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log(`✅ Self-test success: Got ${json.length} tests`);
                    process.exit(0);
                } catch (e) {
                    console.error('❌ Invalid JSON response');
                    process.exit(1);
                }
            });
        }).on('error', (err) => {
            console.error('❌ Request failed:', err.message);
            process.exit(1);
        });
    }, 1000);
});
