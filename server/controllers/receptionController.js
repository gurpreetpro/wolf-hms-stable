const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');
const { getHospitalId } = require('../utils/tenantHelper');
const { asyncHandler } = require('../middleware/errorHandler');

// Get Reception Dashboard Stats - Multi-Tenant
const getReceptionStats = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);

    // Get bed counts from beds table directly (more reliable)
    const bedsQuery = await pool.query(`
        SELECT 
            COUNT(*) FILTER (WHERE status = 'Available') as available_beds,
            COUNT(*) FILTER (WHERE status = 'Occupied') as occupied_beds,
            COUNT(*) as total_beds
        FROM beds
        WHERE (hospital_id = $1)
    `, [hospitalId]);

    const totalBeds = parseInt(bedsQuery.rows[0]?.total_beds) || 50;
    const occupiedBeds = parseInt(bedsQuery.rows[0]?.occupied_beds) || 0;
    const bedsAvailable = parseInt(bedsQuery.rows[0]?.available_beds) || Math.max(totalBeds - occupiedBeds, 0);

    // Get pending invoices (production-safe query)
    let pendingInvoices = { count: 0, amount: 0 };
    try {
        const pendingInvoicesQuery = await pool.query(`
            SELECT COUNT(*) as pending_count, COALESCE(SUM(total_amount), 0) as pending_amount
            FROM invoices WHERE status = 'Pending' AND (hospital_id = $1)
        `, [hospitalId]);
        pendingInvoices = {
            count: parseInt(pendingInvoicesQuery.rows[0]?.pending_count) || 0,
            amount: parseFloat(pendingInvoicesQuery.rows[0]?.pending_amount) || 0
        };
    } catch (invoiceErr) {
        // invoices table might not exist, ignore
        console.log('Invoices query skipped:', invoiceErr.message);
    }

    // Get today's appointments (no hospital_id)
    const todaysAppointmentsQuery = await pool.query(`
        SELECT opd.id, opd.token_number, p.name as patient_name, p.uhid, p.phone, u.username as doctor_name, opd.status, opd.created_at
        FROM opd_visits opd
        JOIN patients p ON opd.patient_id = p.id
        LEFT JOIN users u ON opd.doctor_id = u.id
        WHERE opd.visit_date = CURRENT_DATE AND (opd.hospital_id = $1 OR opd.hospital_id IS NULL)
        ORDER BY opd.token_number ASC
    `, [hospitalId]);

    ResponseHandler.success(res, {
        beds_available: bedsAvailable, 
        total_beds: totalBeds, 
        occupied_beds: occupiedBeds,
        pending_invoices: pendingInvoices, 
        todays_appointments: todaysAppointmentsQuery.rows
    });
});

// Get OPD Payment Collections - Full Audit Trail
// Shows which receptionist collected which payment
const getOPDCollections = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { start_date, end_date, collected_by, payment_mode } = req.query;
    
    // Default to today if no date specified
    const startDate = start_date || new Date().toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];
    
    let query = `
        SELECT 
            p.id as payment_id,
            p.amount,
            p.payment_mode,
            p.transaction_id,
            p.status as payment_status,
            p.created_at as collected_at,
            pat.id as patient_id,
            pat.name as patient_name,
            pat.uhid,
            pat.phone as patient_phone,
            v.id as visit_id,
            v.token_number,
            v.visit_date,
            collector.id as collected_by_id,
            collector.username as collected_by_name,
            collector.role as collected_by_role
        FROM payments p
        LEFT JOIN opd_visits v ON p.visit_id = v.id
        LEFT JOIN patients pat ON p.patient_id = pat.id
        LEFT JOIN users collector ON p.created_by = collector.id
        WHERE (p.hospital_id = $1 OR p.hospital_id IS NULL)
          AND p.created_at::date >= $2::date
          AND p.created_at::date <= $3::date
    `;
    
    const params = [hospitalId, startDate, endDate];
    
    // Filter by collector if specified
    if (collected_by) {
        params.push(collected_by);
        query += ` AND p.created_by = $${params.length}`;
    }
    
    // Filter by payment mode if specified
    if (payment_mode && payment_mode !== 'All') {
        params.push(payment_mode);
        query += ` AND p.payment_mode = $${params.length}`;
    }
    
    query += ` ORDER BY p.created_at DESC LIMIT 500`;
    
    const result = await pool.query(query, params);
    
    // Calculate totals
    const totals = result.rows.reduce((acc, row) => {
        const amount = parseFloat(row.amount) || 0;
        acc.total += amount;
        acc.by_mode[row.payment_mode] = (acc.by_mode[row.payment_mode] || 0) + amount;
        return acc;
    }, { total: 0, by_mode: {} });
    
    ResponseHandler.success(res, {
        collections: result.rows,
        summary: {
            total_collections: result.rows.length,
            total_amount: totals.total,
            by_payment_mode: totals.by_mode
        },
        filters: {
            start_date: startDate,
            end_date: endDate,
            collected_by: collected_by || 'All',
            payment_mode: payment_mode || 'All'
        }
    });
});

// Get Collection Summary by Cashier - Admin Dashboard
// Shows total collections grouped by each receptionist
const getCollectionSummary = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const result = await pool.query(`
        SELECT 
            u.id as user_id,
            u.username,
            u.role,
            COUNT(p.id) as transaction_count,
            COALESCE(SUM(p.amount), 0) as total_collected,
            COALESCE(SUM(CASE WHEN p.payment_mode = 'Cash' THEN p.amount ELSE 0 END), 0) as cash_collected,
            COALESCE(SUM(CASE WHEN p.payment_mode = 'Card' THEN p.amount ELSE 0 END), 0) as card_collected,
            COALESCE(SUM(CASE WHEN p.payment_mode = 'UPI' THEN p.amount ELSE 0 END), 0) as upi_collected,
            COALESCE(SUM(CASE WHEN p.payment_mode = 'Insurance' THEN p.amount ELSE 0 END), 0) as insurance_collected,
            MIN(p.created_at) as first_collection,
            MAX(p.created_at) as last_collection
        FROM payments p
        JOIN users u ON p.created_by = u.id
        WHERE (p.hospital_id = $1 OR p.hospital_id IS NULL)
          AND p.created_at::date = $2::date
        GROUP BY u.id, u.username, u.role
        ORDER BY total_collected DESC
    `, [hospitalId, targetDate]);
    
    // Grand totals
    const grandTotal = result.rows.reduce((sum, row) => sum + parseFloat(row.total_collected), 0);
    
    ResponseHandler.success(res, {
        date: targetDate,
        cashiers: result.rows.map(row => ({
            user_id: row.user_id,
            username: row.username,
            role: row.role,
            transaction_count: parseInt(row.transaction_count),
            total_collected: parseFloat(row.total_collected),
            breakdown: {
                cash: parseFloat(row.cash_collected),
                card: parseFloat(row.card_collected),
                upi: parseFloat(row.upi_collected),
                insurance: parseFloat(row.insurance_collected)
            },
            first_collection: row.first_collection,
            last_collection: row.last_collection
        })),
        grand_total: grandTotal,
        cashier_count: result.rows.length
    });
});

module.exports = { getReceptionStats, getOPDCollections, getCollectionSummary };
