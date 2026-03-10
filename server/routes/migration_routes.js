const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const migrationService = require('../services/migration_service');

// Configure Multer Storage (Staging Area)
const uploadDir = path.join(__dirname, '../uploads/migration_staging');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Routes

/**
 * @route POST /api/migration/upload
 * @desc Upload CSV file to Staging
 * @access Super Admin
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Mock User/Hospital ID for now (In prod, get from req.user)
        const hospitalId = 1; 
        const userId = 1; 

        const job = await migrationService.createJob(req.file, hospitalId, userId);
        res.json({ success: true, job });
    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/migration/validations/:jobId
 * @desc Trigger Dry-Run Validation
 */
router.post('/validations/:jobId', async (req, res) => {
    try {
        const { mappingConfig } = req.body; // e.g., { "name": "Patient Name", "dob": "Date of Birth" }
        if (!mappingConfig) return res.status(400).json({ error: "Mapping config required" });

        const job = await migrationService.validateJob(req.params.jobId, mappingConfig);
        res.json({ success: true, job });
    } catch (err) {
        console.error("Validation Error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/migration/commit/:jobId
 * @desc Commit valid rows to live DB
 */
router.post('/commit/:jobId', async (req, res) => {
    try {
        const result = await migrationService.commitJob(req.params.jobId);
        res.json({ success: true, result });
    } catch (err) {
        console.error("Commit Error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
