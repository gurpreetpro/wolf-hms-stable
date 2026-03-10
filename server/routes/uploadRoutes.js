/**
 * Upload Routes
 * Handles file uploads for hospital branding and assets
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/authMiddleware');
const { preFetchHospitalCode, getHospitalCodeSync } = require('../middleware/tenantUpload');
const ResponseHandler = require('../utils/responseHandler');

// Logo-specific storage configuration
const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const hospitalCode = getHospitalCodeSync(req);
        const dir = path.join('uploads', hospitalCode, 'branding');
        
        // Create directory if it doesn't exist
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Always name it 'logo' with timestamp for cache busting
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `logo-${Date.now()}${ext}`);
    }
});

// Logo file filter - JPEG and PNG only
const logoFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG and PNG files are allowed for logos'), false);
    }
};

// Logo upload middleware - 2MB max
const logoUpload = multer({
    storage: logoStorage,
    limits: { 
        fileSize: 2 * 1024 * 1024 // 2MB
    },
    fileFilter: logoFilter
});

/**
 * POST /api/upload/logo
 * Upload hospital logo
 */
router.post('/logo', 
    authenticateToken,
    preFetchHospitalCode,
    logoUpload.single('logo'),
    async (req, res) => {
        try {
            if (!req.file) {
                return ResponseHandler.error(res, 'No file uploaded', 400);
            }

            const hospitalCode = getHospitalCodeSync(req);
            const logoUrl = `/uploads/${hospitalCode}/branding/${req.file.filename}`;
            
            console.log(`[Upload] Logo uploaded for ${hospitalCode}: ${logoUrl}`);
            
            ResponseHandler.success(res, { 
                url: logoUrl,
                filename: req.file.filename,
                size: req.file.size,
                message: 'Logo uploaded successfully'
            });
        } catch (error) {
            console.error('[Upload] Logo upload error:', error);
            ResponseHandler.error(res, error.message || 'Upload failed', 500);
        }
    }
);

// Error handler for multer errors
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return ResponseHandler.error(res, 'File too large. Maximum size is 2MB.', 400);
        }
        return ResponseHandler.error(res, error.message, 400);
    }
    if (error) {
        return ResponseHandler.error(res, error.message, 400);
    }
    next();
});

module.exports = router;
