const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(cors());

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    // Cloud SQL Socket
    socketPath: process.env.DB_HOST.startsWith('/') ? process.env.DB_HOST : undefined
});

const SYNC_SECRET = 'WolfHMS_Migration_Secret_2026';

app.get('/', (req, res) => res.send('SYNC SERVER ACTIVE'));

app.post('/api/sync/sql', async (req, res) => {
    console.log('SQL EXEC HIT');
    const { secret, sql } = req.body;
    if (secret !== SYNC_SECRET) return res.status(403).json({ message: 'Invalid Secret' });
    
    try {
        const result = await pool.query(sql);
        res.json({ success: true, rowCount: result.rowCount, rows: result.rows });
    } catch (err) {
        console.error('SQL Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sync/restore', async (req, res) => {
    console.log('SYNC HIT');
    const { secret, hospitals, users, patients } = req.body;

    if (secret !== SYNC_SECRET) return res.status(403).json({ message: 'Invalid Secret' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let log = [];

        // Hospitals
        if (hospitals) {
            for (const h of hospitals) {
                await client.query(`
                    INSERT INTO hospitals (id, code, name, subscription_tier) VALUES ($1, $2, $3, $4)
                    ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code, name=EXCLUDED.name, subscription_tier=EXCLUDED.subscription_tier
                `, [h.id, h.code, h.name, h.subscription_tier]);
            }
            log.push(`Synced ${hospitals.length} hospitals`);
        }

        // Users
        if (users) {
            for (const u of users) {
                await client.query(`
                    INSERT INTO users (id, username, email, password, role, hospital_id, is_active, full_name, department)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (id) DO UPDATE SET 
                        username = EXCLUDED.username, email = EXCLUDED.email, password = EXCLUDED.password,
                        role = EXCLUDED.role, hospital_id = EXCLUDED.hospital_id, is_active = EXCLUDED.is_active
                `, [u.id, u.username, u.email, u.password, u.role, u.hospital_id, u.is_active, u.full_name, u.department]);
            }
            log.push(`Synced ${users.length} users`);
        }

        // Patients
        if (patients) {
            for (const p of patients) {
                const history = typeof p.history_json === 'object' ? JSON.stringify(p.history_json) : p.history_json;
                await client.query(`
                    INSERT INTO patients (id, name, dob, gender, phone, address, history_json)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, phone=EXCLUDED.phone
                `, [p.id, p.name, p.dob, p.gender, p.phone, p.address, history]);
            }
            log.push(`Synced ${patients.length} patients`);
        }

        await client.query('COMMIT');
        res.json({ success: true, log });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Sync Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`SYNC SERVER RUNNING ON ${PORT}`));
