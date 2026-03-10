const { pool } = require('../db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { addToInvoice } = require('../services/billingService');

// Dispatch Ambulance
const dispatchAmbulance = asyncHandler(async (req, res) => {
    const { patient_id, location, driver_id, vehicle_number, per_km_rate } = req.body;
    const hospitalId = req.hospital_id;
    const dispatchedBy = req.user.id;

    // Create Trip Record
    const result = await pool.query(
        `INSERT INTO ambulance_trips (patient_id, location, driver_id, vehicle_number, status, start_time, per_km_rate, dispatched_by, hospital_id)
         VALUES ($1, $2, $3, $4, 'Dispatched', NOW(), $5, $6, $7)
         RETURNING *`,
        [patient_id, location, driver_id, vehicle_number, per_km_rate || 50, dispatchedBy, hospitalId]
    );

    ResponseHandler.success(res, result.rows[0], 'Ambulance Dispatched', 201);
});

// Complete Trip & Bill
const completeTrip = asyncHandler(async (req, res) => {
    const { trip_id, end_location, distance_km } = req.body;
    const completedBy = req.user.id;

    // Get Trip Details
    const tripRes = await pool.query("SELECT * FROM ambulance_trips WHERE id = $1", [trip_id]);
    if (tripRes.rows.length === 0) return ResponseHandler.error(res, 'Trip not found', 404);
    
    const trip = tripRes.rows[0];
    const totalCost = parseFloat(trip.per_km_rate) * parseFloat(distance_km);

    // Update Trip
    const updatedTrip = await pool.query(
        `UPDATE ambulance_trips 
         SET status = 'Completed', end_time = NOW(), end_location = $1, distance_km = $2, total_cost = $3 
         WHERE id = $4 RETURNING *`,
        [end_location, distance_km, totalCost, trip_id]
    );

    // Auto-Bill
    if (trip.patient_id) {
        await addToInvoice(
            trip.patient_id,
            null, // Admission might not exist yet
            `Ambulance Charge (${distance_km} km)`,
            1,
            totalCost,
            completedBy,
            trip.hospital_id
        );
    }

    ResponseHandler.success(res, { trip: updatedTrip.rows[0], billed_amount: totalCost }, 'Trip Completed and Billed');
});

// Get Active Trips
const getActiveTrips = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    const result = await pool.query(
        `SELECT a.*, p.name as patient_name, u.username as driver_name 
         FROM ambulance_trips a 
         LEFT JOIN patients p ON a.patient_id = p.id 
         LEFT JOIN users u ON a.driver_id = u.id 
         WHERE a.status = 'Dispatched' AND a.hospital_id = $1`,
        [hospitalId]
    );
    ResponseHandler.success(res, result.rows);
});

module.exports = { dispatchAmbulance, completeTrip, getActiveTrips };
