/**
 * Wolf Care - Unified Cart Checkout Routes
 * 
 * Handles combined medicine + lab test orders in a single transaction.
 * Single hospital scope per cart.
 * 
 * Endpoints:
 *   POST /api/unified-cart/checkout    - Process unified cart checkout
 *   GET  /api/unified-cart/validate    - Validate cart items (stock, availability)
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { verifyToken } = require('../services/otpAuthService');
const { getPaymentGateway } = require('../services/paymentGateway');

// ==================== AUTH MIDDLEWARE ====================

const authenticatePatient = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

// ==================== PHARMACY BROWSE (Patient-Facing) ====================

/**
 * GET /api/unified-cart/pharmacy/:hospitalId
 * Browse pharmacy catalog for a specific hospital.
 * Returns in-stock items with real hospital-specific prices.
 * Supports ?search= and ?category= query params.
 */
router.get('/pharmacy/:hospitalId', authenticatePatient, async (req, res) => {
    try {
        const hid = parseInt(req.params.hospitalId) || 1;
        const { search, category, limit } = req.query;
        const maxItems = Math.min(parseInt(limit) || 100, 200);

        let query = `
            SELECT id, name, generic_name, category, 
                   price_per_unit as unit_price, stock_quantity,
                   batch_number, expiry_date,
                   CASE WHEN stock_quantity > 0 THEN true ELSE false END as in_stock
            FROM inventory_items
            WHERE hospital_id = $1 AND stock_quantity > 0
        `;
        const params = [hid];
        let paramIdx = 2;

        if (search) {
            query += ` AND (LOWER(name) LIKE $${paramIdx} OR LOWER(generic_name) LIKE $${paramIdx})`;
            params.push(`%${search.toLowerCase()}%`);
            paramIdx++;
        }

        if (category) {
            query += ` AND LOWER(category) = $${paramIdx}`;
            params.push(category.toLowerCase());
            paramIdx++;
        }

        query += ` ORDER BY name LIMIT $${paramIdx}`;
        params.push(maxItems);

        const result = await pool.query(query, params);

        // Also get available categories for filtering
        const catResult = await pool.query(
            `SELECT DISTINCT category FROM inventory_items 
             WHERE hospital_id = $1 AND category IS NOT NULL AND stock_quantity > 0
             ORDER BY category`,
            [hid]
        );

        res.json({
            success: true,
            hospital_id: hid,
            items: result.rows.map(row => ({
                ...row,
                unit_price: parseFloat(row.unit_price) || 0,
                stock_quantity: parseInt(row.stock_quantity) || 0,
            })),
            categories: catResult.rows.map(r => r.category),
            total: result.rows.length,
        });
    } catch (err) {
        console.error('[UNIFIED-CART] Pharmacy browse error:', err);
        res.status(500).json({ error: 'Failed to load pharmacy catalog' });
    }
});

/**
 * POST /api/unified-cart/match-prescription
 * Match prescription medicine names to hospital inventory items.
 * Returns matched items with real unit_price, inventory_item_id, and availability.
 *
 * Body: { hospital_id, medicines: [{ name, dosage?, quantity? }] }
 */
router.post('/match-prescription', authenticatePatient, async (req, res) => {
    try {
        const { hospital_id, medicines } = req.body;

        if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
            return res.status(400).json({ error: 'No medicines provided' });
        }

        const hid = hospital_id || req.user.hospital_id || 1;
        const matched = [];

        for (const med of medicines) {
            const medName = (med.name || '').trim();
            if (!medName) continue;

            // Try exact match first, then fuzzy match via ILIKE
            let invResult = await pool.query(`
                SELECT id, name, generic_name, category, 
                       price_per_unit as unit_price, stock_quantity,
                       batch_number, expiry_date
                FROM inventory_items
                WHERE hospital_id = $1 AND (
                    LOWER(name) = $2 OR LOWER(generic_name) = $2
                )
                ORDER BY stock_quantity DESC
                LIMIT 1
            `, [hid, medName.toLowerCase()]);

            // Fuzzy fallback: partial match
            if (invResult.rows.length === 0) {
                invResult = await pool.query(`
                    SELECT id, name, generic_name, category,
                           price_per_unit as unit_price, stock_quantity,
                           batch_number, expiry_date
                    FROM inventory_items
                    WHERE hospital_id = $1 AND (
                        LOWER(name) LIKE $2 OR LOWER(generic_name) LIKE $2
                    )
                    ORDER BY stock_quantity DESC
                    LIMIT 1
                `, [hid, `%${medName.toLowerCase()}%`]);
            }

            if (invResult.rows.length > 0) {
                const inv = invResult.rows[0];
                const qty = parseInt(med.quantity) || 1;
                matched.push({
                    prescription_name: medName,
                    matched: true,
                    inventory_item_id: inv.id,
                    inventory_name: inv.name,
                    generic_name: inv.generic_name,
                    category: inv.category,
                    unit_price: parseFloat(inv.unit_price) || 0,
                    stock_quantity: parseInt(inv.stock_quantity) || 0,
                    in_stock: parseInt(inv.stock_quantity) >= qty,
                    quantity: qty,
                    dosage: med.dosage || null,
                });
            } else {
                matched.push({
                    prescription_name: medName,
                    matched: false,
                    inventory_item_id: null,
                    unit_price: 0,
                    in_stock: false,
                    quantity: parseInt(med.quantity) || 1,
                    dosage: med.dosage || null,
                    reason: 'Not found in hospital pharmacy',
                });
            }
        }

        const matchedCount = matched.filter(m => m.matched).length;

        res.json({
            success: true,
            hospital_id: hid,
            total: medicines.length,
            matched_count: matchedCount,
            unmatched_count: medicines.length - matchedCount,
            items: matched,
        });
    } catch (err) {
        console.error('[UNIFIED-CART] Match prescription error:', err);
        res.status(500).json({ error: 'Failed to match prescription' });
    }
});

// ==================== LAB TEST BROWSE (Patient-Facing) ====================

/**
 * GET /api/unified-cart/lab-tests/:hospitalId
 * Browse lab test catalog for a specific hospital.
 * Returns tests with real hospital-specific prices.
 * Supports ?search= and ?category= query params.
 */
router.get('/lab-tests/:hospitalId', authenticatePatient, async (req, res) => {
    try {
        const hid = Number.parseInt(req.params.hospitalId) || 1;
        const { search, category, limit } = req.query;
        const maxItems = Math.min(Number.parseInt(limit) || 200, 500);

        let query = `
            SELECT t.id, t.name, t.price, t.hospital_id, t.is_active,
                   c.name as category_name, c.id as category_id
            FROM lab_test_types t
            LEFT JOIN lab_test_categories c ON t.category_id = c.id
            WHERE (t.hospital_id = $1 OR t.hospital_id IS NULL)
              AND (t.is_active = TRUE OR t.is_active IS NULL)
        `;
        const params = [hid];
        let paramIdx = 2;

        if (search) {
            query += ` AND LOWER(t.name) LIKE $${paramIdx}`;
            params.push(`%${search.toLowerCase()}%`);
            paramIdx++;
        }

        if (category) {
            query += ` AND LOWER(c.name) = $${paramIdx}`;
            params.push(category.toLowerCase());
            paramIdx++;
        }

        // Prefer hospital-specific tests over global ones
        query += ` ORDER BY t.hospital_id DESC NULLS LAST, t.name LIMIT $${paramIdx}`;
        params.push(maxItems);

        const result = await pool.query(query, params);

        // Get available categories
        const catResult = await pool.query(
            `SELECT DISTINCT c.name, c.id FROM lab_test_categories c
             JOIN lab_test_types t ON t.category_id = c.id
             WHERE (t.hospital_id = $1 OR t.hospital_id IS NULL)
               AND (t.is_active = TRUE OR t.is_active IS NULL)
             ORDER BY c.name`,
            [hid]
        );

        // Get lab packages if they exist
        let packages = [];
        try {
            const pkgResult = await pool.query(
                `SELECT id, name, price, description, category
                 FROM lab_packages
                 WHERE (hospital_id = $1)
                 ORDER BY name`,
                [hid]
            );
            packages = pkgResult.rows.map(p => ({
                ...p,
                price: Number.parseFloat(p.price) || 0,
            }));
        } catch (_) {
            // lab_packages table may not exist yet
        }

        res.json({
            success: true,
            hospital_id: hid,
            tests: result.rows.map(row => ({
                ...row,
                price: Number.parseFloat(row.price) || 0,
            })),
            packages,
            categories: catResult.rows,
            total: result.rows.length,
        });
    } catch (err) {
        console.error('[UNIFIED-CART] Lab test browse error:', err);
        res.status(500).json({ error: 'Failed to load lab test catalog' });
    }
});

/**
 * POST /api/unified-cart/match-lab-tests
 * Match prescribed lab test names to hospital's lab test types.
 * Returns matched tests with real hospital-specific pricing.
 *
 * Body: { hospital_id, tests: [{ name }] }
 */
router.post('/match-lab-tests', authenticatePatient, async (req, res) => {
    try {
        const { hospital_id, tests } = req.body;

        if (!tests || !Array.isArray(tests) || tests.length === 0) {
            return res.status(400).json({ error: 'No lab tests provided' });
        }

        const hid = hospital_id || req.user.hospital_id || 1;
        const matched = [];

        for (const test of tests) {
            const testName = (test.name || '').trim();
            if (!testName) continue;

            // Exact match first (prefer hospital-specific over global)
            let testResult = await pool.query(`
                SELECT t.id, t.name, t.price, t.hospital_id,
                       c.name as category_name
                FROM lab_test_types t
                LEFT JOIN lab_test_categories c ON t.category_id = c.id
                WHERE (t.hospital_id = $1 OR t.hospital_id IS NULL)
                  AND LOWER(t.name) = $2
                  AND (t.is_active = TRUE OR t.is_active IS NULL)
                ORDER BY t.hospital_id DESC NULLS LAST
                LIMIT 1
            `, [hid, testName.toLowerCase()]);

            // Fuzzy fallback: partial match
            if (testResult.rows.length === 0) {
                testResult = await pool.query(`
                    SELECT t.id, t.name, t.price, t.hospital_id,
                           c.name as category_name
                    FROM lab_test_types t
                    LEFT JOIN lab_test_categories c ON t.category_id = c.id
                    WHERE (t.hospital_id = $1 OR t.hospital_id IS NULL)
                      AND LOWER(t.name) LIKE $2
                      AND (t.is_active = TRUE OR t.is_active IS NULL)
                    ORDER BY t.hospital_id DESC NULLS LAST
                    LIMIT 1
                `, [hid, `%${testName.toLowerCase()}%`]);
            }

            if (testResult.rows.length > 0) {
                const t = testResult.rows[0];
                matched.push({
                    prescribed_name: testName,
                    matched: true,
                    test_id: t.id,
                    test_name: t.name,
                    category: t.category_name,
                    price: Number.parseFloat(t.price) || 0,
                    hospital_specific: t.hospital_id === hid,
                });
            } else {
                matched.push({
                    prescribed_name: testName,
                    matched: false,
                    test_id: null,
                    price: 0,
                    reason: 'Not found in hospital lab catalog',
                });
            }
        }

        const matchedCount = matched.filter(m => m.matched).length;

        res.json({
            success: true,
            hospital_id: hid,
            total: tests.length,
            matched_count: matchedCount,
            unmatched_count: tests.length - matchedCount,
            items: matched,
        });
    } catch (err) {
        console.error('[UNIFIED-CART] Match lab tests error:', err);
        res.status(500).json({ error: 'Failed to match lab tests' });
    }
});

// ==================== VALIDATE CART ====================

/**
 * POST /api/unified-cart/validate
 * Validate all cart items (stock check, price verification)
 */
router.post('/validate', authenticatePatient, async (req, res) => {
    try {
        const { items, hospital_id } = req.body;
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        const hid = hospital_id || req.user.hospital_id || 1;
        const validation = { valid: true, items: [], warnings: [] };

        for (const item of items) {
            if (item.type === 'medicine') {
                // Check inventory
                const invResult = await pool.query(`
                    SELECT id, name, price_per_unit as selling_price, stock_quantity
                    FROM inventory_items
                    WHERE id = $1 AND hospital_id = $2
                `, [item.inventory_item_id, hid]);

                if (invResult.rows.length === 0) {
                    validation.items.push({
                        ...item,
                        is_available: false,
                        reason: 'Not found in inventory'
                    });
                    validation.valid = false;
                } else {
                    const inv = invResult.rows[0];
                    const available = inv.stock_quantity >= item.quantity;
                    validation.items.push({
                        ...item,
                        is_available: available,
                        current_price: parseFloat(inv.selling_price) || 0,
                        stock: inv.stock_quantity,
                        reason: available ? null : `Only ${inv.stock_quantity} in stock`
                    });
                    if (!available) validation.valid = false;
                }
            } else if (item.type === 'lab_test' || item.type === 'health_package') {
                // Lab tests are always available (managed by lab service)
                validation.items.push({
                    ...item,
                    is_available: true,
                    current_price: item.unit_price
                });
            }
        }

        res.json({ success: true, validation });
    } catch (err) {
        console.error('[UNIFIED-CART] Validation error:', err);
        res.status(500).json({ error: 'Validation failed' });
    }
});

// ==================== UNIFIED CHECKOUT ====================

/**
 * POST /api/unified-cart/checkout
 * Process unified cart - creates medicine order + lab booking in single transaction
 */
router.post('/checkout', authenticatePatient, async (req, res) => {
    const {
        items,
        hospital_id,
        medicine_delivery,     // 'delivery' | 'pickup'
        lab_collection,        // 'home' | 'visit'
        address_id,
        lab_date,
        lab_slot_id,
        payment_method,        // 'razorpay' | 'cod' | 'upi'
        coupon_code,
        notes
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
    }

    const hid = hospital_id || req.user.hospital_id || 1;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Separate items by type
        const medicineItems = items.filter(i => i.type === 'medicine');
        const labItems = items.filter(i => i.type === 'lab_test' || i.type === 'health_package');

        let medicineOrderId = null;
        let labBookingId = null;
        let medicineSubtotal = 0;
        let labSubtotal = 0;
        let deliveryCharge = 0;

        // ========== PROCESS MEDICINES ==========
        if (medicineItems.length > 0) {
            // Get delivery settings
            const settingsResult = await client.query(
                `SELECT * FROM medicine_delivery_settings WHERE hospital_id = $1`, [hid]
            );
            const settings = settingsResult.rows[0] || { 
                flat_delivery_charge: 50, 
                free_delivery_above: 500 
            };

            const orderItems = [];

            for (const med of medicineItems) {
                // Verify inventory
                const invResult = await client.query(`
                    SELECT id, name, price_per_unit as selling_price, stock_quantity
                    FROM inventory_items
                    WHERE id = $1 AND hospital_id = $2
                `, [med.inventory_item_id, hid]);

                const inv = invResult.rows[0];
                const qty = parseInt(med.quantity) || 1;
                const price = inv ? parseFloat(inv.selling_price) || 0 : parseFloat(med.unit_price) || 0;
                const itemTotal = price * qty;

                orderItems.push({
                    inventory_item_id: med.inventory_item_id,
                    medicine_name: med.name,
                    quantity: qty,
                    unit_price: price,
                    total_price: itemTotal,
                    is_available: inv ? inv.stock_quantity >= qty : false
                });

                medicineSubtotal += itemTotal;
            }

            // Calculate delivery
            if (medicine_delivery === 'delivery') {
                if (medicineSubtotal >= (settings.free_delivery_above || 500)) {
                    deliveryCharge = 0;
                } else {
                    deliveryCharge = settings.flat_delivery_charge || 50;
                }
            }

            // Generate order number
            const orderNumber = `WC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
            const deliveryOTP = Math.floor(100000 + Math.random() * 900000).toString();

            // Get prescription ID (use the first one if multiple prescriptions)
            const prescriptionId = medicineItems.find(i => i.prescription_id)?.prescription_id || null;

            // Create medicine order
            const orderResult = await client.query(`
                INSERT INTO medicine_orders (
                    order_number, patient_id, prescription_id, hospital_id,
                    delivery_type, address_id,
                    subtotal, delivery_charge, total,
                    status, payment_method, payment_status,
                    delivery_otp, patient_notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, $11, $12, $13)
                RETURNING *
            `, [
                orderNumber, req.user.id, prescriptionId, hid,
                medicine_delivery || 'delivery', address_id,
                medicineSubtotal, deliveryCharge, medicineSubtotal + deliveryCharge,
                payment_method,
                payment_method === 'cod' ? 'cod' : 'pending',
                deliveryOTP, notes || ''
            ]);

            medicineOrderId = orderResult.rows[0].id;

            // Insert order items
            for (const item of orderItems) {
                await client.query(`
                    INSERT INTO medicine_order_items (
                        order_id, inventory_item_id, medicine_name,
                        quantity, unit_price, total_price
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    medicineOrderId, item.inventory_item_id, item.medicine_name,
                    item.quantity, item.unit_price, item.total_price
                ]);
            }

            // Log order
            await client.query(`
                INSERT INTO medicine_order_logs (order_id, status, notes)
                VALUES ($1, 'pending', 'Order placed via unified cart')
            `, [medicineOrderId]);
        }

        // ========== PROCESS LAB TESTS ==========
        if (labItems.length > 0) {
            labSubtotal = labItems.reduce((sum, i) => sum + (parseFloat(i.unit_price) * (i.quantity || 1)), 0);

            // Create lab booking (simplified - integrates with homeLabService)
            const labBookingNumber = `WL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

            const labResult = await client.query(`
                INSERT INTO lab_bookings (
                    booking_number, patient_id, hospital_id,
                    collection_type, collection_date, slot_id, address_id,
                    subtotal, total, status,
                    payment_method, payment_status, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, $11, $12)
                RETURNING id
            `, [
                labBookingNumber, req.user.id, hid,
                lab_collection || 'home', lab_date, lab_slot_id, address_id,
                labSubtotal, labSubtotal,
                payment_method,
                payment_method === 'cod' ? 'cod' : 'pending',
                notes || ''
            ]);

            labBookingId = labResult.rows[0]?.id || null;

            // Insert lab booking items
            if (labBookingId) {
                for (const item of labItems) {
                    await client.query(`
                        INSERT INTO lab_booking_items (
                            booking_id, test_id, package_id, name, price
                        ) VALUES ($1, $2, $3, $4, $5)
                    `, [
                        labBookingId,
                        item.type === 'lab_test' ? item.test_id : null,
                        item.type === 'health_package' ? item.package_id : null,
                        item.name,
                        item.unit_price
                    ]);
                }
            }
        }

        // ========== CALCULATE COMBINED TOTAL ==========
        const combinedTotal = medicineSubtotal + labSubtotal + deliveryCharge;

        // ========== PAYMENT (RAZORPAY) ==========
        let razorpayOrder = null;
        if (payment_method === 'razorpay' && combinedTotal > 0) {
            try {
                const pg = getPaymentGateway(hid);
                if (pg) {
                    razorpayOrder = await pg.orders.create({
                        amount: Math.round(combinedTotal * 100), // Razorpay uses paise
                        currency: 'INR',
                        receipt: `unified_${medicineOrderId || labBookingId}`,
                        notes: {
                            medicine_order_id: medicineOrderId,
                            lab_booking_id: labBookingId,
                            patient_id: req.user.id,
                            type: 'unified_cart'
                        }
                    });

                    // Link Razorpay order to medicine order
                    if (medicineOrderId && razorpayOrder) {
                        await client.query(
                            `UPDATE medicine_orders SET razorpay_order_id = $1 WHERE id = $2`,
                            [razorpayOrder.id, medicineOrderId]
                        );
                    }
                }
            } catch (pgErr) {
                console.error('[UNIFIED-CART] Razorpay error:', pgErr.message);
                // Continue without online payment - fallback to COD
            }
        }

        await client.query('COMMIT');

        // ========== RESPONSE ==========
        res.json({
            success: true,
            message: 'Order placed successfully',
            order: {
                medicine_order_id: medicineOrderId,
                lab_booking_id: labBookingId,
                medicine_subtotal: medicineSubtotal,
                lab_subtotal: labSubtotal,
                delivery_charge: deliveryCharge,
                combined_total: combinedTotal,
                payment_method,
                has_medicines: medicineItems.length > 0,
                has_lab_tests: labItems.length > 0,
            },
            razorpay: razorpayOrder ? {
                order_id: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
            } : null,
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[UNIFIED-CART] Checkout error:', err);
        res.status(500).json({ error: 'Checkout failed: ' + err.message });
    } finally {
        client.release();
    }
});

// ==================== VERIFY PAYMENT ====================

/**
 * POST /api/unified-cart/verify-payment
 * Verify Razorpay payment for unified order
 */
router.post('/verify-payment', authenticatePatient, async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            medicine_order_id,
            lab_booking_id
        } = req.body;

        const hid = req.user.hospital_id || 1;

        // Verify signature
        const pg = getPaymentGateway(hid);
        if (!pg) {
            return res.status(500).json({ error: 'Payment gateway not configured' });
        }

        const crypto = require('crypto');
        const expectedSig = crypto
            .createHmac('sha256', pg.key_secret || process.env.RAZORPAY_KEY_SECRET || '')
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        const isValid = expectedSig === razorpay_signature;

        if (!isValid) {
            return res.status(400).json({ error: 'Payment verification failed' });
        }

        // Update medicine order payment status
        if (medicine_order_id) {
            await pool.query(`
                UPDATE medicine_orders 
                SET payment_status = 'paid', 
                    razorpay_payment_id = $1,
                    status = 'confirmed'
                WHERE id = $2 AND patient_id = $3
            `, [razorpay_payment_id, medicine_order_id, req.user.id]);

            await pool.query(`
                INSERT INTO medicine_order_logs (order_id, status, notes)
                VALUES ($1, 'confirmed', 'Payment verified via Razorpay')
            `, [medicine_order_id]);
        }

        // Update lab booking payment status
        if (lab_booking_id) {
            await pool.query(`
                UPDATE lab_bookings 
                SET payment_status = 'paid', status = 'confirmed'
                WHERE id = $1 AND patient_id = $2
            `, [lab_booking_id, req.user.id]);
        }

        res.json({
            success: true,
            message: 'Payment verified successfully',
            payment_id: razorpay_payment_id
        });

    } catch (err) {
        console.error('[UNIFIED-CART] Payment verification error:', err);
        res.status(500).json({ error: 'Payment verification failed' });
    }
});

module.exports = router;
