const { pool } = require('../db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// ============================================
// DASHBOARD
// ============================================
const getDashboard = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    
    const [activeR, readyR, instrumentsR, biR] = await Promise.all([
        pool.query("SELECT COUNT(*) FROM cssd_batches WHERE status = 'Sterilizing' AND hospital_id = $1", [hospitalId]),
        pool.query("SELECT COUNT(*) FROM cssd_batches WHERE status = 'Ready' AND hospital_id = $1", [hospitalId]),
        pool.query("SELECT COUNT(*) FROM cssd_instruments WHERE hospital_id = $1", [hospitalId]),
        pool.query("SELECT COUNT(*) FROM cssd_bio_indicators WHERE hospital_id = $1 AND test_date = CURRENT_DATE", [hospitalId]),
    ]);

    ResponseHandler.success(res, {
        active_cycles: Number.parseInt(activeR.rows[0].count),
        ready_batches: Number.parseInt(readyR.rows[0].count),
        total_instruments: Number.parseInt(instrumentsR.rows[0].count),
        bi_tests_today: Number.parseInt(biR.rows[0].count),
    });
});

// ============================================
// STERILIZATION CYCLES (BATCHES)
// ============================================
const getCycles = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    const { status } = req.query;

    let query = `SELECT cb.*, u.username AS created_by_name 
                 FROM cssd_batches cb LEFT JOIN users u ON cb.created_by = u.id
                 WHERE cb.hospital_id = $1`;
    const params = [hospitalId];
    let idx = 2;
    if (status && status !== 'All') { query += ` AND cb.status = $${idx++}`; params.push(status); }
    query += ' ORDER BY cb.start_time DESC LIMIT 50';

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

const getCycleById = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    const { id } = req.params;

    const cycle = await pool.query('SELECT * FROM cssd_batches WHERE id = $1 AND hospital_id = $2', [id, hospitalId]);
    if (cycle.rows.length === 0) return ResponseHandler.error(res, 'Cycle not found', 404);

    const items = await pool.query('SELECT * FROM cssd_items WHERE batch_id = $1 ORDER BY id', [id]);
    ResponseHandler.success(res, { ...cycle.rows[0], items: items.rows });
});

const createBatch = asyncHandler(async (req, res) => {
    const { items, method, cycle_duration_mins, temperature, pressure } = req.body;
    const hospitalId = req.hospital_id;
    const createdBy = req.user.id;

    const batchRes = await pool.query(
        `INSERT INTO cssd_batches (method, status, start_time, expected_end_time, temperature, pressure, created_by, hospital_id)
         VALUES ($1, 'Sterilizing', NOW(), NOW() + make_interval(mins => $2), $3, $4, $5, $6)
         RETURNING *`,
        [method || 'Autoclave', cycle_duration_mins || 60, temperature || 134, pressure || 2.1, createdBy, hospitalId]
    );
    const batchId = batchRes.rows[0].id;

    if (items && items.length > 0) {
        for (const item of items) {
            await pool.query(
                `INSERT INTO cssd_items (batch_id, item_name, quantity, status) VALUES ($1, $2, $3, 'Processing')`,
                [batchId, item.name, item.quantity]
            );
        }
    }
    ResponseHandler.success(res, batchRes.rows[0], 'Sterilization Cycle Started', 201);
});

const completeBatch = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { qc_passed, notes } = req.body;
    const checkedBy = req.user.id;
    const status = qc_passed ? 'Ready' : 'Failed';

    const result = await pool.query(
        `UPDATE cssd_batches SET status = $1, end_time = NOW(), qc_checked_by = $2, qc_notes = $3 WHERE id = $4 RETURNING *`,
        [status, checkedBy, notes, id]
    );
    await pool.query('UPDATE cssd_items SET status = $1 WHERE batch_id = $2', [status, id]);
    ResponseHandler.success(res, result.rows[0], `Batch Marked as ${status}`);
});

// ============================================
// INSTRUMENTS
// ============================================
const getInstruments = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    const { status, department } = req.query;

    let query = 'SELECT * FROM cssd_instruments WHERE hospital_id = $1';
    const params = [hospitalId];
    let idx = 2;
    if (status && status !== 'All') { query += ` AND status = $${idx++}`; params.push(status); }
    if (department && department !== 'All') { query += ` AND current_department = $${idx++}`; params.push(department); }
    query += ' ORDER BY name';

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

const issueToDept = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { department, issued_to } = req.body;
    const hospitalId = req.hospital_id;

    const result = await pool.query(
        `UPDATE cssd_instruments SET status = 'ISSUED', current_department = $1, 
         last_issued_to = $2, last_issued_date = NOW(), updated_at = NOW()
         WHERE id = $3 AND hospital_id = $4 RETURNING *`,
        [department, issued_to, id, hospitalId]
    );
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Instrument not found', 404);
    ResponseHandler.success(res, result.rows[0], 'Instrument issued');
});

const returnInstrument = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = req.hospital_id;

    const result = await pool.query(
        `UPDATE cssd_instruments SET status = 'RECEIVED', current_department = 'CSSD', updated_at = NOW()
         WHERE id = $1 AND hospital_id = $2 RETURNING *`,
        [id, hospitalId]
    );
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Instrument not found', 404);
    ResponseHandler.success(res, result.rows[0], 'Instrument returned to CSSD');
});

// ============================================
// LOAD LOGS
// ============================================
const getLoadLogs = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    const result = await pool.query(
        `SELECT ll.*, u.username AS loaded_by_name
         FROM cssd_load_logs ll LEFT JOIN users u ON ll.loaded_by = u.id
         WHERE ll.hospital_id = $1 ORDER BY ll.load_date DESC LIMIT 50`,
        [hospitalId]
    );
    ResponseHandler.success(res, result.rows);
});

const createLoadLog = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    const { autoclave_id, load_number, items, notes } = req.body;

    const result = await pool.query(
        `INSERT INTO cssd_load_logs (autoclave_id, load_number, items, notes, loaded_by, hospital_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [autoclave_id, load_number, JSON.stringify(items || []), notes, req.user.id, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'Load log created', 201);
});

// ============================================
// BIO-INDICATORS
// ============================================
const getBioIndicators = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    const result = await pool.query(
        `SELECT bi.*, u.username AS tested_by_name
         FROM cssd_bio_indicators bi LEFT JOIN users u ON bi.tested_by = u.id
         WHERE bi.hospital_id = $1 ORDER BY bi.test_date DESC, bi.created_at DESC LIMIT 50`,
        [hospitalId]
    );
    ResponseHandler.success(res, result.rows);
});

const logBioIndicator = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    const { batch_id, indicator_type, result: testResult, incubation_hours, notes } = req.body;

    const row = await pool.query(
        `INSERT INTO cssd_bio_indicators (batch_id, indicator_type, result, incubation_hours, notes, tested_by, hospital_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [batch_id, indicator_type || 'Spore Strip', testResult || 'NEGATIVE', incubation_hours || 24, notes, req.user.id, hospitalId]
    );
    ResponseHandler.success(res, row.rows[0], 'Bio-indicator logged', 201);
});

// ============================================
// INVENTORY & LOGS (existing)
// ============================================
const getInventory = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    const result = await pool.query(
        `SELECT ci.*, cb.method, cb.status as batch_status 
         FROM cssd_items ci LEFT JOIN cssd_batches cb ON ci.batch_id = cb.id 
         WHERE cb.hospital_id = $1 ORDER BY ci.id DESC LIMIT 100`,
        [hospitalId]
    );
    ResponseHandler.success(res, { items: result.rows });
});

const logAction = asyncHandler(async (req, res) => {
    const { item_id, action, notes } = req.body;
    const userId = req.user.id;
    const hospitalId = req.hospital_id;
    const result = await pool.query(
        `INSERT INTO cssd_logs (item_id, action, notes, performed_by, hospital_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
        [item_id, action, notes, userId, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'Action logged', 201);
});

const getBatches = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    const result = await pool.query(
        'SELECT * FROM cssd_batches WHERE hospital_id = $1 ORDER BY start_time DESC LIMIT 50',
        [hospitalId]
    );
    ResponseHandler.success(res, { batches: result.rows });
});

module.exports = { 
    getDashboard, getCycles, getCycleById, createBatch, completeBatch,
    getInstruments, issueToDept, returnInstrument,
    getLoadLogs, createLoadLog, getBioIndicators, logBioIndicator,
    getInventory, logAction, getBatches,
};
