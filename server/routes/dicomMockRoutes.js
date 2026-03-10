/**
 * WolfBridge DICOM MWL Mock Server
 * Simulates a DICOM Modality Worklist (MWL) provider for testing
 * 
 * This mock service allows testing of the RIS workflow without physical DICOM hardware.
 * It exposes REST endpoints that simulate DICOM C-FIND responses.
 * 
 * In production, this would be replaced by actual DICOM listeners using dcmjs-dimse or Orthanc.
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// ==================== MWL Query Endpoints ====================

/**
 * GET /api/dicom/mwl
 * Simulates a DICOM C-FIND MWL query
 * Returns scheduled radiology orders in DICOM-like format
 */
const getModalityWorklist = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id || 1;
    const { modality, scheduled_date, status } = req.query;
    
    let query = `
        SELECT 
            ro.id,
            ro.accession_number,
            ro.modality,
            ro.study_description,
            ro.scheduled_date,
            ro.scheduled_time,
            ro.status,
            ro.priority,
            ro.referring_physician,
            ro.performing_technician,
            p.id as patient_id,
            p.name as patient_name,
            p.uhid as patient_id_dicom,
            p.dob as patient_dob,
            p.gender as patient_sex,
            a.id as admission_id,
            a.ipd_number
        FROM radiology_orders ro
        JOIN patients p ON ro.patient_id = p.id
        LEFT JOIN admissions a ON ro.admission_id = a.id
        WHERE ro.hospital_id = $1
    `;
    const params = [hospitalId];
    let paramIndex = 2;

    if (modality) {
        query += ` AND ro.modality = $${paramIndex}`;
        params.push(modality);
        paramIndex++;
    }

    if (scheduled_date) {
        query += ` AND ro.scheduled_date = $${paramIndex}`;
        params.push(scheduled_date);
        paramIndex++;
    }

    if (status) {
        query += ` AND ro.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
    } else {
        // Default: Only scheduled orders (not completed)
        query += ` AND ro.status IN ('Scheduled', 'In Progress')`;
    }

    query += ` ORDER BY ro.scheduled_date, ro.scheduled_time LIMIT 100`;

    const result = await pool.query(query, params);

    // Convert to DICOM-like worklist format
    const worklist = result.rows.map(order => ({
        // DICOM Patient Module
        PatientName: order.patient_name,
        PatientID: order.patient_id_dicom || order.patient_id,
        PatientBirthDate: formatDicomDate(order.patient_dob),
        PatientSex: order.patient_sex === 'Male' ? 'M' : order.patient_sex === 'Female' ? 'F' : 'O',
        
        // DICOM Scheduled Procedure Step
        ScheduledProcedureStepID: order.id.toString(),
        AccessionNumber: order.accession_number,
        Modality: order.modality,
        ScheduledStationAETitle: `WOLF_${order.modality}`,
        ScheduledProcedureStepStartDate: formatDicomDate(order.scheduled_date),
        ScheduledProcedureStepStartTime: formatDicomTime(order.scheduled_time),
        ScheduledProcedureStepDescription: order.study_description,
        
        // DICOM Requested Procedure
        RequestedProcedureID: order.accession_number,
        RequestedProcedureDescription: order.study_description,
        RequestedProcedurePriority: order.priority || 'ROUTINE',
        
        // DICOM Imaging Service Request
        ReferringPhysicianName: order.referring_physician,
        
        // Wolf HMS Specific
        _wolf: {
            order_id: order.id,
            admission_id: order.admission_id,
            ipd_number: order.ipd_number,
            status: order.status,
            performing_technician: order.performing_technician
        }
    }));

    ResponseHandler.success(res, {
        count: worklist.length,
        worklist,
        dicom_response: {
            status: 'SUCCESS',
            message: 'MWL query completed',
            timestamp: new Date().toISOString()
        }
    });
});

/**
 * POST /api/dicom/mpps/start
 * Simulates DICOM Modality Performed Procedure Step (MPPS) - Start
 * Called when a modality starts performing a procedure
 */
const startProcedure = asyncHandler(async (req, res) => {
    const { accession_number, performing_technician, station_ae_title } = req.body;
    const hospitalId = req.hospital_id || 1;

    // Update order status to "In Progress"
    const result = await pool.query(
        `UPDATE radiology_orders 
         SET status = 'In Progress', 
             performing_technician = COALESCE($1, performing_technician),
             started_at = NOW(),
             modality_ae_title = $2
         WHERE accession_number = $3 AND hospital_id = $4
         RETURNING *`,
        [performing_technician, station_ae_title, accession_number, hospitalId]
    );

    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Order not found', 404);
    }

    ResponseHandler.success(res, {
        mpps_status: 'IN PROGRESS',
        order: result.rows[0],
        dicom_response: {
            status: 'SUCCESS',
            message: 'MPPS N-CREATE accepted',
            timestamp: new Date().toISOString()
        }
    });
});

/**
 * POST /api/dicom/mpps/complete
 * Simulates DICOM MPPS - Complete
 * Called when a modality completes a procedure
 */
const completeProcedure = asyncHandler(async (req, res) => {
    const { accession_number, study_instance_uid, series_count, image_count, dose_report } = req.body;
    const hospitalId = req.hospital_id || 1;

    // Update order status to "Completed"
    const result = await pool.query(
        `UPDATE radiology_orders 
         SET status = 'Completed', 
             completed_at = NOW(),
             study_instance_uid = $1,
             series_count = $2,
             image_count = $3,
             dose_report = $4
         WHERE accession_number = $5 AND hospital_id = $6
         RETURNING *`,
        [study_instance_uid, series_count, image_count, JSON.stringify(dose_report), accession_number, hospitalId]
    );

    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Order not found', 404);
    }

    ResponseHandler.success(res, {
        mpps_status: 'COMPLETED',
        order: result.rows[0],
        dicom_response: {
            status: 'SUCCESS',
            message: 'MPPS N-SET (COMPLETED) accepted',
            timestamp: new Date().toISOString()
        }
    });
});

/**
 * POST /api/dicom/cstore
 * Simulates DICOM C-STORE (Image Storage)
 * In production, this would be handled by Orthanc PACS
 */
const simulateCStore = asyncHandler(async (req, res) => {
    const { accession_number, study_instance_uid, series_instance_uid, sop_instance_uid, image_data_base64 } = req.body;
    const hospitalId = req.hospital_id || 1;

    // Log the simulated image storage
    console.log(`[DICOM Mock] C-STORE received for Accession: ${accession_number}`);
    console.log(`[DICOM Mock] Study UID: ${study_instance_uid}`);
    console.log(`[DICOM Mock] In production, this would be stored in Orthanc PACS`);

    // Update the order with image reference
    await pool.query(
        `UPDATE radiology_orders 
         SET study_instance_uid = COALESCE(study_instance_uid, $1),
             image_count = COALESCE(image_count, 0) + 1
         WHERE accession_number = $2 AND hospital_id = $3`,
        [study_instance_uid, accession_number, hospitalId]
    );

    ResponseHandler.success(res, {
        cstore_status: 'SUCCESS',
        message: 'Image received (Mock - would be stored in Orthanc)',
        study_instance_uid,
        dicom_response: {
            status: '0000', // DICOM Success Status
            message: 'C-STORE accepted',
            timestamp: new Date().toISOString()
        }
    });
});

/**
 * GET /api/dicom/wado/:study_instance_uid
 * Simulates WADO-RS (Web Access to DICOM Objects)
 * Returns study metadata for OHIF viewer integration
 */
const getStudyMetadata = asyncHandler(async (req, res) => {
    const { study_instance_uid } = req.params;
    const hospitalId = req.hospital_id || 1;

    const result = await pool.query(
        `SELECT ro.*, p.name as patient_name, p.uhid, p.dob, p.gender
         FROM radiology_orders ro
         JOIN patients p ON ro.patient_id = p.id
         WHERE ro.study_instance_uid = $1 AND ro.hospital_id = $2`,
        [study_instance_uid, hospitalId]
    );

    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Study not found', 404);
    }

    const order = result.rows[0];

    // Return DICOM JSON metadata (simplified for mock)
    ResponseHandler.success(res, {
        study: {
            StudyInstanceUID: order.study_instance_uid,
            AccessionNumber: order.accession_number,
            StudyDate: formatDicomDate(order.scheduled_date),
            StudyDescription: order.study_description,
            Modality: order.modality,
            PatientName: order.patient_name,
            PatientID: order.uhid,
            PatientBirthDate: formatDicomDate(order.dob),
            PatientSex: order.gender === 'Male' ? 'M' : order.gender === 'Female' ? 'F' : 'O',
            ReferringPhysicianName: order.referring_physician,
            SeriesCount: order.series_count || 0,
            ImageCount: order.image_count || 0
        },
        // OHIF Viewer compatible format
        ohif_viewer_url: `/viewer/${study_instance_uid}`,
        orthanc_url: `http://localhost:8042/studies/${study_instance_uid}` // Mock Orthanc URL
    });
});

// ==================== Helper Functions ====================

function formatDicomDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
}

function formatDicomTime(time) {
    if (!time) return '';
    // Assume time is in HH:MM or HH:MM:SS format
    return time.replace(/:/g, ''); // HHMMSS
}

// ==================== Routes ====================

router.get('/mwl', getModalityWorklist);
router.post('/mpps/start', startProcedure);
router.post('/mpps/complete', completeProcedure);
router.post('/cstore', simulateCStore);
router.get('/wado/:study_instance_uid', getStudyMetadata);

// Health check for DICOM mock service
router.get('/echo', (req, res) => {
    res.json({
        service: 'WolfBridge DICOM Mock',
        status: 'ONLINE',
        version: '1.0.0',
        supported_services: ['MWL', 'MPPS', 'C-STORE (Mock)', 'WADO-RS (Mock)'],
        timestamp: new Date().toISOString(),
        note: 'This is a simulation service. In production, use Orthanc PACS with dcmjs-dimse.'
    });
});

module.exports = router;
