/**
 * Google Drive Backup Service
 * Uploads database backups to Google Drive
 * Supports both Service Account and OAuth2 authentication
 */
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Token/Key storage paths
const TOKEN_PATH = path.join(__dirname, '..', 'config', 'gdrive_token.json');
const CREDENTIALS_PATH = path.join(__dirname, '..', 'config', 'gdrive_credentials.json');
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'config', 'service_account.json');

// Scopes for Google Drive access
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

class GoogleDriveService {
    constructor() {
        this.auth = null;
        this.drive = null;
        this.isAuthenticated = false;
        this.authType = null; // 'service_account' or 'oauth2'
        this.pool = null; // Database pool for token storage
    }

    /**
     * Save token to database (for Cloud Run persistence)
     */
    async saveTokenToDb(tokens) {
        if (!this.pool) {
            this.pool = require('../config/db');
        }
        try {
            // Create settings table if not exists
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS system_settings (
                    key VARCHAR(100) PRIMARY KEY,
                    value TEXT,
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            
            await this.pool.query(
                `INSERT INTO system_settings (key, value, updated_at) 
                 VALUES ('gdrive_token', $1, NOW()) 
                 ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
                [JSON.stringify(tokens)]
            );
            console.log('[GoogleDrive] ✅ Token saved to database');
            return true;
        } catch (error) {
            console.error('[GoogleDrive] DB token save error:', error.message);
            return false;
        }
    }

    /**
     * Load token from database
     */
    async loadTokenFromDb() {
        if (!this.pool) {
            this.pool = require('../config/db');
        }
        try {
            // Ensure table exists
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS system_settings (
                    key VARCHAR(100) PRIMARY KEY,
                    value TEXT,
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            
            const result = await this.pool.query(
                `SELECT value FROM system_settings WHERE key = 'gdrive_token'`
            );
            if (result.rows.length > 0) {
                return JSON.parse(result.rows[0].value);
            }
            return null;
        } catch (error) {
            console.error('[GoogleDrive] DB token load error:', error.message);
            return null;
        }
    }

    /**
     * Initialize with Service Account (preferred for servers) or OAuth2
     */
    async initialize() {
        try {
            // Priority 1: Service Account (best for server-side)
            if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
                const keyFile = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
                
                this.auth = new google.auth.GoogleAuth({
                    keyFile: SERVICE_ACCOUNT_PATH,
                    scopes: SCOPES,
                });

                this.drive = google.drive({ version: 'v3', auth: this.auth });
                this.isAuthenticated = true;
                this.authType = 'service_account';
                
                console.log('[GoogleDrive] ✅ Authenticated with Service Account:', keyFile.client_email);
                return true;
            }

            // Priority 2: Environment variables for Service Account
            if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
                const credentials = {
                    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                };

                this.auth = new google.auth.GoogleAuth({
                    credentials,
                    scopes: SCOPES,
                });

                this.drive = google.drive({ version: 'v3', auth: this.auth });
                this.isAuthenticated = true;
                this.authType = 'service_account';
                
                console.log('[GoogleDrive] ✅ Authenticated with Service Account (env)');
                return true;
            }

            // Priority 3: OAuth2 (for personal accounts without service account)
            if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
                this.auth = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET,
                    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/backup/google/callback'
                );

                // Try to load existing token from database first (for Cloud Run)
                const dbToken = await this.loadTokenFromDb();
                if (dbToken) {
                    this.auth.setCredentials(dbToken);
                    this.drive = google.drive({ version: 'v3', auth: this.auth });
                    this.isAuthenticated = true;
                    this.authType = 'oauth2';
                    console.log('[GoogleDrive] ✅ Authenticated with token from database');
                    return true;
                }

                // Fallback: Try file-based token
                if (fs.existsSync(TOKEN_PATH)) {
                    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
                    this.auth.setCredentials(token);
                    this.drive = google.drive({ version: 'v3', auth: this.auth });
                    this.isAuthenticated = true;
                    this.authType = 'oauth2';
                    console.log('[GoogleDrive] ✅ Authenticated with OAuth2 token (file)');
                }

                return true;
            }

            console.log('[GoogleDrive] No credentials found. Add service_account.json to config/');
            return false;
        } catch (error) {
            console.error('[GoogleDrive] Initialize error:', error.message);
            return false;
        }
    }

    /**
     * Get OAuth URL for user authorization (only for OAuth2)
     */
    getAuthUrl() {
        if (!this.auth || this.authType === 'service_account') {
            throw new Error('OAuth not configured or using Service Account');
        }

        return this.auth.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent',
        });
    }

    /**
     * Exchange authorization code for tokens (only for OAuth2)
     */
    async exchangeCodeForToken(code) {
        try {
            const { tokens } = await this.auth.getToken(code);
            this.auth.setCredentials(tokens);

            // Save token to database (persistent for Cloud Run)
            await this.saveTokenToDb(tokens);

            // Also save to file as backup (for local dev)
            try {
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
            } catch (e) {
                console.log('[GoogleDrive] Could not save to file (normal for Cloud Run)');
            }
            
            this.drive = google.drive({ version: 'v3', auth: this.auth });
            this.isAuthenticated = true;
            this.authType = 'oauth2';

            console.log('[GoogleDrive] ✅ Token saved successfully');
            return { success: true };
        } catch (error) {
            console.error('[GoogleDrive] Token exchange error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create folder in Google Drive if not exists
     */
    async getOrCreateFolder(folderName = 'WOLF_HMS_Backups') {
        try {
            // Search for existing folder
            const response = await this.drive.files.list({
                q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name)',
            });

            if (response.data.files.length > 0) {
                return response.data.files[0].id;
            }

            // Create new folder
            const folderMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
            };

            const folder = await this.drive.files.create({
                resource: folderMetadata,
                fields: 'id',
            });

            console.log('[GoogleDrive] Created folder:', folderName);
            return folder.data.id;
        } catch (error) {
            console.error('[GoogleDrive] Folder error:', error.message);
            throw error;
        }
    }

    /**
     * Upload file to Google Drive
     */
    async uploadFile(filePath, progressCallback = null) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated with Google Drive');
        }

        try {
            const folderId = await this.getOrCreateFolder();
            const fileName = path.basename(filePath);
            const fileSize = fs.statSync(filePath).size;

            const fileMetadata = {
                name: fileName,
                parents: [folderId],
            };

            const media = {
                mimeType: 'application/gzip',
                body: fs.createReadStream(filePath),
            };

            console.log(`[GoogleDrive] Uploading ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)...`);

            const response = await this.drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id, name, size, createdTime, webViewLink',
            });

            console.log('[GoogleDrive] ✅ Upload complete:', response.data.name);

            return {
                success: true,
                fileId: response.data.id,
                fileName: response.data.name,
                size: response.data.size,
                createdTime: response.data.createdTime,
                webViewLink: response.data.webViewLink,
            };
        } catch (error) {
            console.error('[GoogleDrive] Upload error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * List backup files in Google Drive
     */
    async listBackups() {
        if (!this.isAuthenticated) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const folderId = await this.getOrCreateFolder();

            const response = await this.drive.files.list({
                q: `'${folderId}' in parents and trashed=false`,
                fields: 'files(id, name, size, createdTime, webViewLink)',
                orderBy: 'createdTime desc',
                pageSize: 50,
            });

            return {
                success: true,
                files: response.data.files.map(f => ({
                    id: f.id,
                    name: f.name,
                    size: parseInt(f.size) || 0,
                    createdTime: f.createdTime,
                    webViewLink: f.webViewLink,
                    source: 'google_drive',
                })),
            };
        } catch (error) {
            console.error('[GoogleDrive] List error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Download backup file from Google Drive
     */
    async downloadFile(fileId, destPath) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated');
        }

        try {
            const dest = fs.createWriteStream(destPath);

            const response = await this.drive.files.get(
                { fileId, alt: 'media' },
                { responseType: 'stream' }
            );

            return new Promise((resolve, reject) => {
                response.data
                    .on('end', () => {
                        console.log('[GoogleDrive] ✅ Download complete');
                        resolve({ success: true, path: destPath });
                    })
                    .on('error', (err) => {
                        reject(err);
                    })
                    .pipe(dest);
            });
        } catch (error) {
            console.error('[GoogleDrive] Download error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete old backups (keep last N)
     */
    async cleanupOldBackups(keepCount = 10) {
        try {
            const { files } = await this.listBackups();
            
            if (files && files.length > keepCount) {
                const toDelete = files.slice(keepCount);
                
                for (const file of toDelete) {
                    await this.drive.files.delete({ fileId: file.id });
                    console.log('[GoogleDrive] Deleted old backup:', file.name);
                }

                return { success: true, deleted: toDelete.length };
            }

            return { success: true, deleted: 0 };
        } catch (error) {
            console.error('[GoogleDrive] Cleanup error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check connection status
     */
    async checkStatus() {
        return {
            initialized: this.oauth2Client !== null,
            authenticated: this.isAuthenticated,
            hasCredentials: fs.existsSync(CREDENTIALS_PATH) || 
                            (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
            hasToken: fs.existsSync(TOKEN_PATH),
        };
    }

    /**
     * Disconnect (revoke access)
     */
    async disconnect() {
        try {
            if (fs.existsSync(TOKEN_PATH)) {
                fs.unlinkSync(TOKEN_PATH);
            }
            this.isAuthenticated = false;
            this.drive = null;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Singleton instance
const googleDriveService = new GoogleDriveService();

module.exports = googleDriveService;
