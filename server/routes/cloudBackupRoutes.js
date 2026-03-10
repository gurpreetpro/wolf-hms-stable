/**
 * Google Drive Backup Routes
 * API endpoints for cloud backup management
 */
const express = require('express');
const router = express.Router();
const googleDrive = require('../services/GoogleDriveService');
const backupService = require('../services/backupService');
const path = require('path');
const fs = require('fs');

// Initialize Google Drive on startup
googleDrive.initialize();

/**
 * GET /api/backup/google/status
 * Check Google Drive connection status
 */
router.get('/google/status', async (req, res) => {
    try {
        const status = await googleDrive.checkStatus();
        res.json({ success: true, ...status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/backup/google/auth-url
 * Get OAuth authorization URL
 */
router.get('/google/auth-url', async (req, res) => {
    try {
        await googleDrive.initialize();
        const url = googleDrive.getAuthUrl();
        res.json({ success: true, authUrl: url });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/backup/google/callback
 * OAuth callback handler
 */
router.get('/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        
        if (!code) {
            return res.status(400).send('Authorization code missing');
        }

        const result = await googleDrive.exchangeCodeForToken(code);
        
        if (result.success) {
            // Redirect to settings page with success message
            res.send(`
                <html>
                <head><title>Google Drive Connected</title></head>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1>✅ Google Drive Connected!</h1>
                    <p>You can close this window and return to WOLF HMS.</p>
                    <script>
                        setTimeout(() => window.close(), 3000);
                    </script>
                </body>
                </html>
            `);
        } else {
            res.status(400).send(`Error: ${result.error}`);
        }
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
    }
});

/**
 * GET /api/backup/google/list
 * List backups in Google Drive
 */
router.get('/google/list', async (req, res) => {
    try {
        const result = await googleDrive.listBackups();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/backup/google/upload
 * Upload latest local backup to Google Drive
 */
router.post('/google/upload', async (req, res) => {
    try {
        // Get latest local backup
        const backups = await backupService.listBackups();
        
        if (!backups.backups || backups.backups.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'No local backups found. Run a local backup first.' 
            });
        }

        const latestBackup = backups.backups[0];
        
        // Upload to Google Drive
        const result = await googleDrive.uploadFile(latestBackup.path);
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/backup/google/upload-custom
 * Upload specific file to Google Drive
 */
router.post('/google/upload-custom', async (req, res) => {
    try {
        const { filePath } = req.body;
        
        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(400).json({ success: false, error: 'File not found' });
        }

        const result = await googleDrive.uploadFile(filePath);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/backup/google/backup-and-upload
 * Run local backup and upload to Google Drive
 */
router.post('/google/backup-and-upload', async (req, res) => {
    try {
        // Step 1: Run local backup
        console.log('[Backup] Running local backup...');
        const backupResult = await backupService.runBackup();
        
        if (!backupResult.success) {
            return res.status(500).json({ 
                success: false, 
                error: 'Local backup failed: ' + backupResult.error 
            });
        }

        // Step 2: Upload to Google Drive
        console.log('[Backup] Uploading to Google Drive...');
        const uploadResult = await googleDrive.uploadFile(backupResult.primaryFile);
        
        // Step 3: Cleanup old cloud backups
        await googleDrive.cleanupOldBackups(10);

        res.json({
            success: true,
            localBackup: backupResult,
            cloudBackup: uploadResult,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/backup/google/download/:fileId
 * Download backup from Google Drive
 */
router.post('/google/download/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const destPath = path.join(__dirname, '..', 'temp', `gdrive_${Date.now()}.sql.gz`);

        // Ensure temp directory exists
        const tempDir = path.dirname(destPath);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const result = await googleDrive.downloadFile(fileId, destPath);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/backup/google/disconnect
 * Disconnect Google Drive
 */
router.delete('/google/disconnect', async (req, res) => {
    try {
        const result = await googleDrive.disconnect();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/backup/google/cleanup
 * Cleanup old backups from Google Drive
 */
router.post('/google/cleanup', async (req, res) => {
    try {
        const { keepCount = 10 } = req.body;
        const result = await googleDrive.cleanupOldBackups(keepCount);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
