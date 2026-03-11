/**
 * Charges Controller - Centralized Billing Module
 * 
 * All departments (Lab, Pharmacy, OPD, etc.) create charges here.
 * Only Billing staff can confirm payments through PaymentConfirmationModal.
 * 
 * This follows the gold standard HMS pattern where departments create charges
 * but billing confirms payments.
 */

const prisma = require('../config/prisma');

// Get Socket.io instance (will be set from server.js)
let io = null;
const setSocketIO = (socketIO) => { io = socketIO; };

/**
 * Create a new pending charge
 * Called by Lab, Pharmacy, OPD, or any department when services are rendered
 */
const createCharge = async (req, res) => {
    try {
        const {
            patient_id,
            admission_id,
            charge_type,
            description,
            quantity = 1,
            unit_price,
            source_table,
            source_id,
            insurance_eligible = false,
            insurance_provider_id,
            preauth_id
        } = req.body;

        // Validation
        if (!patient_id || !charge_type || !description || !unit_price) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: patient_id, charge_type, description, unit_price'
            });
        }

        const total_price = quantity * parseFloat(unit_price);

        const charge = await prisma.pending_charges.create({
            data: {
                hospital_id: req.hospitalId,
                patient_id,
                admission_id: admission_id || null,
                charge_type,
                description,
                quantity,
                unit_price: parseFloat(unit_price),
                total_price,
                source_table: source_table || null,
                source_id: source_id || null,
                status: 'pending',
                insurance_eligible,
                insurance_provider_id: insurance_provider_id || null,
                preauth_id: preauth_id || null,
                created_by: req.userId,
                created_at: new Date()
            },
            include: {
                patients: { select: { name: true, uhid: true } }
            }
        });

        // Emit real-time event to billing dashboard
        if (io) {
            io.to(`hospital_${req.hospitalId}`).emit('new_charge', {
                ...charge,
                patient_name: charge.patients?.name
            });
        }

        console.log(`✅ Charge created: ${charge_type} - ₹${total_price} for patient ${patient_id}`);

        return res.status(201).json({
            success: true,
            message: 'Charge created successfully',
            charge
        });
    } catch (error) {
        console.error('Error creating charge:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create charge',
            error: error.message
        });
    }
};

/**
 * Get all pending charges (for billing queue)
 * Supports filtering by patient, status, charge_type, date range
 */
const getPendingCharges = async (req, res) => {
    try {
        const {
            patient_id,
            admission_id,
            status = 'pending',
            charge_type,
            start_date,
            end_date,
            page = 1,
            limit = 50
        } = req.query;

        const where = {
            hospital_id: req.hospitalId
        };

        if (patient_id) where.patient_id = patient_id;
        if (admission_id) where.admission_id = parseInt(admission_id);
        if (status && status !== 'all') where.status = status;
        if (charge_type) where.charge_type = charge_type;

        if (start_date || end_date) {
            where.created_at = {};
            if (start_date) where.created_at.gte = new Date(start_date);
            if (end_date) where.created_at.lte = new Date(end_date);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [charges, total] = await Promise.all([
            prisma.pending_charges.findMany({
                where,
                include: {
                    patients: { select: { name: true, uhid: true, phone: true } },
                    admissions: { select: { ward: true, bed_number: true } },
                    created_by_user: { select: { name: true } }
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.pending_charges.count({ where })
        ]);

        // Group by patient for UI
        const groupedByPatient = charges.reduce((acc, charge) => {
            const key = charge.patient_id;
            if (!acc[key]) {
                acc[key] = {
                    patient_id: charge.patient_id,
                    patient_name: charge.patients?.name || 'Unknown',
                    uhid: charge.patients?.uhid,
                    phone: charge.patients?.phone,
                    admission_id: charge.admission_id,
                    ward: charge.admissions?.ward,
                    bed_number: charge.admissions?.bed_number,
                    charges: [],
                    total_amount: 0
                };
            }
            acc[key].charges.push(charge);
            acc[key].total_amount += parseFloat(charge.total_price);
            return acc;
        }, {});

        return res.json({
            success: true,
            charges,
            grouped: Object.values(groupedByPatient),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching pending charges:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch pending charges',
            error: error.message
        });
    }
};

/**
 * Get charges for a specific patient
 */
const getPatientCharges = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { status, admission_id } = req.query;

        const where = {
            hospital_id: req.hospitalId,
            patient_id: patientId
        };

        if (status && status !== 'all') where.status = status;
        if (admission_id) where.admission_id = parseInt(admission_id);

        const charges = await prisma.pending_charges.findMany({
            where,
            orderBy: { created_at: 'desc' }
        });

        const totals = charges.reduce((acc, c) => {
            acc[c.status] = (acc[c.status] || 0) + parseFloat(c.total_price);
            acc.all += parseFloat(c.total_price);
            return acc;
        }, { all: 0, pending: 0, invoiced: 0, cancelled: 0, waived: 0 });

        return res.json({
            success: true,
            charges,
            totals,
            count: charges.length
        });
    } catch (error) {
        console.error('Error fetching patient charges:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch patient charges',
            error: error.message
        });
    }
};

/**
 * Add charge(s) to an invoice - Called by Billing staff
 */
const addChargesToInvoice = async (req, res) => {
    try {
        const { charge_ids, invoice_id, create_new_invoice } = req.body;

        if (!charge_ids || !Array.isArray(charge_ids) || charge_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'charge_ids array is required'
            });
        }

        // Get charges to process
        const charges = await prisma.pending_charges.findMany({
            where: {
                id: { in: charge_ids },
                hospital_id: req.hospitalId,
                status: 'pending'
            },
            include: {
                patients: { select: { id: true, name: true } }
            }
        });

        if (charges.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid pending charges found'
            });
        }

        // All charges must be for the same patient
        const patientIds = [...new Set(charges.map(c => c.patient_id))];
        if (patientIds.length > 1) {
            return res.status(400).json({
                success: false,
                message: 'All charges must be for the same patient'
            });
        }

        let targetInvoiceId = invoice_id;

        // Create new invoice if needed
        if (create_new_invoice || !invoice_id) {
            const newInvoice = await prisma.invoices.create({
                data: {
                    hospital_id: req.hospitalId,
                    patient_id: patientIds[0],
                    admission_id: charges[0].admission_id,
                    total_amount: 0,
                    status: 'Pending',
                    generated_by: req.userId,
                    invoice_number: `INV-${Date.now()}`
                }
            });
            targetInvoiceId = newInvoice.id;
        }

        // Calculate total
        const totalAmount = charges.reduce((sum, c) => sum + parseFloat(c.total_price), 0);

        // Update charges and create invoice items
        await prisma.$transaction([
            // Mark charges as invoiced
            prisma.pending_charges.updateMany({
                where: { id: { in: charge_ids } },
                data: {
                    status: 'invoiced',
                    invoice_id: targetInvoiceId,
                    processed_by: req.userId,
                    processed_at: new Date()
                }
            }),
            // Create invoice items
            prisma.invoice_items.createMany({
                data: charges.map(c => ({
                    invoice_id: targetInvoiceId,
                    description: c.description,
                    quantity: c.quantity,
                    unit_price: c.unit_price,
                    total_price: c.total_price,
                    hospital_id: req.hospitalId,
                    item_type: c.charge_type,
                    reference_id: c.source_id
                }))
            }),
            // Update invoice total
            prisma.invoices.update({
                where: { id: targetInvoiceId },
                data: {
                    total_amount: { increment: totalAmount }
                }
            })
        ]);

        // Emit event
        if (io) {
            io.to(`hospital_${req.hospitalId}`).emit('charges_invoiced', {
                charge_ids,
                invoice_id: targetInvoiceId,
                patient_id: patientIds[0]
            });
        }

        return res.json({
            success: true,
            message: `${charges.length} charge(s) added to invoice`,
            invoice_id: targetInvoiceId,
            total_amount: totalAmount
        });
    } catch (error) {
        console.error('Error adding charges to invoice:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to add charges to invoice',
            error: error.message
        });
    }
};

/**
 * Cancel a pending charge
 */
const cancelCharge = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const charge = await prisma.pending_charges.findFirst({
            where: {
                id: parseInt(id),
                hospital_id: req.hospitalId,
                status: 'pending'
            }
        });

        if (!charge) {
            return res.status(404).json({
                success: false,
                message: 'Charge not found or already processed'
            });
        }

        await prisma.pending_charges.update({
            where: { id: parseInt(id) },
            data: {
                status: 'cancelled',
                cancelled_by: req.userId,
                cancelled_at: new Date(),
                cancel_reason: reason || 'Cancelled by user'
            }
        });

        if (io) {
            io.to(`hospital_${req.hospitalId}`).emit('charge_cancelled', { id: parseInt(id) });
        }

        return res.json({
            success: true,
            message: 'Charge cancelled successfully'
        });
    } catch (error) {
        console.error('Error cancelling charge:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to cancel charge',
            error: error.message
        });
    }
};

/**
 * Waive a charge (with authorization)
 */
const waiveCharge = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, authorized_by } = req.body;

        // Only admin/billing_manager can waive charges
        if (!['admin', 'billing_manager', 'finance_user'].includes(req.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to waive charges'
            });
        }

        const charge = await prisma.pending_charges.findFirst({
            where: {
                id: parseInt(id),
                hospital_id: req.hospitalId,
                status: 'pending'
            }
        });

        if (!charge) {
            return res.status(404).json({
                success: false,
                message: 'Charge not found or already processed'
            });
        }

        await prisma.pending_charges.update({
            where: { id: parseInt(id) },
            data: {
                status: 'waived',
                cancelled_by: req.userId,
                cancelled_at: new Date(),
                cancel_reason: reason || 'Waived by authorized user'
            }
        });

        if (io) {
            io.to(`hospital_${req.hospitalId}`).emit('charge_waived', { id: parseInt(id) });
        }

        return res.json({
            success: true,
            message: 'Charge waived successfully'
        });
    } catch (error) {
        console.error('Error waiving charge:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to waive charge',
            error: error.message
        });
    }
};

/**
 * Get billing queue summary (for dashboard cards)
 */
const getBillingQueueSummary = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [pendingCount, pendingTotal, todayCount, todayTotal, insuranceCount, insuranceTotal] = await Promise.all([
            prisma.pending_charges.count({
                where: { hospital_id: req.hospitalId, status: 'pending' }
            }),
            prisma.pending_charges.aggregate({
                where: { hospital_id: req.hospitalId, status: 'pending' },
                _sum: { total_price: true }
            }),
            prisma.pending_charges.count({
                where: {
                    hospital_id: req.hospitalId,
                    status: 'pending',
                    created_at: { gte: today }
                }
            }),
            prisma.pending_charges.aggregate({
                where: {
                    hospital_id: req.hospitalId,
                    status: 'pending',
                    created_at: { gte: today }
                },
                _sum: { total_price: true }
            }),
            // Insurance eligible charges
            prisma.pending_charges.count({
                where: {
                    hospital_id: req.hospitalId,
                    status: 'pending',
                    insurance_eligible: true
                }
            }),
            prisma.pending_charges.aggregate({
                where: {
                    hospital_id: req.hospitalId,
                    status: 'pending',
                    insurance_eligible: true
                },
                _sum: { total_price: true }
            })
        ]);

        // Get breakdown by charge type
        const byType = await prisma.pending_charges.groupBy({
            by: ['charge_type'],
            where: { hospital_id: req.hospitalId, status: 'pending' },
            _count: { id: true },
            _sum: { total_price: true }
        });

        return res.json({
            success: true,
            summary: {
                pending_count: pendingCount,
                pending_total: parseFloat(pendingTotal._sum.total_price || 0),
                today_count: todayCount,
                today_total: parseFloat(todayTotal._sum.total_price || 0),
                insurance_eligible_count: insuranceCount,
                insurance_eligible_total: parseFloat(insuranceTotal._sum.total_price || 0),
                by_type: byType.map(t => ({
                    type: t.charge_type,
                    count: t._count.id,
                    total: parseFloat(t._sum.total_price || 0)
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching billing summary:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch billing summary',
            error: error.message
        });
    }
};

/**
 * Helper function for other controllers to create charges
 * Can be imported and used directly without going through HTTP
 */
const createChargeHelper = async ({
    hospital_id,
    patient_id,
    admission_id,
    charge_type,
    description,
    quantity = 1,
    unit_price,
    source_table,
    source_id,
    created_by,
    insurance_eligible = false
}) => {
    try {
        const total_price = quantity * parseFloat(unit_price);

        const charge = await prisma.pending_charges.create({
            data: {
                hospital_id,
                patient_id,
                admission_id: admission_id || null,
                charge_type,
                description,
                quantity,
                unit_price: parseFloat(unit_price),
                total_price,
                source_table: source_table || null,
                source_id: source_id || null,
                status: 'pending',
                insurance_eligible,
                created_by,
                created_at: new Date()
            }
        });

        // Emit if io available
        if (io) {
            io.to(`hospital_${hospital_id}`).emit('new_charge', charge);
        }

        console.log(`📋 Charge created via helper: ${charge_type} - ₹${total_price}`);
        return charge;
    } catch (error) {
        console.error('Error in createChargeHelper:', error);
        throw error;
    }
};

module.exports = {
    setSocketIO,
    createCharge,
    getPendingCharges,
    getPatientCharges,
    addChargesToInvoice,
    cancelCharge,
    waiveCharge,
    getBillingQueueSummary,
    createChargeHelper
};
