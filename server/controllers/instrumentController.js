/**
 * Lab Instrument Controller - Multi-Tenant
 */
const pool = require('../config/db');
const { SerialHandler } = require('../lib/serial-handler');
const { TCPListener, TCPClient } = require('../lib/tcp-listener');
const { parseASTMMessage } = require('../lib/astm-parser');
const { parseHL7Message } = require('../lib/hl7-parser');
const { getMessageRouter } = require('../services/messageRouter');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const activeConnections = new Map();

// Get Instruments - Multi-Tenant
const getInstruments = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`SELECT i.*, d.manufacturer as driver_manufacturer, d.model as driver_model, d.verified as driver_verified,
        (SELECT COUNT(*) FROM instrument_comm_log WHERE instrument_id = i.id AND created_at > NOW() - INTERVAL '24 hours') as messages_24h
        FROM lab_instruments i LEFT JOIN instrument_drivers d ON i.driver_id = d.id WHERE (i.hospital_id = $1 OR i.hospital_id IS NULL) ORDER BY i.is_active DESC, i.name`, [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// Get Drivers - Multi-Tenant
const getInstrumentDrivers = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { category } = req.query;
    let query = 'SELECT * FROM instrument_drivers WHERE (hospital_id = $1)';
    const params = [hospitalId];
    if (category) { query += ' AND category = $2'; params.push(category); }
    query += ' ORDER BY manufacturer, model';
    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

// Add Instrument - Multi-Tenant
const addInstrument = asyncHandler(async (req, res) => {
    const { name, manufacturer, model, category, connection_type, connection_config, protocol, driver_id, is_bidirectional } = req.body;
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`INSERT INTO lab_instruments (name, manufacturer, model, category, connection_type, connection_config, protocol, driver_id, is_bidirectional, hospital_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`, [name, manufacturer, model, category, connection_type, JSON.stringify(connection_config), protocol, driver_id, is_bidirectional !== false, hospitalId]);
    ResponseHandler.success(res, result.rows[0], 'Instrument added successfully', 201);
});

// Update Instrument - Multi-Tenant
const updateInstrument = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, connection_config, is_active, is_bidirectional } = req.body;
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`UPDATE lab_instruments SET name = COALESCE($1, name), connection_config = COALESCE($2, connection_config), is_active = COALESCE($3, is_active), is_bidirectional = COALESCE($4, is_bidirectional), updated_at = NOW()
        WHERE id = $5 AND (hospital_id = $6) RETURNING *`, [name, connection_config ? JSON.stringify(connection_config) : null, is_active, is_bidirectional, id, hospitalId]);
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Instrument not found', 404);
    ResponseHandler.success(res, result.rows[0], 'Instrument updated successfully');
});

// Delete Instrument - Multi-Tenant
const deleteInstrument = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    if (activeConnections.has(parseInt(id))) { const conn = activeConnections.get(parseInt(id)); await conn.disconnect?.() || await conn.stop?.(); activeConnections.delete(parseInt(id)); }
    await pool.query('DELETE FROM lab_instruments WHERE id = $1 AND (hospital_id = $2)', [id, hospitalId]);
    ResponseHandler.success(res, { message: 'Instrument deleted' });
});

// Test Connection - Multi-Tenant
const testInstrumentConnection = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    const instrument = await pool.query('SELECT * FROM lab_instruments WHERE id = $1 AND (hospital_id = $2)', [id, hospitalId]);
    if (instrument.rows.length === 0) return ResponseHandler.error(res, 'Instrument not found', 404);
    const inst = instrument.rows[0];
    const config = typeof inst.connection_config === 'string' ? JSON.parse(inst.connection_config) : inst.connection_config;
    let testResult = { success: false, message: 'Unknown connection type' };
    if (inst.connection_type === 'RS232') { const handler = new SerialHandler({ ...config, instrumentId: inst.id }); testResult = await handler.testConnection(); }
    else if (inst.connection_type === 'TCP_IP') { testResult = await TCPListener.testPort(config.port, config.host || 'localhost'); }
    if (testResult.success) await pool.query('UPDATE lab_instruments SET last_communication = NOW(), last_error = NULL WHERE id = $1', [id]);
    else await pool.query('UPDATE lab_instruments SET last_error = $1 WHERE id = $2', [testResult.message, id]);
    ResponseHandler.success(res, testResult);
});

// Start Listener - Multi-Tenant
const startInstrumentListener = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = getHospitalId(req);
    const instrument = await pool.query(`SELECT i.*, d.parser_config, d.field_mappings FROM lab_instruments i LEFT JOIN instrument_drivers d ON i.driver_id = d.id WHERE i.id = $1 AND (i.hospital_id = $2 OR i.hospital_id IS NULL)`, [id, hospitalId]);
    if (instrument.rows.length === 0) return ResponseHandler.error(res, 'Instrument not found', 404);
    const inst = instrument.rows[0];
    if (activeConnections.has(inst.id)) return ResponseHandler.error(res, 'Instrument already connected', 400);
    const config = typeof inst.connection_config === 'string' ? JSON.parse(inst.connection_config) : inst.connection_config;
    let connection;
    if (inst.connection_type === 'RS232') { connection = new SerialHandler({ ...config, instrumentId: inst.id, protocol: inst.protocol }); await connection.connect(); }
    else if (inst.connection_type === 'TCP_IP') { connection = new TCPListener({ ...config, instrumentId: inst.id, protocol: inst.protocol }); await connection.start(); }
    if (connection) {
        connection.on('results', async (data) => { 
            await processInstrumentResults(inst.id, data, inst.field_mappings); 
            // Broadcast result via Socket.IO
            if (req.io) req.io.emit('instrument:result', { instrumentId: inst.id, name: inst.name, timestamp: new Date(), resultsCount: data?.results?.length || 1 });
        });
        connection.on('message', async (data) => { await logCommunication(inst.id, 'IN', data); });
        connection.on('error', async (error) => { 
            await pool.query('UPDATE lab_instruments SET last_error = $1 WHERE id = $2', [error.message, inst.id]); 
            if (req.io) req.io.emit('instrument:error', { instrumentId: inst.id, name: inst.name, error: error.message });
        });
        activeConnections.set(inst.id, connection);
        await pool.query('UPDATE lab_instruments SET last_communication = NOW(), last_error = NULL WHERE id = $1', [id]);
        // Broadcast instrument connected via Socket.IO
        if (req.io) req.io.emit('instrument:connected', { instrumentId: inst.id, name: inst.name });
    }
    ResponseHandler.success(res, { message: 'Instrument listener started', instrumentId: inst.id });
});

// Stop Listener
const stopInstrumentListener = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const instrumentId = parseInt(id);
    if (!activeConnections.has(instrumentId)) return ResponseHandler.error(res, 'Instrument not connected', 400);
    const connection = activeConnections.get(instrumentId);
    await connection.disconnect?.() || await connection.stop?.();
    activeConnections.delete(instrumentId);
    // Broadcast instrument disconnected via Socket.IO
    if (req.io) req.io.emit('instrument:disconnected', { instrumentId });
    ResponseHandler.success(res, { message: 'Instrument listener stopped' });
});

// Get Logs - Multi-Tenant
const getInstrumentLogs = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { limit = 50 } = req.query;
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`SELECT * FROM instrument_comm_log WHERE instrument_id = $1 AND (hospital_id = $2) ORDER BY created_at DESC LIMIT $3`, [id, hospitalId, limit]);
    ResponseHandler.success(res, result.rows);
});

// Get Connection Status
const getConnectionStatus = asyncHandler(async (req, res) => {
    const status = [];
    for (const [instrumentId, connection] of activeConnections) status.push({ instrumentId, isConnected: connection.isConnected || connection.isRunning, type: connection instanceof SerialHandler ? 'serial' : 'tcp' });
    ResponseHandler.success(res, status);
});

// List Serial Ports
const listSerialPorts = asyncHandler(async (req, res) => {
    try { const ports = await SerialHandler.listPorts(); ResponseHandler.success(res, ports); }
    catch (error) { console.error('List ports error:', error); ResponseHandler.success(res, []); }
});

async function processInstrumentResults(instrumentId, data, fieldMappings) {
    try {
        const { results } = data;
        for (const result of results) {
            const matchQuery = `SELECT lr.id, lr.patient_id, lr.admission_id FROM lab_requests lr JOIN lab_test_types ltt ON lr.test_type_id = ltt.id WHERE (ltt.code = $1 OR ltt.name ILIKE $2) AND lr.status IN ('Sample Collected', 'In Progress') ORDER BY lr.created_at DESC LIMIT 1`;
            const match = await pool.query(matchQuery, [result.testCode, `%${result.testName}%`]);
            if (match.rows.length > 0) {
                const request = match.rows[0];
                await pool.query(`UPDATE lab_requests SET status = 'Completed', result = $1, completed_by = 1, updated_at = NOW() WHERE id = $2`, [JSON.stringify({ value: result.value, unit: result.units, referenceRange: result.refRange, flag: result.flag, source: 'INSTRUMENT', instrumentId }), request.id]);
                console.log(`✅ Auto-uploaded result for request ${request.id}: ${result.testCode} = ${result.value}`);
            }
        }
    } catch (error) { console.error('Process results error:', error); }
}

async function logCommunication(instrumentId, direction, data) {
    try {
        await pool.query(`INSERT INTO instrument_comm_log (instrument_id, direction, message_type, raw_message, parsed_data, status) VALUES ($1, $2, $3, $4, $5, $6)`,
            [instrumentId, direction, data.messageType || data.protocol, data.raw?.substring(0, 5000), JSON.stringify(data.parsed || {}), 'SUCCESS']);
    } catch (error) { console.error('Log communication error:', error); }
}

// Get Message Stats
const getMessageStats = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const router = getMessageRouter();
    const routerStats = router.getStats();
    const dbStats = await pool.query(`SELECT COUNT(*) FILTER (WHERE status = 'SUCCESS') as successful, COUNT(*) FILTER (WHERE status = 'PARSE_ERROR') as errors, COUNT(*) FILTER (WHERE direction = 'IN') as received,
        COUNT(*) FILTER (WHERE direction = 'OUT') as sent, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as last_hour FROM instrument_comm_log WHERE created_at > NOW() - INTERVAL '24 hours' AND (hospital_id = $1)`, [hospitalId]);
    ResponseHandler.success(res, { router: routerStats, database: dbStats.rows[0] });
});

// Receive Results from Lab Bridge - Multi-Tenant
const receiveResultsFromBridge = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { instrumentId, raw, parsed, timestamp, source } = req.body;
    if (!parsed || !parsed.results) return ResponseHandler.error(res, 'No results in payload', 400);
    console.log(`📥 Received ${parsed.results.length} results from Lab Bridge (${instrumentId})`);
    await logCommunication(instrumentId, 'IN', { messageType: 'LAB_BRIDGE_RESULT', raw: raw?.substring(0, 5000), parsed });
    const router = getMessageRouter();
    for (const result of parsed.results) router.enqueue({ instrumentId, protocol: 'LAB_BRIDGE', raw, parsed: { results: [result], patients: parsed.patients || [], orders: parsed.orders || [] } });
    ResponseHandler.success(res, { success: true, message: `Received ${parsed.results.length} results`, resultsCount: parsed.results.length });
});

module.exports = { getInstruments, getInstrumentDrivers, addInstrument, updateInstrument, deleteInstrument, testInstrumentConnection, startInstrumentListener, stopInstrumentListener, getInstrumentLogs, getConnectionStatus, listSerialPorts, getMessageStats, receiveResultsFromBridge };
