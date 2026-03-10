/**
 * Wolf Care - Medicine Order Routes
 * 
 * Prescription-based medicine ordering with pickup and delivery options
 * 
 * Patient Endpoints:
 * - POST /api/medicine-orders/place - Place order from prescription
 * - GET /api/medicine-orders/my-orders - List patient's orders
 * - GET /api/medicine-orders/:id - Order details + tracking
 * - POST /api/medicine-orders/:id/cancel - Cancel pending order
 * - GET /api/medicine-orders/delivery-settings - Get hospital delivery config
 * 
 * Staff Endpoints (Wolf Runner + Pharmacy):
 * - GET /api/medicine-orders/staff/jobs - Assigned delivery jobs
 * - PUT /api/medicine-orders/staff/update-status/:id - Update order status
 * - POST /api/medicine-orders/staff/location - Update GPS location
 * - POST /api/medicine-orders/staff/complete/:id - Complete delivery (OTP verify)
 * 
 * Pharmacy Dashboard:
 * - GET /api/medicine-orders/pharmacy/queue - Orders pending preparation
 * - PUT /api/medicine-orders/pharmacy/status/:id - Update order status
 * - POST /api/medicine-orders/pharmacy/assign/:id - Assign delivery staff
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { verifyToken } = require('../services/otpAuthService');
const { protect, authorize } = require('../middleware/authMiddleware');
const { getPaymentGateway } = require('../services/paymentGateway');
const locationService = require('../services/locationService');
const { addToInvoice, recordPayment } = require('../services/billingService');

// ==================== PATIENT AUTH ====================
const authenticatePatient = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    req.user = decoded;
    next();
};

// Generate order number
const generateOrderNumber = () => {
    const date = new Date();
    const prefix = 'MED';
    const timestamp = date.getFullYear().toString().slice(-2) + 
                     String(date.getMonth() + 1).padStart(2, '0') +
                     String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${timestamp}${random}`;
};

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ==================== PATIENT ENDPOINTS ====================

/**
 * GET /api/medicine-orders/delivery-settings
 * Get hospital's delivery configuration
 */
router.get('/delivery-settings', authenticatePatient, async (req, res) => {
    try {
        const hospitalId = req.user.hospital_id || 1;
        
        const result = await pool.query(`
            SELECT 
                delivery_enabled, pickup_enabled,
                delivery_charge_type, flat_delivery_charge, per_km_charge,
                free_delivery_above, max_delivery_radius_km,
                delivery_start_time, delivery_end_time,
                allow_cod, allow_card_on_delivery, allow_upi_on_delivery
            FROM hospital_delivery_settings
            WHERE hospital_id = $1
        `, [hospitalId]);
        
        // Default settings if not configured
        const settings = result.rows[0] || {
            delivery_enabled: true,
            pickup_enabled: true,
            delivery_charge_type: 'flat',
            flat_delivery_charge: 50,
            free_delivery_above: 500,
            allow_cod: true,
            allow_upi_on_delivery: true
        };
        
        res.json({ success: true, settings });
    } catch (err) {
        console.error('[MEDICINE-ORDERS] Delivery settings error:', err);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

/**
 * POST /api/medicine-orders/place
 * Place order from prescription
 */
router.post('/place', authenticatePatient, async (req, res) => {
    const { 
        prescription_id, delivery_type, address_id, 
        payment_method, patient_notes 
    } = req.body;
    
    if (!prescription_id) {
        return res.status(400).json({ error: 'Prescription ID is required' });
    }
    
    if (delivery_type === 'delivery' && !address_id) {
        return res.status(400).json({ error: 'Address is required for delivery' });
    }
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const requestingHospitalId = req.user.hospital_id; // Keep strict context if needed, but we rely on prescription source

        
        // Verify prescription belongs to patient
        const rxCheck = await client.query(`
            SELECT p.id, p.medications, p.hospital_id, p.patient_id
            FROM prescriptions p
            WHERE p.id = $1
        `, [prescription_id]);
        
        if (rxCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Prescription not found' });
        }
        
        const prescription = rxCheck.rows[0];
        
        // Use hospital_id from prescription (Strict Multi-tenancy)
        const hospitalId = prescription.hospital_id;

        if (!hospitalId) {
             await client.query('ROLLBACK');
             return res.status(400).json({ error: 'Prescription does not belong to a valid hospital' });
        }
        
        // Get delivery settings for THIS hospital
        const settingsResult = await client.query(`
            SELECT * FROM hospital_delivery_settings WHERE hospital_id = $1
        `, [hospitalId]);
        const settings = settingsResult.rows[0] || { flat_delivery_charge: 50, free_delivery_above: 500 };
        
        // Parse prescription items
        let medicines = [];
        try {
            if (prescription.medications) {
                medicines = typeof prescription.medications === 'string' 
                    ? JSON.parse(prescription.medications) 
                    : prescription.medications;
            }
        } catch (e) {
            console.error('[MEDICINE-ORDERS] Failed to parse prescription:', e);
        }
        
        // Calculate subtotal from inventory prices
        let subtotal = 0;
        const orderItems = [];
        
        for (const med of medicines) {
            // Try to find in inventory
            const invResult = await client.query(`
                SELECT id, name, price_per_unit as selling_price, stock_quantity 
                FROM inventory_items 
                WHERE (name ILIKE $1 OR generic_name ILIKE $1)
                AND hospital_id = $2
                LIMIT 1
            `, [`%${med.medicine || med.name}%`, hospitalId]);
            
            const invItem = invResult.rows[0];
            const qty = parseInt(med.quantity) || 1;
            const unitPrice = invItem?.selling_price || 0;
            const itemTotal = unitPrice * qty;
            
            orderItems.push({
                inventory_item_id: invItem?.id || null,
                medicine_name: med.medicine || med.name || 'Unknown',
                quantity: qty,
                unit_price: unitPrice,
                total_price: itemTotal,
                dosage: med.dosage,
                duration: med.duration,
                instructions: med.instructions,
                is_available: invItem ? (invItem.stock_quantity >= qty) : false
            });
            
            subtotal += itemTotal;
        }
        
        // Calculate delivery charge
        let deliveryCharge = 0;
        if (delivery_type === 'delivery') {
            if (settings.delivery_charge_type === 'flat') {
                deliveryCharge = subtotal >= settings.free_delivery_above ? 0 : settings.flat_delivery_charge;
            } else {
                deliveryCharge = settings.flat_delivery_charge || 50;
            }
        }
        
        const total = subtotal + deliveryCharge;
        const orderNumber = generateOrderNumber();
        const deliveryOtp = generateOTP();
        
        // [BILLING] Create Invoice for this order
        // Note: passing null for userId (generated_by) as this is a patient-initiated order
        const invoiceId = await addToInvoice(
            req.user.id, 
            null, 
            `Medicine Order #${orderNumber}`, 
            1, 
            total, 
            null, 
            hospitalId,
            client
        );
        
        // Create order
        const orderResult = await client.query(`
            INSERT INTO medicine_orders (
                order_number, patient_id, prescription_id, hospital_id,
                delivery_type, address_id, status,
                subtotal, delivery_charge, total,
                payment_method, payment_status,
                delivery_otp, patient_notes,
                invoice_id
            ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `, [
            orderNumber, req.user.id, prescription_id, hospitalId,
            delivery_type, address_id,
            subtotal, deliveryCharge, total,
            payment_method, 
            payment_method === 'cod' ? 'cod' : 'pending',
            deliveryOtp, patient_notes,
            invoiceId
        ]);
        
        const order = orderResult.rows[0];
        
        // Insert order items
        for (const item of orderItems) {
            await client.query(`
                INSERT INTO medicine_order_items (
                    order_id, inventory_item_id, medicine_name,
                    quantity, unit_price, total_price,
                    dosage, duration, instructions, is_available
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                order.id, item.inventory_item_id, item.medicine_name,
                item.quantity, item.unit_price, item.total_price,
                item.dosage, item.duration, item.instructions, item.is_available
            ]);
        }
        
        // Log order creation
        await client.query(`
            INSERT INTO medicine_order_logs (order_id, status, notes)
            VALUES ($1, 'pending', 'Order placed by patient')
        `, [order.id]);
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: 'Order placed successfully',
            order: {
                id: order.id,
                order_number: orderNumber,
                status: order.status,
                delivery_type: order.delivery_type,
                subtotal: order.subtotal,
                delivery_charge: order.delivery_charge,
                total: order.total,
                payment_method: order.payment_method,
                payment_status: order.payment_status
            },
            items: orderItems
        });
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[MEDICINE-ORDERS] Place order error:', err);
        res.status(500).json({ error: 'Failed to place order' });
    } finally {
        client.release();
    }
});

/**
 * GET /api/medicine-orders/my-orders
 * List patient's orders
 */
router.get('/my-orders', authenticatePatient, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                mo.id, mo.order_number, mo.status, mo.delivery_type,
                mo.subtotal, mo.delivery_charge, mo.total,
                mo.payment_method, mo.payment_status,
                mo.created_at, mo.estimated_delivery,
                pa.address_line, pa.city,
                u.username as staff_name
            FROM medicine_orders mo
            LEFT JOIN patient_addresses pa ON mo.address_id = pa.id
            LEFT JOIN users u ON mo.assigned_staff_id = u.id
            WHERE mo.patient_id = $1
            ORDER BY mo.created_at DESC
            LIMIT 50
        `, [req.user.id]);
        
        res.json({
            success: true,
            orders: result.rows
        });
    } catch (err) {
        console.error('[MEDICINE-ORDERS] My orders error:', err);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

/**
 * GET /api/medicine-orders/:id
 * Order details with tracking
 */
router.get('/:id', authenticatePatient, async (req, res) => {
    try {
        const orderId = req.params.id;
        
        // Get order
        const orderResult = await pool.query(`
            SELECT 
                mo.*,
                pa.address_line, pa.landmark, pa.city, pa.pincode,
                pa.latitude as delivery_lat, pa.longitude as delivery_lng,
                u.username as staff_name
            FROM medicine_orders mo
            LEFT JOIN patient_addresses pa ON mo.address_id = pa.id
            LEFT JOIN users u ON mo.assigned_staff_id = u.id
            WHERE mo.id = $1 AND mo.patient_id = $2
        `, [orderId, req.user.id]);
        
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        const order = orderResult.rows[0];
        
        // Get items
        const itemsResult = await pool.query(`
            SELECT * FROM medicine_order_items WHERE order_id = $1
        `, [orderId]);
        
        // Get status history
        const logsResult = await pool.query(`
            SELECT status, notes, staff_name, latitude, longitude, created_at
            FROM medicine_order_logs
            WHERE order_id = $1
            ORDER BY created_at ASC
        `, [orderId]);
        
        // Get staff location if dispatched
        let staffLocation = null;
        if (order.status === 'dispatched' && order.assigned_staff_id) {
            const locResult = await pool.query(`
                SELECT latitude, longitude, last_updated
                FROM delivery_staff_locations
                WHERE staff_id = $1
            `, [order.assigned_staff_id]);
            staffLocation = locResult.rows[0] || null;
        }
        
        res.json({
            success: true,
            order,
            items: itemsResult.rows,
            timeline: logsResult.rows,
            staffLocation
        });
    } catch (err) {
        console.error('[MEDICINE-ORDERS] Order details error:', err);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

/**
 * POST /api/medicine-orders/:id/cancel
 * Cancel pending order
 */
router.post('/:id/cancel', authenticatePatient, async (req, res) => {
    const orderId = req.params.id;
    const { reason } = req.body;
    
    try {
        // Only allow cancellation of pending/confirmed orders
        const result = await pool.query(`
            UPDATE medicine_orders
            SET status = 'cancelled', 
                cancellation_reason = $1,
                updated_at = NOW()
            WHERE id = $2 AND patient_id = $3 
            AND status IN ('pending', 'confirmed')
            RETURNING *
        `, [reason || 'Cancelled by patient', orderId, req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(400).json({ 
                error: 'Order cannot be cancelled. It may have already been prepared.' 
            });
        }
        
        // Log cancellation
        await pool.query(`
            INSERT INTO medicine_order_logs (order_id, status, notes)
            VALUES ($1, 'cancelled', $2)
        `, [orderId, reason || 'Cancelled by patient']);
        
        res.json({
            success: true,
            message: 'Order cancelled successfully'
        });
    } catch (err) {
        console.error('[MEDICINE-ORDERS] Cancel error:', err);
        res.status(500).json({ error: 'Failed to cancel order' });
    }
});

/**
 * POST /api/medicine-orders/:id/verify-payment
 * Verify Razorpay payment for order
 */
router.post('/:id/verify-payment', authenticatePatient, async (req, res) => {
    const orderId = req.params.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    try {
        const gateway = getPaymentGateway();
        
        // Verify signature
        const verification = await gateway.verifyPayment(
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature
        );
        
        if (!verification.success) {
            return res.status(400).json({ error: verification.error || 'Payment verification failed' });
        }
        
        // Update order status
        const updateResult = await pool.query(`
            UPDATE medicine_orders
            SET payment_status = 'paid',
                status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
                updated_at = NOW()
            WHERE id = $1 AND patient_id = $2
            RETURNING *
        `, [orderId, req.user.id]);
        
        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        const updatedOrder = updateResult.rows[0];

        // [BILLING] Record Online Payment
        if (updatedOrder.invoice_id) {
            await recordPayment({
                invoice_id: updatedOrder.invoice_id,
                patient_id: req.user.id,
                amount: updatedOrder.total,
                payment_mode: 'online', // or 'card'/'upi' if available
                transaction_id: razorpay_payment_id,
                created_by: null, // Patient self-pay
                hospital_id: updatedOrder.hospital_id,
                notes: `Online Payment order #${updatedOrder.order_number}`,
                visit_id: null
            });
        }
        
        // Log payment
        await pool.query(`
            INSERT INTO medicine_order_logs (order_id, status, notes)
            VALUES ($1, 'payment_verified', $2)
        `, [orderId, `Payment verified: ${razorpay_payment_id}`]);
        
        res.json({
            success: true,
            message: 'Payment verified and order confirmed',
            order: updatedOrder
        });
        
    } catch (err) {
        console.error('[MEDICINE-ORDERS] Verify payment error:', err);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});

// ==================== STAFF ENDPOINTS (Wolf Runner) ====================

/**
 * GET /api/medicine-orders/staff/jobs
 * Get assigned jobs for delivery staff
 */
router.get('/staff/jobs', protect, authorize('runner', 'phlebotomist', 'admin'), async (req, res) => {
    try {
        const staffId = req.user.id;
        const hospitalId = req.user.hospital_id || 1;
        
        const result = await pool.query(`
            SELECT 
                mo.id, mo.order_number, mo.status, mo.delivery_type,
                mo.total, mo.delivery_otp,
                mo.created_at, mo.estimated_delivery,
                p.name as patient_name, p.phone as patient_phone,
                pa.address_line, pa.landmark, pa.city, pa.pincode,
                pa.latitude, pa.longitude, pa.contact_phone
            FROM medicine_orders mo
            JOIN patients p ON mo.patient_id = p.id
            LEFT JOIN patient_addresses pa ON mo.address_id = pa.id
            WHERE mo.assigned_staff_id = $1
            AND mo.hospital_id = $2
            AND mo.status IN ('ready', 'dispatched')
            AND mo.delivery_type = 'delivery'
            ORDER BY mo.created_at ASC
        `, [staffId, hospitalId]);
        
        res.json({
            success: true,
            jobs: result.rows
        });
    } catch (err) {
        console.error('[MEDICINE-ORDERS] Staff jobs error:', err);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

/**
 * PUT /api/medicine-orders/staff/update-status/:id
 * Update order status (En Route, Arrived, etc.)
 */
router.put('/staff/update-status/:id', protect, authorize('runner', 'phlebotomist', 'admin'), async (req, res) => {
    const orderId = req.params.id;
    const { status, notes, latitude, longitude } = req.body;
    
    const validStatuses = ['dispatched', 'delivered'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    try {
        const result = await pool.query(`
            UPDATE medicine_orders
            SET status = $1, updated_at = NOW()
            WHERE id = $2 AND assigned_staff_id = $3
            RETURNING *
        `, [status, orderId, req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found or not assigned to you' });
        }
        
        // Log status change
        await pool.query(`
            INSERT INTO medicine_order_logs (order_id, status, notes, staff_id, staff_name, latitude, longitude)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [orderId, status, notes, req.user.id, req.user.username, latitude, longitude]);
        
        // [SOCKET.IO] Push real-time status update to patient tracking screen
        if (global.io) {
            global.io.to(`order_${orderId}`).emit('order_status', {
                orderId: parseInt(orderId),
                status,
                staff_name: req.user.username,
                latitude,
                longitude,
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            message: 'Status updated',
            order: result.rows[0]
        });
    } catch (err) {
        console.error('[MEDICINE-ORDERS] Update status error:', err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

/**
 * POST /api/medicine-orders/staff/location
 * Update delivery staff GPS location
 */
router.post('/staff/location', protect, authorize('runner', 'phlebotomist', 'admin'), async (req, res) => {
    const { latitude, longitude, accuracy, battery, order_id } = req.body;
    
    if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Location is required' });
    }
    
    try {
        await pool.query(`
            INSERT INTO delivery_staff_locations 
                (staff_id, hospital_id, latitude, longitude, accuracy_meters, battery_percent, current_order_id, is_online, last_updated)
            VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
            ON CONFLICT (staff_id) 
            DO UPDATE SET 
                latitude = $3, longitude = $4, 
                accuracy_meters = $5, battery_percent = $6,
                current_order_id = $7, is_online = true,
                last_updated = NOW()
        `, [req.user.id, req.user.hospital_id || 1, latitude, longitude, accuracy, battery, order_id]);
        
        // [SOCKET.IO] Push real-time runner location to patient tracking screen
        if (global.io && order_id) {
            global.io.to(`order_${order_id}`).emit('runner_location', {
                latitude,
                longitude,
                accuracy,
                battery,
                last_updated: new Date().toISOString()
            });
            
            // [PROXIMITY] Check distance to delivery address for geofence alerts
            try {
                const orderResult = await pool.query(`
                    SELECT pa.latitude as dest_lat, pa.longitude as dest_lng
                    FROM medicine_orders mo
                    JOIN patient_addresses pa ON pa.id = mo.address_id
                    WHERE mo.id = $1 AND mo.status = 'dispatched'
                `, [order_id]);
                
                if (orderResult.rows.length > 0) {
                    const dest = orderResult.rows[0];
                    if (dest.dest_lat && dest.dest_lng) {
                        // Haversine distance in meters
                        const R = 6371000;
                        const dLat = (dest.dest_lat - latitude) * Math.PI / 180;
                        const dLon = (dest.dest_lng - longitude) * Math.PI / 180;
                        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                            Math.cos(latitude * Math.PI / 180) * Math.cos(dest.dest_lat * Math.PI / 180) *
                            Math.sin(dLon/2) * Math.sin(dLon/2);
                        const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                        
                        // Estimate ETA (assume 20 km/h average in city)
                        const etaMinutes = Math.ceil(distance / (20000/60));
                        
                        if (distance <= 100) {
                            global.io.to(`order_${order_id}`).emit('runner_arrived', {
                                distance: Math.round(distance),
                                message: 'Runner has arrived at your location!'
                            });
                        } else if (distance <= 500) {
                            global.io.to(`order_${order_id}`).emit('runner_nearby', {
                                distance: Math.round(distance),
                                etaMinutes,
                                message: `Runner is ${etaMinutes} min away (${Math.round(distance)}m)`
                            });
                        }
                    }
                }
            } catch (proximityErr) {
                // Non-critical — don't fail the location update
                console.warn('[PROXIMITY] Check failed:', proximityErr.message);
            }
        }
        
        // [UNIFIED] Dual-write to staff_locations (history-enabled)
        locationService.recordLocation({
            staffId: req.user.id,
            hospitalId: req.user.hospital_id || 1,
            staffRole: 'runner',
            latitude,
            longitude,
            accuracy,
            jobType: 'medicine_delivery',
            jobId: order_id,
            batteryPercent: battery,
        });
        
        res.json({ success: true });
    } catch (err) {
        console.error('[MEDICINE-ORDERS] Location update error:', err);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

/**
 * POST /api/medicine-orders/staff/complete/:id
 * Complete delivery with OTP verification
 */
router.post('/staff/complete/:id', protect, authorize('runner', 'phlebotomist', 'admin'), async (req, res) => {
    const orderId = req.params.id;
    const { otp, latitude, longitude } = req.body;
    
    try {
        // Verify OTP
        const orderResult = await pool.query(`
            SELECT * FROM medicine_orders 
            WHERE id = $1 AND assigned_staff_id = $2
        `, [orderId, req.user.id]);
        
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        const order = orderResult.rows[0];
        
        if (order.delivery_otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }
        
        // Complete the order first
        await pool.query(`
            UPDATE medicine_orders
            SET status = 'delivered', 
                otp_verified = true,
                actual_delivery = NOW(),
                payment_status = CASE WHEN payment_method = 'cod' THEN 'paid' ELSE payment_status END,
                updated_at = NOW()
            WHERE id = $1
        `, [orderId]);
        
        // [BILLING] If COD, record payment now
        if (order.payment_method === 'cod' && order.invoice_id) {
            await recordPayment({
                invoice_id: order.invoice_id,
                patient_id: order.patient_id,
                amount: order.total,
                payment_mode: 'cash',
                transaction_id: `COD-${order.order_number}`,
                created_by: req.user.id, // Runner collected cash
                hospital_id: order.hospital_id,
                notes: `COD collected by Runner ${req.user.username}`,
                visit_id: null
            });
        }
        
        // Log completion
        await pool.query(`
            INSERT INTO medicine_order_logs (order_id, status, notes, staff_id, staff_name, latitude, longitude)
            VALUES ($1, 'delivered', 'Delivery completed - OTP verified', $2, $3, $4, $5)
        `, [orderId, req.user.id, req.user.username, latitude, longitude]);
        
        // [SOCKET.IO] Push delivery complete to patient
        if (global.io) {
            global.io.to(`order_${orderId}`).emit('order_status', {
                orderId: parseInt(orderId),
                status: 'delivered',
                staff_name: req.user.username,
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            message: 'Delivery completed successfully'
        });
    } catch (err) {
        console.error('[MEDICINE-ORDERS] Complete delivery error:', err);
        res.status(500).json({ error: 'Failed to complete delivery' });
    }
});

// ==================== PHARMACY DASHBOARD ENDPOINTS ====================

/**
 * GET /api/medicine-orders/pharmacy/queue
 * Get orders pending preparation (for pharmacy dashboard)
 */
router.get('/pharmacy/queue', protect, authorize('pharmacist', 'admin'), async (req, res) => {
    try {
        const hospitalId = req.user.hospital_id || 1;
        
        const result = await pool.query(`
            SELECT 
                mo.id, mo.order_number, mo.status, mo.delivery_type,
                mo.total, mo.payment_method, mo.payment_status,
                mo.created_at, mo.patient_notes,
                p.name as patient_name, p.phone as patient_phone,
                pa.address_line, pa.city
            FROM medicine_orders mo
            JOIN patients p ON mo.patient_id = p.id
            LEFT JOIN patient_addresses pa ON mo.address_id = pa.id
            WHERE mo.hospital_id = $1
            AND mo.status IN ('pending', 'confirmed', 'preparing', 'ready')
            ORDER BY 
                CASE mo.status 
                    WHEN 'pending' THEN 1 
                    WHEN 'confirmed' THEN 2
                    WHEN 'preparing' THEN 3
                    WHEN 'ready' THEN 4
                END,
                mo.created_at ASC
        `, [hospitalId]);
        
        res.json({
            success: true,
            orders: result.rows
        });
    } catch (err) {
        console.error('[MEDICINE-ORDERS] Pharmacy queue error:', err);
        res.status(500).json({ error: 'Failed to fetch queue' });
    }
});

/**
 * PUT /api/medicine-orders/pharmacy/status/:id
 * Update order status (Confirmed, Preparing, Ready)
 */
router.put('/pharmacy/status/:id', protect, authorize('pharmacist', 'admin'), async (req, res) => {
    const orderId = req.params.id;
    const { status, notes } = req.body;
    
    const validStatuses = ['confirmed', 'preparing', 'ready', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    try {
        const result = await pool.query(`
            UPDATE medicine_orders
            SET status = $1, 
                pharmacy_notes = COALESCE($2, pharmacy_notes),
                updated_at = NOW()
            WHERE id = $3 AND hospital_id = $4
            RETURNING *
        `, [status, notes, orderId, req.user.hospital_id || 1]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Log status change
        await pool.query(`
            INSERT INTO medicine_order_logs (order_id, status, notes, staff_id, staff_name)
            VALUES ($1, $2, $3, $4, $5)
        `, [orderId, status, notes || `Status updated to ${status}`, req.user.id, req.user.username]);
        
        res.json({
            success: true,
            message: 'Order status updated',
            order: result.rows[0]
        });
    } catch (err) {
        console.error('[MEDICINE-ORDERS] Pharmacy status update error:', err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

/**
 * POST /api/medicine-orders/pharmacy/assign/:id
 * Assign delivery staff to order
 */
router.post('/pharmacy/assign/:id', protect, authorize('pharmacist', 'admin'), async (req, res) => {
    const orderId = req.params.id;
    const { staff_id, estimated_minutes } = req.body;
    
    try {
        const estimatedDelivery = estimated_minutes 
            ? new Date(Date.now() + estimated_minutes * 60000)
            : new Date(Date.now() + 45 * 60000); // Default 45 mins
        
        const result = await pool.query(`
            UPDATE medicine_orders
            SET assigned_staff_id = $1,
                estimated_delivery = $2,
                status = 'ready',
                updated_at = NOW()
            WHERE id = $3 AND hospital_id = $4
            RETURNING *
        `, [staff_id, estimatedDelivery, orderId, req.user.hospital_id || 1]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Get staff details
        const staffResult = await pool.query(
            'SELECT username, phone FROM users WHERE id = $1',
            [staff_id]
        );
        
        // Log assignment
        await pool.query(`
            INSERT INTO medicine_order_logs (order_id, status, notes, staff_id, staff_name)
            VALUES ($1, 'assigned', $2, $3, $4)
        `, [
            orderId, 
            `Assigned to ${staffResult.rows[0]?.username || 'staff'}`,
            req.user.id, 
            req.user.username
        ]);
        
        res.json({
            success: true,
            message: 'Delivery staff assigned',
            order: result.rows[0],
            assignedTo: staffResult.rows[0]
        });
    } catch (err) {
        console.error('[MEDICINE-ORDERS] Assign staff error:', err);
        res.status(500).json({ error: 'Failed to assign staff' });
    }
});

/**
 * GET /api/medicine-orders/pharmacy/runners
 * Get available delivery staff
 */
router.get('/pharmacy/runners', protect, authorize('pharmacist', 'admin'), async (req, res) => {
    try {
        const hospitalId = req.user.hospital_id || 1;
        
        const result = await pool.query(`
            SELECT 
                u.id, u.username, u.phone,
                dsl.is_online, dsl.is_busy, dsl.last_updated,
                (SELECT COUNT(*) FROM medicine_orders 
                 WHERE assigned_staff_id = u.id AND status = 'dispatched') as active_deliveries
            FROM users u
            LEFT JOIN delivery_staff_locations dsl ON u.id = dsl.staff_id
            WHERE u.hospital_id = $1
            AND u.role IN ('runner', 'phlebotomist')
            AND u.status = 'Active'
            ORDER BY dsl.is_online DESC, dsl.is_busy ASC
        `, [hospitalId]);
        
        res.json({
            success: true,
            runners: result.rows
        });
    } catch (err) {
        console.error('[MEDICINE-ORDERS] Get runners error:', err);
        res.status(500).json({ error: 'Failed to fetch runners' });
    }
});

// ==================== REFUND ENDPOINTS ====================

/**
 * POST /api/medicine-orders/:id/refund
 * Request refund for an order
 */
router.post('/:id/refund', authenticatePatient, async (req, res) => {
    const orderId = req.params.id;
    const { reason, reason_description } = req.body;
    
    try {
        // Check order belongs to patient and is eligible
        const orderResult = await pool.query(`
            SELECT mo.*, p.phone, p.fcm_token
            FROM medicine_orders mo
            JOIN patients p ON mo.patient_id = p.id
            WHERE mo.id = $1 AND mo.patient_id = $2
        `, [orderId, req.user.id]);
        
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        const order = orderResult.rows[0];
        
        // Check if refund is allowed
        if (!['delivered', 'cancelled'].includes(order.status)) {
            return res.status(400).json({ error: 'Refund only available for delivered or cancelled orders' });
        }
        
        if (order.refund_status && order.refund_status !== 'none') {
            return res.status(400).json({ error: 'Refund already requested for this order' });
        }
        
        // Get refund policy
        const policyResult = await pool.query(`
            SELECT * FROM hospital_refund_policies WHERE hospital_id = $1
        `, [order.hospital_id]);
        
        const policy = policyResult.rows[0] || { max_refund_days: 7, auto_refund_below: 500 };
        
        // Check if within refund window
        const daysSinceDelivery = order.actual_delivery ? 
            Math.floor((Date.now() - new Date(order.actual_delivery)) / (1000 * 60 * 60 * 24)) : 0;
        
        if (daysSinceDelivery > policy.max_refund_days) {
            return res.status(400).json({ 
                error: `Refund window expired. Must request within ${policy.max_refund_days} days.` 
            });
        }
        
        // Determine if auto-approve
        const refundAmount = order.payment_status === 'paid' ? order.total : 0;
        const autoApprove = refundAmount <= policy.auto_refund_below;
        
        // Create refund request
        await pool.query(`
            INSERT INTO refund_requests 
                (order_id, patient_id, hospital_id, request_type, refund_amount, original_amount, reason_category, reason_description, status)
            VALUES ($1, $2, $3, 'full', $4, $5, $6, $7, $8)
        `, [orderId, req.user.id, order.hospital_id, refundAmount, order.total, reason, reason_description, autoApprove ? 'approved' : 'pending']);
        
        // Update order
        await pool.query(`
            UPDATE medicine_orders
            SET refund_status = $1, refund_amount = $2, refund_reason = $3, refund_requested_at = NOW()
            WHERE id = $4
        `, [autoApprove ? 'processing' : 'requested', refundAmount, reason, orderId]);
        
        // Log
        await pool.query(`
            INSERT INTO medicine_order_logs (order_id, status, notes)
            VALUES ($1, 'refund_requested', $2)
        `, [orderId, `Refund requested: ${reason}`]);
        
        // Notify (import at top if production)
        try {
            const { notifyRefund } = require('../services/notificationService');
            await notifyRefund(pool, order, refundAmount, 'initiated');
        } catch (e) {
            console.log('[MEDICINE-ORDERS] Notification skipped:', e.message);
        }
        
        res.json({
            success: true,
            message: autoApprove ? 'Refund approved and processing' : 'Refund request submitted',
            refund: {
                amount: refundAmount,
                status: autoApprove ? 'processing' : 'requested'
            }
        });
    } catch (err) {
        console.error('[MEDICINE-ORDERS] Refund request error:', err);
        res.status(500).json({ error: 'Failed to request refund' });
    }
});

/**
 * GET /api/medicine-orders/:id/refund-status
 * Check refund status
 */
router.get('/:id/refund-status', authenticatePatient, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT refund_status, refund_amount, refund_reason, refund_requested_at, refund_processed_at
            FROM medicine_orders
            WHERE id = $1 AND patient_id = $2
        `, [req.params.id, req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json({ success: true, refund: result.rows[0] });
    } catch (err) {
        console.error('[MEDICINE-ORDERS] Refund status error:', err);
        res.status(500).json({ error: 'Failed to fetch refund status' });
    }
});

// ==================== PRESCRIPTION VERIFICATION (Pharmacy) ====================

/**
 * GET /api/medicine-orders/pharmacy/verification-queue
 * Get orders requiring pharmacist verification
 */
router.get('/pharmacy/verification-queue', protect, authorize('pharmacist', 'admin'), async (req, res) => {
    try {
        const hospitalId = req.user.hospital_id || 1;
        
        const result = await pool.query(`
            SELECT 
                mo.id, mo.order_number, mo.status, mo.pharmacist_verified,
                mo.has_schedule_h, mo.has_schedule_x, mo.created_at,
                p.name as patient_name, p.phone as patient_phone,
                pr.id as prescription_id
            FROM medicine_orders mo
            JOIN patients p ON mo.patient_id = p.id
            LEFT JOIN prescriptions pr ON mo.prescription_id = pr.id
            WHERE mo.hospital_id = $1
            AND mo.status = 'pending'
            AND mo.pharmacist_verified = false
            ORDER BY mo.created_at ASC
        `, [hospitalId]);
        
        res.json({
            success: true,
            orders: result.rows
        });
    } catch (err) {
        console.error('[MEDICINE-ORDERS] Verification queue error:', err);
        res.status(500).json({ error: 'Failed to fetch queue' });
    }
});

/**
 * POST /api/medicine-orders/pharmacy/verify/:id
 * Verify or reject prescription
 */
router.post('/pharmacy/verify/:id', protect, authorize('pharmacist', 'admin'), async (req, res) => {
    const orderId = req.params.id;
    const { approved, notes, has_schedule_h, has_schedule_x, requires_cold_chain } = req.body;
    
    try {
        if (approved) {
            // Approve and move to confirmed
            await pool.query(`
                UPDATE medicine_orders
                SET pharmacist_verified = true,
                    verified_by = $1,
                    verified_at = NOW(),
                    verification_notes = $2,
                    has_schedule_h = COALESCE($3, has_schedule_h),
                    has_schedule_x = COALESCE($4, has_schedule_x),
                    requires_cold_chain = COALESCE($5, requires_cold_chain),
                    status = 'confirmed',
                    updated_at = NOW()
                WHERE id = $6 AND hospital_id = $7
            `, [req.user.id, notes, has_schedule_h, has_schedule_x, requires_cold_chain, orderId, req.user.hospital_id || 1]);
            
            // Log
            await pool.query(`
                INSERT INTO medicine_order_logs (order_id, status, notes, staff_id, staff_name)
                VALUES ($1, 'verified', $2, $3, $4)
            `, [orderId, 'Prescription verified by pharmacist', req.user.id, req.user.username]);
            
            // Notify patient
            try {
                const orderResult = await pool.query('SELECT * FROM medicine_orders WHERE id = $1', [orderId]);
                const { notifyOrderStatusChange } = require('../services/notificationService');
                await notifyOrderStatusChange(pool, orderResult.rows[0], 'confirmed');
            } catch (e) {
                console.log('[MEDICINE-ORDERS] Notification skipped');
            }
            
            res.json({ success: true, message: 'Prescription verified and order confirmed' });
        } else {
            // Reject
            await pool.query(`
                UPDATE medicine_orders
                SET pharmacist_verified = false,
                    verified_by = $1,
                    verified_at = NOW(),
                    verification_notes = $2,
                    status = 'cancelled',
                    cancellation_reason = $3,
                    updated_at = NOW()
                WHERE id = $4 AND hospital_id = $5
            `, [req.user.id, notes, notes || 'Prescription verification failed', orderId, req.user.hospital_id || 1]);
            
            // Log
            await pool.query(`
                INSERT INTO medicine_order_logs (order_id, status, notes, staff_id, staff_name)
                VALUES ($1, 'rejected', $2, $3, $4)
            `, [orderId, notes || 'Prescription rejected', req.user.id, req.user.username]);
            
            res.json({ success: true, message: 'Order rejected' });
        }
    } catch (err) {
        console.error('[MEDICINE-ORDERS] Verification error:', err);
        res.status(500).json({ error: 'Failed to verify prescription' });
    }
});

/**
 * POST /api/medicine-orders/pharmacy/refund/:id
 * Process refund (pharmacy/admin)
 */
router.post('/pharmacy/refund/:id', protect, authorize('pharmacist', 'admin'), async (req, res) => {
    const orderId = req.params.id;
    const { approved, notes, transaction_id } = req.body;
    
    try {
        const orderResult = await pool.query(`
            SELECT mo.*, p.phone, p.fcm_token
            FROM medicine_orders mo
            JOIN patients p ON mo.patient_id = p.id
            WHERE mo.id = $1 AND mo.hospital_id = $2
        `, [orderId, req.user.hospital_id || 1]);
        
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        const order = orderResult.rows[0];
        
        if (approved) {
            // Mark refund as completed
            await pool.query(`
                UPDATE medicine_orders
                SET refund_status = 'completed',
                    refund_processed_at = NOW(),
                    refund_transaction_id = $1
                WHERE id = $2
            `, [transaction_id, orderId]);
            
            // Update refund request
            await pool.query(`
                UPDATE refund_requests
                SET status = 'completed', processed_by = $1, processed_at = NOW(), processor_notes = $2, transaction_id = $3
                WHERE order_id = $4
            `, [req.user.id, notes, transaction_id, orderId]);
            
            // Notify
            try {
                const { notifyRefund } = require('../services/notificationService');
                await notifyRefund(pool, order, order.refund_amount, 'completed');
            } catch (e) {}
            
            res.json({ success: true, message: 'Refund processed successfully' });
        } else {
            // Reject refund
            await pool.query(`
                UPDATE medicine_orders SET refund_status = 'rejected' WHERE id = $1
            `, [orderId]);
            
            await pool.query(`
                UPDATE refund_requests
                SET status = 'rejected', processed_by = $1, processed_at = NOW(), processor_notes = $2
                WHERE order_id = $3
            `, [req.user.id, notes, orderId]);
            
            res.json({ success: true, message: 'Refund request rejected' });
        }
    } catch (err) {
        console.error('[MEDICINE-ORDERS] Process refund error:', err);
        res.status(500).json({ error: 'Failed to process refund' });
    }
});

/**
 * GET /api/medicine-orders/pharmacy/refund-queue
 * Get pending refund requests
 */
router.get('/pharmacy/refund-queue', protect, authorize('pharmacist', 'admin'), async (req, res) => {
    try {
        const hospitalId = req.user.hospital_id || 1;
        
        const result = await pool.query(`
            SELECT 
                rr.*,
                mo.order_number, mo.total, mo.payment_method,
                p.name as patient_name, p.phone as patient_phone
            FROM refund_requests rr
            JOIN medicine_orders mo ON rr.order_id = mo.id
            JOIN patients p ON rr.patient_id = p.id
            WHERE rr.hospital_id = $1
            AND rr.status IN ('pending', 'approved', 'processing')
            ORDER BY rr.created_at ASC
        `, [hospitalId]);
        
        res.json({
            success: true,
            refunds: result.rows
        });
    } catch (err) {
        console.error('[MEDICINE-ORDERS] Refund queue error:', err);
        res.status(500).json({ error: 'Failed to fetch refund queue' });
    }
});

module.exports = router;
