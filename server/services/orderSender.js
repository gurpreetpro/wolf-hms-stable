/**
 * Order Sender Service
 * Sends pending lab orders to connected instruments
 * Handles bidirectional order sync
 */

const pool = require('../config/db');
const { buildASTMMessage } = require('../lib/astm-parser');
const { buildORUMessage, wrapMLLP } = require('../lib/hl7-parser');

class OrderSender {
    constructor() {
        this.pendingOrders = new Map(); // instrumentId -> [orders]
    }

    /**
     * Get pending orders for an instrument
     * @param {number} instrumentId - Instrument to get orders for
     * @returns {Array} List of pending orders
     */
    async getPendingOrders(instrumentId) {
        // Get instrument config to determine test types it can handle
        const instrument = await pool.query(`
            SELECT i.*, d.category, d.field_mappings
            FROM lab_instruments i
            LEFT JOIN instrument_drivers d ON i.driver_id = d.id
            WHERE i.id = $1 AND i.is_active = true
        `, [instrumentId]);

        if (instrument.rows.length === 0) {
            return [];
        }

        const inst = instrument.rows[0];

        // Get pending lab requests for tests this instrument can process
        const orders = await pool.query(`
            SELECT 
                lr.id,
                lr.barcode,
                lr.patient_id,
                lr.admission_id,
                ltt.name as test_name,
                ltt.code as test_code,
                ltt.category,
                p.name as patient_name,
                p.gender,
                p.dob,
                p.phone as patient_phone,
                lr.created_at as order_date
            FROM lab_requests lr
            JOIN lab_test_types ltt ON lr.test_type_id = ltt.id
            LEFT JOIN patients p ON lr.patient_id = p.id
            WHERE lr.status IN ('Pending', 'Sample Collected')
            AND ltt.category = $1
            AND lr.barcode IS NOT NULL
            ORDER BY lr.priority DESC, lr.created_at ASC
            LIMIT 50
        `, [inst.category || 'general']);

        return orders.rows;
    }

    /**
     * Build order message for instrument
     * @param {object} order - Lab request order
     * @param {string} protocol - ASTM or HL7
     * @returns {string} Formatted message
     */
    buildOrderMessage(order, protocol = 'ASTM_E1394') {
        if (protocol.includes('HL7')) {
            return this.buildHL7Order(order);
        } else {
            return this.buildASTMOrder(order);
        }
    }

    /**
     * Build ASTM order message
     */
    buildASTMOrder(order) {
        const messageData = {
            header: {
                senderName: 'WOLF_HMS',
                receiverId: 'ANALYZER'
            },
            patients: [{
                patientId: order.patient_id?.toString() || '',
                name: order.patient_name || 'Unknown',
                birthdate: order.dob ? new Date(order.dob).toISOString().slice(0, 10).replace(/-/g, '') : '',
                sex: order.gender?.charAt(0)?.toUpperCase() || 'U'
            }],
            orders: [{
                specimenId: order.barcode || order.id.toString(),
                testCode: order.test_code || order.test_name?.substring(0, 10) || '',
                priority: 'R', // Routine
                collectionDateTime: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
            }]
        };

        return buildASTMMessage(messageData);
    }

    /**
     * Build HL7 ORM (Order) message
     */
    buildHL7Order(order) {
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
        const messageId = `WOLF${Date.now()}`;

        const segments = [];

        // MSH - Message Header
        segments.push(`MSH|^~\\&|WOLF_HMS|HOSPITAL|LAB_ANALYZER|LAB|${timestamp}||ORM^O01|${messageId}|P|2.5`);

        // PID - Patient Identification
        const patientName = (order.patient_name || 'Unknown').split(' ');
        const lastName = patientName[patientName.length - 1] || 'Unknown';
        const firstName = patientName.slice(0, -1).join(' ') || '';
        const dob = order.dob ? new Date(order.dob).toISOString().slice(0, 10).replace(/-/g, '') : '';
        segments.push(`PID|1||${order.patient_id || ''}^^^WOLF||${lastName}^${firstName}||${dob}|${order.gender?.charAt(0) || 'U'}`);

        // ORC - Common Order
        segments.push(`ORC|NW|${order.id}|${order.barcode || order.id}||SC|||${timestamp}|||||||WOLF_HMS`);

        // OBR - Observation Request
        segments.push(`OBR|1|${order.id}|${order.barcode || order.id}|${order.test_code || ''}^${order.test_name || ''}|||${timestamp}|||||||${timestamp}||||||||||F`);

        const message = segments.join('\r');
        return wrapMLLP(message);
    }

    /**
     * Send orders to instrument connection
     * @param {object} connection - Active instrument connection
     * @param {Array} orders - List of orders to send
     */
    async sendOrders(connection, orders) {
        const results = [];

        for (const order of orders) {
            try {
                const message = this.buildOrderMessage(order, connection.protocol || 'ASTM_E1394');

                await connection.send(message);

                // Update order status
                await pool.query(`
                    UPDATE lab_requests 
                    SET status = 'Sent to Analyzer', updated_at = NOW()
                    WHERE id = $1
                `, [order.id]);

                results.push({ orderId: order.id, status: 'sent' });
                console.log(`📤 Order ${order.id} sent to instrument`);

            } catch (error) {
                console.error(`Failed to send order ${order.id}:`, error);
                results.push({ orderId: order.id, status: 'failed', error: error.message });
            }
        }

        return results;
    }

    /**
     * Sync pending orders with connected instruments
     * @param {Map} activeConnections - Map of active instrument connections
     */
    async syncOrders(activeConnections) {
        const syncResults = [];

        for (const [instrumentId, connection] of activeConnections) {
            try {
                // Check if instrument supports bidirectional
                const inst = await pool.query(
                    'SELECT is_bidirectional, protocol FROM lab_instruments WHERE id = $1',
                    [instrumentId]
                );

                if (inst.rows.length === 0 || !inst.rows[0].is_bidirectional) {
                    continue;
                }

                const pendingOrders = await this.getPendingOrders(instrumentId);

                if (pendingOrders.length > 0) {
                    const results = await this.sendOrders(connection, pendingOrders);
                    syncResults.push({
                        instrumentId,
                        ordersSent: results.filter(r => r.status === 'sent').length,
                        ordersFailed: results.filter(r => r.status === 'failed').length
                    });
                }

            } catch (error) {
                console.error(`Order sync failed for instrument ${instrumentId}:`, error);
                syncResults.push({
                    instrumentId,
                    error: error.message
                });
            }
        }

        return syncResults;
    }

    /**
     * Get order sync statistics
     */
    async getStats() {
        const stats = await pool.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM lab_requests
            WHERE created_at > NOW() - INTERVAL '24 hours'
            GROUP BY status
        `);

        const byStatus = {};
        stats.rows.forEach(row => {
            byStatus[row.status] = parseInt(row.count);
        });

        return {
            pending: byStatus['Pending'] || 0,
            sampleCollected: byStatus['Sample Collected'] || 0,
            sentToAnalyzer: byStatus['Sent to Analyzer'] || 0,
            inProgress: byStatus['In Progress'] || 0,
            completed: byStatus['Completed'] || 0
        };
    }
}

module.exports = { OrderSender };
