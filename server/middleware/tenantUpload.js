/**
 * Tenant-Aware Upload Middleware
 * Phase 5: Multi-Tenancy File Storage Isolation
 * 
 * Organizes uploads by hospital code for complete tenant isolation:
 * uploads/{hospital_code}/ocr/
 * uploads/{hospital_code}/documents/
 * uploads/{hospital_code}/reports/
 * uploads/{hospital_code}/images/
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getHospitalId } = require('../utils/tenantHelper');
const { pool } = require('../db');

/**
 * Get hospital code for directory naming
 * Falls back to 'default' if hospital not found
 */
const getHospitalCode = async (req) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) return 'default';
        
        const result = await pool.query(
            'SELECT code FROM hospitals WHERE id = $1',
            [hospitalId]
        );
        
        return result.rows[0]?.code || 'default';
    } catch (error) {
        console.error('Error getting hospital code:', error);
        return 'default';
    }
};

/**
 * Synchronous hospital code getter using cached value from middleware
 * The tenant resolver middleware should set req.hospital
 */
const getHospitalCodeSync = (req) => {
    if (req.hospital?.code) return req.hospital.code;
    if (req.hospitalCode) return req.hospitalCode;
    return 'default';
};

/**
 * Create storage for specific upload type
 * @param {string} uploadType - 'ocr', 'documents', 'reports', 'images'
 */
const createTenantStorage = (uploadType = 'documents') => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            const hospitalCode = getHospitalCodeSync(req);
            const dir = path.join('uploads', hospitalCode, uploadType);
            
            // Create directory if it doesn't exist
            fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const prefix = uploadType === 'ocr' ? 'id-' : '';
            cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
        }
    });
};

/**
 * File filter for security
 */
const fileFilter = (allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']) => {
    return (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
        }
    };
};

/**
 * Pre-configured upload middleware instances
 */

// OCR uploads (ID cards, prescriptions)
const ocrUpload = multer({
    storage: createTenantStorage('ocr'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'])
});

// Document uploads (patient documents, consents)
const documentUpload = multer({
    storage: createTenantStorage('documents'),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    fileFilter: fileFilter(['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
});

// Report uploads (lab reports, radiology)
const reportUpload = multer({
    storage: createTenantStorage('reports'),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: fileFilter(['application/pdf', 'image/jpeg', 'image/png', 'image/dicom'])
});

// Image uploads (general)
const imageUpload = multer({
    storage: createTenantStorage('images'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
});

/**
 * Middleware to set hospital code before multer runs
 * Must be used before any upload middleware
 */
const preFetchHospitalCode = async (req, res, next) => {
    try {
        req.hospitalCode = await getHospitalCode(req);
        next();
    } catch (error) {
        req.hospitalCode = 'default';
        next();
    }
};

/**
 * Get file URL for a tenant-isolated file
 * @param {string} hospitalCode 
 * @param {string} uploadType 
 * @param {string} filename 
 */
const getTenantFileUrl = (hospitalCode, uploadType, filename) => {
    return `/uploads/${hospitalCode}/${uploadType}/${filename}`;
};

/**
 * Delete a tenant-isolated file
 * @param {string} filePath - Full path to file
 */
const deleteTenantFile = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.unlink(filePath, (err) => {
            if (err && err.code !== 'ENOENT') {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

module.exports = {
    // Pre-configured uploads
    ocrUpload,
    documentUpload,
    reportUpload,
    imageUpload,
    
    // Factory function for custom uploads
    createTenantStorage,
    
    // Middleware
    preFetchHospitalCode,
    
    // Utilities
    getHospitalCode,
    getHospitalCodeSync,
    getTenantFileUrl,
    deleteTenantFile
};
