/**
 * Orthanc PACS Webhook Handler
 * Receives notifications from Orthanc when new DICOM studies/series/instances arrive
 * 
 * Orthanc is an open-source PACS server that can be configured to send HTTP callbacks
 * when DICOM images are stored. This service processes those callbacks and updates
 * the Wolf HMS radiology orders accordingly.
 * 
 * @see https://book.orthanc-server.com/users/lua.html#callbacks
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../services/Logger');

// Orthanc webhook secret for validation (should be in environment variables)
const ORTHANC_WEBHOOK_SECRET = process.env.ORTHANC_WEBHOOK_SECRET || 'wolf-orthanc-secret-2026';

/**
 * POST /api/pacs/webhook/instance
 * Called by Orthanc when a new DICOM instance (image) is stored
 */
const onInstanceStored = asyncHandler(async (req, res) => {
    const { secret } = req.headers;
    
    // Validate webhook secret
    if (secret !== ORTHANC_WEBHOOK_SECRET) {
        logger.warn('[Orthanc] Invalid webhook secret received');
        return res.status(401).json({ error: 'Invalid secret' });
    }

    const {
        ID: orthancInstanceId,
        ParentSeries: orthancSeriesId,
        MainDicomTags
    } = req.body;

    const sopInstanceUID = MainDicomTags?.SOPInstanceUID;
    const instanceNumber = MainDicomTags?.InstanceNumber;

    logger.info(`[Orthanc] Instance stored: ${orthancInstanceId} (SOP: ${sopInstanceUID})`);

    // We don't update the order for every instance, just log it
    // The real update happens at series/study level

    res.json({ 
        status: 'received',
        orthanc_id: orthancInstanceId,
        message: 'Instance notification acknowledged'
    });
});

/**
 * POST /api/pacs/webhook/series
 * Called by Orthanc when a new DICOM series is complete
 */
const onSeriesComplete = asyncHandler(async (req, res) => {
    const { secret } = req.headers;
    
    if (secret !== ORTHANC_WEBHOOK_SECRET) {
        return res.status(401).json({ error: 'Invalid secret' });
    }

    const {
        ID: orthancSeriesId,
        ParentStudy: orthancStudyId,
        MainDicomTags,
        Instances
    } = req.body;

    const seriesInstanceUID = MainDicomTags?.SeriesInstanceUID;
    const modality = MainDicomTags?.Modality;
    const seriesDescription = MainDicomTags?.SeriesDescription;
    const imageCount = Instances?.length || 0;

    logger.info(`[Orthanc] Series complete: ${seriesInstanceUID} (${modality}, ${imageCount} images)`);

    // Update the radiology order with series info
    // We need to find the order by study UID (from parent study)
    // For now, we'll just acknowledge

    res.json({
        status: 'received',
        orthanc_series_id: orthancSeriesId,
        series_uid: seriesInstanceUID,
        modality,
        image_count: imageCount,
        message: 'Series notification acknowledged'
    });
});

/**
 * POST /api/pacs/webhook/study
 * Called by Orthanc when a DICOM study is complete (stable)
 * This is the main trigger for updating Wolf HMS radiology orders
 */
const onStudyComplete = asyncHandler(async (req, res) => {
    const { secret } = req.headers;
    
    if (secret !== ORTHANC_WEBHOOK_SECRET) {
        return res.status(401).json({ error: 'Invalid secret' });
    }

    const {
        ID: orthancStudyId,
        MainDicomTags,
        PatientMainDicomTags,
        Series
    } = req.body;

    const studyInstanceUID = MainDicomTags?.StudyInstanceUID;
    const accessionNumber = MainDicomTags?.AccessionNumber;
    const studyDescription = MainDicomTags?.StudyDescription;
    const studyDate = MainDicomTags?.StudyDate;
    const referringPhysician = MainDicomTags?.ReferringPhysicianName;
    
    const patientName = PatientMainDicomTags?.PatientName;
    const patientID = PatientMainDicomTags?.PatientID;
    
    const seriesCount = Series?.length || 0;
    const totalImages = Series?.reduce((sum, s) => sum + (s.Instances?.length || 0), 0) || 0;

    logger.info(`[Orthanc] Study complete: ${accessionNumber} (${studyInstanceUID})`);
    logger.info(`[Orthanc] Patient: ${patientName} (${patientID}), ${seriesCount} series, ${totalImages} images`);

    // Find and update the radiology order by accession number
    if (accessionNumber) {
        try {
            const result = await pool.query(
                `UPDATE radiology_orders 
                 SET status = 'Completed',
                     study_instance_uid = $1,
                     series_count = $2,
                     image_count = $3,
                     orthanc_study_id = $4,
                     completed_at = NOW(),
                     pacs_synced = TRUE
                 WHERE accession_number = $5
                 RETURNING id, patient_id, hospital_id`,
                [studyInstanceUID, seriesCount, totalImages, orthancStudyId, accessionNumber]
            );

            if (result.rows.length > 0) {
                const order = result.rows[0];
                logger.info(`[Orthanc] Updated order ID ${order.id} for accession ${accessionNumber}`);

                // Emit real-time notification via Socket.IO
                if (global.io) {
                    global.io.to(`hosp_${order.hospital_id}_radiology`).emit('study_complete', {
                        order_id: order.id,
                        accession_number: accessionNumber,
                        study_uid: studyInstanceUID,
                        series_count: seriesCount,
                        image_count: totalImages,
                        viewer_url: `/api/dicom/wado/${studyInstanceUID}`
                    });
                }

                return res.json({
                    status: 'updated',
                    order_id: order.id,
                    accession_number: accessionNumber,
                    study_uid: studyInstanceUID,
                    message: 'Radiology order updated successfully'
                });
            } else {
                logger.warn(`[Orthanc] No order found for accession: ${accessionNumber}`);
                return res.json({
                    status: 'orphaned',
                    accession_number: accessionNumber,
                    message: 'No matching order found - study stored but not linked'
                });
            }
        } catch (err) {
            logger.error(`[Orthanc] DB Update Error: ${err.message}`);
            return res.status(500).json({ error: 'Database update failed', details: err.message });
        }
    } else {
        logger.warn('[Orthanc] Study received without accession number');
        return res.json({
            status: 'no_accession',
            study_uid: studyInstanceUID,
            message: 'Study has no accession number - cannot link to order'
        });
    }
});

/**
 * POST /api/pacs/webhook/patient
 * Called by Orthanc when patient data is updated
 */
const onPatientUpdated = asyncHandler(async (req, res) => {
    const { secret } = req.headers;
    
    if (secret !== ORTHANC_WEBHOOK_SECRET) {
        return res.status(401).json({ error: 'Invalid secret' });
    }

    const { ID: orthancPatientId, MainDicomTags } = req.body;
    
    logger.info(`[Orthanc] Patient updated: ${MainDicomTags?.PatientName} (${MainDicomTags?.PatientID})`);

    res.json({
        status: 'received',
        orthanc_patient_id: orthancPatientId,
        message: 'Patient notification acknowledged'
    });
});

/**
 * GET /api/pacs/studies/:orthanc_study_id
 * Proxy to fetch study details from Orthanc
 */
const getOrthancStudy = asyncHandler(async (req, res) => {
    const { orthanc_study_id } = req.params;
    const ORTHANC_URL = process.env.ORTHANC_URL || 'http://localhost:8042';

    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`${ORTHANC_URL}/studies/${orthanc_study_id}`, {
            headers: {
                'Authorization': `Basic ${Buffer.from('orthanc:orthanc').toString('base64')}`
            }
        });

        if (!response.ok) {
            return ResponseHandler.error(res, 'Study not found in Orthanc', 404);
        }

        const studyData = await response.json();
        ResponseHandler.success(res, { study: studyData });

    } catch (err) {
        logger.error(`[Orthanc] Fetch error: ${err.message}`);
        ResponseHandler.error(res, 'Failed to fetch from Orthanc', 500);
    }
});

/**
 * GET /api/pacs/viewer/:study_instance_uid
 * Get OHIF Viewer URL for a study
 */
const getViewerUrl = asyncHandler(async (req, res) => {
    const { study_instance_uid } = req.params;
    const hospitalId = req.hospital_id || 1;

    // Find the order and Orthanc study ID
    const result = await pool.query(
        `SELECT orthanc_study_id, accession_number, study_description 
         FROM radiology_orders 
         WHERE study_instance_uid = $1 AND hospital_id = $2`,
        [study_instance_uid, hospitalId]
    );

    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Study not found', 404);
    }

    const order = result.rows[0];
    const ORTHANC_URL = process.env.ORTHANC_URL || 'http://localhost:8042';
    const OHIF_URL = process.env.OHIF_VIEWER_URL || 'http://localhost:3000';

    ResponseHandler.success(res, {
        study_instance_uid,
        accession_number: order.accession_number,
        description: order.study_description,
        viewer_urls: {
            ohif: `${OHIF_URL}/viewer?StudyInstanceUIDs=${study_instance_uid}`,
            orthanc_explorer: `${ORTHANC_URL}/app/explorer.html#study?uuid=${order.orthanc_study_id}`,
            wado_rs: `${ORTHANC_URL}/dicom-web/studies/${study_instance_uid}`
        }
    });
});

/**
 * GET /api/pacs/status
 * Check Orthanc PACS connection status
 */
const getPacsStatus = asyncHandler(async (req, res) => {
    const ORTHANC_URL = process.env.ORTHANC_URL || 'http://localhost:8042';

    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`${ORTHANC_URL}/system`, {
            headers: {
                'Authorization': `Basic ${Buffer.from('orthanc:orthanc').toString('base64')}`
            },
            timeout: 5000
        });

        if (response.ok) {
            const systemInfo = await response.json();
            ResponseHandler.success(res, {
                status: 'connected',
                orthanc_version: systemInfo.Version,
                dicom_aet: systemInfo.DicomAet,
                storage_size: systemInfo.TotalDiskSizeMB,
                studies_count: systemInfo.CountStudies || 'N/A',
                url: ORTHANC_URL
            });
        } else {
            ResponseHandler.success(res, {
                status: 'error',
                message: 'Orthanc responded with error',
                http_status: response.status
            });
        }
    } catch (err) {
        ResponseHandler.success(res, {
            status: 'disconnected',
            message: 'Cannot connect to Orthanc PACS',
            error: err.message,
            url: ORTHANC_URL,
            hint: 'Ensure Orthanc is running and accessible'
        });
    }
});

// ==================== Routes ====================

// Webhook endpoints (called by Orthanc)
router.post('/webhook/instance', onInstanceStored);
router.post('/webhook/series', onSeriesComplete);
router.post('/webhook/study', onStudyComplete);
router.post('/webhook/patient', onPatientUpdated);

// API endpoints (called by Wolf HMS frontend)
router.get('/studies/:orthanc_study_id', getOrthancStudy);
router.get('/viewer/:study_instance_uid', getViewerUrl);
router.get('/status', getPacsStatus);

module.exports = router;
