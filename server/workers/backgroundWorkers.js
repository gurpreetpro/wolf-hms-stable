/**
 * Wolf HMS Background Workers
 * 
 * Processes async messages for:
 * - Billing: Calculate charges, generate invoices
 * - Notifications: Send SMS, Email, Push
 * - Inventory: Update stock, low-stock alerts
 */

const queue = require('../config/messageQueue');
const { TOPICS } = queue;
const dbPools = require('../config/dbPools');

// ============================================
// BILLING WORKER
// ============================================
const billingWorker = {
    async processCharge(data) {
        const { patient_id, admission_id, charge_type, items, hospital_id, created_by } = data;
        
        console.log(`[BILLING] Processing charge for admission ${admission_id}`);
        
        try {
            // Calculate total
            let totalAmount = 0;
            for (const item of items) {
                totalAmount += (item.quantity || 1) * (item.unit_price || 0);
            }
            
            // Insert pending charges
            for (const item of items) {
                await dbPools.primaryPool.query(`
                    INSERT INTO pending_charges 
                    (hospital_id, patient_id, admission_id, charge_type, description, 
                     quantity, unit_price, total_price, source_table, source_id, 
                     status, created_by, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending', $11, NOW())
                `, [
                    hospital_id, patient_id, admission_id, charge_type, item.description,
                    item.quantity || 1, item.unit_price, (item.quantity || 1) * item.unit_price,
                    item.source_table || 'manual', item.source_id || null, created_by
                ]);
            }
            
            console.log(`[BILLING] Added ${items.length} charges totaling ${totalAmount}`);
            
            // Emit Socket event for real-time update
            if (global.io) {
                global.io.emit('billing_update', {
                    type: 'new_charges',
                    admission_id,
                    total: totalAmount,
                    count: items.length
                });
            }
            
            return { success: true, total: totalAmount };
        } catch (error) {
            console.error('[BILLING] Error:', error.message);
            throw error;
        }
    },

    async generateInvoice(data) {
        const { admission_id, hospital_id, generated_by } = data;
        
        console.log(`[BILLING] Generating invoice for admission ${admission_id}`);
        
        try {
            // Get pending charges
            const chargesResult = await dbPools.primaryPool.query(`
                SELECT SUM(total_price) as total 
                FROM pending_charges 
                WHERE admission_id = $1 AND status = 'Pending'
            `, [admission_id]);
            
            const totalAmount = chargesResult.rows[0]?.total || 0;
            
            // Create invoice
            const invoiceResult = await dbPools.primaryPool.query(`
                INSERT INTO invoices (admission_id, total_amount, status, generated_by, generated_at, hospital_id)
                VALUES ($1, $2, 'Pending', $3, NOW(), $4)
                RETURNING id
            `, [admission_id, totalAmount, generated_by, hospital_id]);
            
            const invoiceId = invoiceResult.rows[0].id;
            
            // Update charges with invoice_id
            await dbPools.primaryPool.query(`
                UPDATE pending_charges 
                SET invoice_id = $1, status = 'Invoiced' 
                WHERE admission_id = $2 AND status = 'Pending'
            `, [invoiceId, admission_id]);
            
            console.log(`[BILLING] Invoice #${invoiceId} created: ${totalAmount}`);
            
            return { success: true, invoiceId, total: totalAmount };
        } catch (error) {
            console.error('[BILLING] Invoice error:', error.message);
            throw error;
        }
    }
};

// ============================================
// NOTIFICATION WORKER
// ============================================
const notificationWorker = {
    async send(data) {
        const { type, recipient, message, priority, hospital_id } = data;
        
        console.log(`[NOTIFY] Sending ${type} to ${recipient}`);
        
        try {
            switch (type) {
                case 'sms':
                    // TODO: Integrate with SMS provider (Twilio, MSG91)
                    console.log(`[SMS] To: ${recipient}, Message: ${message}`);
                    break;
                    
                case 'email':
                    // TODO: Integrate with email provider (SendGrid, SES)
                    console.log(`[EMAIL] To: ${recipient}, Subject: ${data.subject}`);
                    break;
                    
                case 'push':
                    // Socket.IO push notification
                    if (global.io) {
                        global.io.emit('notification', {
                            type: priority || 'info',
                            message,
                            timestamp: new Date()
                        });
                    }
                    break;
                    
                case 'emergency':
                    // Emergency broadcast to all connected clients
                    if (global.io) {
                        global.io.emit('emergency_broadcast', {
                            message,
                            code: data.code,
                            location: data.location,
                            timestamp: new Date()
                        });
                    }
                    console.log(`[EMERGENCY] ${data.code}: ${message}`);
                    break;
            }
            
            // Log notification
            await dbPools.primaryPool.query(`
                INSERT INTO access_logs (gate_id, plate_number, vehicle_type, access_granted, timestamp)
                VALUES ('NOTIFY', $1, $2, true, NOW())
            `, [recipient, type]).catch(() => {}); // Ignore if table doesn't have right schema
            
            return { success: true };
        } catch (error) {
            console.error('[NOTIFY] Error:', error.message);
            throw error;
        }
    }
};

// ============================================
// INVENTORY WORKER
// ============================================
const inventoryWorker = {
    async updateStock(data) {
        const { item_id, quantity_change, reason, hospital_id, updated_by } = data;
        
        console.log(`[INVENTORY] Updating stock for item ${item_id}: ${quantity_change}`);
        
        try {
            // Update inventory
            await dbPools.primaryPool.query(`
                UPDATE inventory_items 
                SET quantity_on_hand = quantity_on_hand + $1 
                WHERE id = $2 AND hospital_id = $3
            `, [quantity_change, item_id, hospital_id]);
            
            // Log stock change
            await dbPools.primaryPool.query(`
                INSERT INTO drug_logs (drug_id, quantity, type, reason, created_by, hospital_id)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [item_id, Math.abs(quantity_change), quantity_change > 0 ? 'IN' : 'OUT', reason, updated_by, hospital_id])
                .catch(() => {}); // Ignore if schema differs
            
            // Check low stock
            const stockResult = await dbPools.primaryPool.query(`
                SELECT name, quantity_on_hand, reorder_level 
                FROM inventory_items 
                WHERE id = $1
            `, [item_id]);
            
            const item = stockResult.rows[0];
            if (item && item.quantity_on_hand <= (item.reorder_level || 10)) {
                // Queue low stock alert
                await queue.publish(TOPICS.NOTIFICATIONS, {
                    type: 'push',
                    priority: 'warning',
                    message: `Low stock alert: ${item.name} (${item.quantity_on_hand} remaining)`
                });
            }
            
            return { success: true };
        } catch (error) {
            console.error('[INVENTORY] Error:', error.message);
            throw error;
        }
    }
};

// ============================================
// REGISTER WORKERS
// ============================================
function registerWorkers() {
    console.log('[WORKERS] Registering background workers...');
    
    // Billing topic
    queue.subscribe(TOPICS.BILLING, async (data) => {
        switch (data.action) {
            case 'process_charge':
                return billingWorker.processCharge(data);
            case 'generate_invoice':
                return billingWorker.generateInvoice(data);
            default:
                console.warn('[BILLING] Unknown action:', data.action);
        }
    });
    
    // Notifications topic
    queue.subscribe(TOPICS.NOTIFICATIONS, async (data) => {
        return notificationWorker.send(data);
    });
    
    // Inventory topic  
    queue.subscribe(TOPICS.INVENTORY, async (data) => {
        switch (data.action) {
            case 'update_stock':
                return inventoryWorker.updateStock(data);
            default:
                console.warn('[INVENTORY] Unknown action:', data.action);
        }
    });
    
    console.log('[WORKERS] All workers registered');
}

module.exports = {
    registerWorkers,
    billingWorker,
    notificationWorker,
    inventoryWorker
};
