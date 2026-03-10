const pool = require('../config/db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Get All Wards with Bed Counts - Multi-Tenant
const getWards = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`
        SELECT w.*, 
                COUNT(b.id) as total_beds,
                COUNT(CASE WHEN b.status = 'Available' THEN 1 END) as available_beds
        FROM wards w
        LEFT JOIN beds b ON w.id = b.ward_id
        WHERE (w.hospital_id = $1 OR w.hospital_id IS NULL)
        GROUP BY w.id
        ORDER BY w.name
    `, [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// Create Ward - Multi-Tenant
const createWard = asyncHandler(async (req, res) => {
    const { name, type, capacity, description } = req.body;
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(
        'INSERT INTO wards (name, type, capacity, description, hospital_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, type, capacity, description, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'Ward created successfully', 201);
});

// Get Beds for a Ward - Multi-Tenant
const getBeds = asyncHandler(async (req, res) => {
    const { wardId } = req.params;
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(
        'SELECT b.* FROM beds b JOIN wards w ON b.ward_id = w.id WHERE b.ward_id = $1 AND (w.hospital_id = $2 OR w.hospital_id IS NULL) ORDER BY bed_number',
        [wardId, hospitalId]
    );
    ResponseHandler.success(res, result.rows);
});

// Add Bed - Multi-Tenant
const addBed = asyncHandler(async (req, res) => {
    const { wardId } = req.params;
    const { bed_number } = req.body;
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(
        'INSERT INTO beds (ward_id, bed_number, hospital_id) VALUES ($1, $2, $3) RETURNING *',
        [wardId, bed_number, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'Bed added successfully', 201);
});

// Update Bed Status - Multi-Tenant
const updateBedStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const hospitalId = getHospitalId(req);
    
    const result = await pool.query(
        'UPDATE beds SET status = $1 WHERE id = $2 AND (hospital_id = $3 OR hospital_id IS NULL) RETURNING *',
        [status, id, hospitalId]
    );
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Bed not found', 404);
    ResponseHandler.success(res, result.rows[0]);
});

// Get Ward Occupancy Stats - Multi-Tenant
const getWardOccupancy = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query(`
        SELECT 
            CASE WHEN b.status = 'Available' THEN 'Available' ELSE 'Occupied' END as name,
            COUNT(*) as value
        FROM beds b
        JOIN wards w ON b.ward_id = w.id
        WHERE (w.hospital_id = $1 OR w.hospital_id IS NULL)
        GROUP BY CASE WHEN b.status = 'Available' THEN 'Available' ELSE 'Occupied' END
    `, [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

module.exports = { getWards, createWard, getBeds, addBed, updateBedStatus, getWardOccupancy };
