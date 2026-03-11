const { pool } = require('../db');
const crypto = require('crypto');
const logger = require('./Logger');

/**
 * Remote Access Service - Multi-Tenant Version
 * Manages secure remote support access and diagnostics
 */
class RemoteAccessService {
    static generateToken() { return crypto.randomBytes(32).toString('hex'); }
    static generateTicketNumber() { const date = new Date(); return `TKT${date.toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`; }

    // Create ticket - Multi-Tenant
    static async createTicket({ userId, hospitalId, category, priority, subject, description, remoteAccessRequested = false }) {
        try { const ticketNumber = this.generateTicketNumber(); const result = await pool.query(`INSERT INTO support_tickets (ticket_number, user_id, category, priority, subject, description, remote_access_requested, hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [ticketNumber, userId, category, priority, subject, description, remoteAccessRequested, hospitalId]); logger.info('Support ticket created', { ticketNumber, category, priority }); return result.rows[0]; }
        catch (error) { logger.error('Failed to create ticket', { error: error.message }); throw error; }
    }

    // Get tickets - Multi-Tenant
    static async getTickets({ hospitalId, userId = null, status = null, page = 1, limit = 20 }) {
        try { const offset = (page - 1) * limit; let query = `SELECT t.*, u.username as created_by_name, a.username as assigned_to_name FROM support_tickets t LEFT JOIN users u ON t.user_id = u.id LEFT JOIN users a ON t.assigned_to = a.id WHERE (t.hospital_id = $1 OR t.hospital_id IS NULL)`; const params = [hospitalId]; let paramIndex = 2;
        if (userId) { query += ` AND t.user_id = $${paramIndex}`; params.push(userId); paramIndex++; }
        if (status) { query += ` AND t.status = $${paramIndex}`; params.push(status); paramIndex++; }
        query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`; params.push(limit, offset); const result = await pool.query(query, params); return result.rows; }
        catch (error) { logger.error('Failed to get tickets', { error: error.message }); throw error; }
    }

    // Get ticket details - Multi-Tenant
    static async getTicketDetails(ticketId, hospitalId) {
        try { const ticketResult = await pool.query(`SELECT t.*, u.username as created_by_name, a.username as assigned_to_name FROM support_tickets t LEFT JOIN users u ON t.user_id = u.id LEFT JOIN users a ON t.assigned_to = a.id WHERE t.id = $1 AND (t.hospital_id = $2 OR t.hospital_id IS NULL)`, [ticketId, hospitalId]); if (ticketResult.rows.length === 0) return null; const messagesResult = await pool.query(`SELECT m.*, u.username FROM ticket_messages m LEFT JOIN users u ON m.user_id = u.id WHERE m.ticket_id = $1 ORDER BY m.created_at ASC`, [ticketId]); return { ...ticketResult.rows[0], messages: messagesResult.rows }; }
        catch (error) { logger.error('Failed to get ticket details', { error: error.message }); throw error; }
    }

    // Add message - Multi-Tenant
    static async addTicketMessage(ticketId, userId, hospitalId, message, isInternal = false) {
        try { const result = await pool.query(`INSERT INTO ticket_messages (ticket_id, user_id, message, is_internal, hospital_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`, [ticketId, userId, message, isInternal, hospitalId]); await pool.query(`UPDATE support_tickets SET updated_at = NOW() WHERE id = $1`, [ticketId]); return result.rows[0]; }
        catch (error) { logger.error('Failed to add ticket message', { error: error.message }); throw error; }
    }

    // Update status - Multi-Tenant
    static async updateTicketStatus(ticketId, hospitalId, status, resolutionNotes = null) {
        try { let query = `UPDATE support_tickets SET status = $1, updated_at = NOW()`; const params = [status];
        if (status === 'resolved' || status === 'closed') { query += `, resolved_at = NOW()`; if (resolutionNotes) { query += `, resolution_notes = $${params.length + 1}`; params.push(resolutionNotes); } }
        query += ` WHERE id = $${params.length + 1} AND (hospital_id = $${params.length + 2}) RETURNING *`; params.push(ticketId, hospitalId); const result = await pool.query(query, params); return result.rows[0]; }
        catch (error) { logger.error('Failed to update ticket status', { error: error.message }); throw error; }
    }

    // Grant remote access - Multi-Tenant
    static async grantRemoteAccess(ticketId, hospitalId, durationMinutes = 60) {
        try { const token = this.generateToken(); const expires = new Date(Date.now() + durationMinutes * 60 * 1000); const result = await pool.query(`UPDATE support_tickets SET remote_access_granted = true, remote_access_token = $1, remote_access_expires = $2, updated_at = NOW() WHERE id = $3 AND (hospital_id = $4) RETURNING *`, [token, expires, ticketId, hospitalId]); logger.info('Remote access granted', { ticketId, expires }); return { ticket: result.rows[0], accessToken: token, expiresAt: expires }; }
        catch (error) { logger.error('Failed to grant remote access', { error: error.message }); throw error; }
    }

    // Validate remote access (token-based, no hospital filter needed)
    static async validateRemoteAccess(token) {
        try { const result = await pool.query(`SELECT * FROM support_tickets WHERE remote_access_token = $1 AND remote_access_granted = true AND remote_access_expires > NOW()`, [token]); return result.rows.length > 0 ? result.rows[0] : null; }
        catch (error) { logger.error('Failed to validate remote access', { error: error.message }); return null; }
    }

    // Revoke remote access - Multi-Tenant
    static async revokeRemoteAccess(ticketId, hospitalId) {
        try { await pool.query(`UPDATE support_tickets SET remote_access_granted = false, remote_access_token = NULL, remote_access_expires = NULL, updated_at = NOW() WHERE id = $1 AND (hospital_id = $2)`, [ticketId, hospitalId]); logger.info('Remote access revoked', { ticketId }); return true; }
        catch (error) { logger.error('Failed to revoke remote access', { error: error.message }); throw error; }
    }

    // Diagnostics (system-wide, no tenant filter)
    static async getDiagnostics() { const HealthCheckService = require('./HealthCheckService'); const MetricsCollector = require('./MetricsCollector'); const AlertService = require('./AlertService'); try { const [health, metrics, alertStats] = await Promise.all([HealthCheckService.getHealthStatus(), MetricsCollector.getAllMetrics(), AlertService.getStats()]); return { timestamp: new Date().toISOString(), health, metrics, alerts: alertStats, environment: { nodeVersion: process.version, platform: process.platform, arch: process.arch, pid: process.pid, uptime: process.uptime() } }; } catch (error) { logger.error('Failed to get diagnostics', { error: error.message }); throw error; } }

    // Ticket stats - Multi-Tenant
    static async getTicketStats(hospitalId) {
        try { const result = await pool.query(`SELECT COUNT(*) FILTER (WHERE status = 'open') as open_count, COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count, COUNT(*) FILTER (WHERE status = 'waiting') as waiting_count, COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved_count, COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('resolved', 'closed')) as critical_open, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h, COUNT(*) as total FROM support_tickets WHERE (hospital_id = $1)`, [hospitalId]); return result.rows[0]; }
        catch (error) { logger.error('Failed to get ticket stats', { error: error.message }); return null; }
    }
}

module.exports = RemoteAccessService;
