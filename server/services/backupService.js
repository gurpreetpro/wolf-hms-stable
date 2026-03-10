const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const cron = require('node-cron');

// Settings file path
const SETTINGS_FILE = path.join(__dirname, '..', 'config', 'backup_settings.json');

// Default settings
const DEFAULT_SETTINGS = {
    primaryPath: '',
    secondaryPath: '',
    schedule: 'hourly', // hourly, daily, manual
    lastBackup: null,
    autoBackupEnabled: true
};

// Load settings
const loadSettings = () => {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Error loading backup settings:', e);
    }
    return { ...DEFAULT_SETTINGS };
};

// Save settings
const saveSettings = (settings) => {
    try {
        const configDir = path.dirname(SETTINGS_FILE);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        return true;
    } catch (e) {
        console.error('Error saving backup settings:', e);
        return false;
    }
};

// Create directory if not exists
const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// Generate backup filename
const getBackupFilename = () => {
    const date = new Date();
    const dateStr = date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `hms_backup_${dateStr}.sql`;
};

// Run PostgreSQL backup
const runDatabaseBackup = async (targetPath) => {
    return new Promise((resolve, reject) => {
        const filename = getBackupFilename();
        const filePath = path.join(targetPath, filename);

        // PostgreSQL dump command
        const dbUser = process.env.DB_USER || 'postgres';
        const dbName = process.env.DB_NAME || 'hospital_db';
        const dbHost = process.env.DB_HOST || 'localhost';
        const dbPort = process.env.DB_PORT || '5432';

        const cmd = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${filePath}"`;

        exec(cmd, { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || 'password' } }, (error, stdout, stderr) => {
            if (error) {
                console.error('Backup error:', error);
                reject(error);
            } else {
                console.log(`✅ Backup created: ${filePath}`);
                resolve(filePath);
            }
        });
    });
};

// Copy file to secondary location
const copyToSecondary = async (sourceFile, secondaryPath) => {
    return new Promise((resolve, reject) => {
        const filename = path.basename(sourceFile);
        const destFile = path.join(secondaryPath, filename);

        fs.copyFile(sourceFile, destFile, (err) => {
            if (err) {
                console.error('Copy error:', err);
                reject(err);
            } else {
                console.log(`✅ Copied to secondary: ${destFile}`);
                resolve(destFile);
            }
        });
    });
};

// Import Google Drive Service
const googleDriveService = require('./GoogleDriveService');

// ... (existing imports match top of file, but we are inside replace, so just adding logic inside runBackup)

// Run full backup
const runBackup = async () => {
    const settings = loadSettings();

    if (!settings.primaryPath || !settings.secondaryPath) {
        throw new Error('Backup paths not configured');
    }

    // Ensure directories exist
    ensureDir(settings.primaryPath);
    ensureDir(settings.secondaryPath);

    // Run backup to primary
    const primaryFile = await runDatabaseBackup(settings.primaryPath);

    // Copy to secondary
    await copyToSecondary(primaryFile, settings.secondaryPath);

    // Update last backup time
    settings.lastBackup = new Date().toISOString();
    saveSettings(settings);

    // [NEW] Upload to Google Drive
    let gDriveResult = { success: false, message: 'Skipped (Not Configured)' };
    try {
        console.log('☁️ Initiating Google Drive Upload...');
        const isAuth = await googleDriveService.initialize();
        if (isAuth) {
            const upload = await googleDriveService.uploadFile(primaryFile);
            if (upload.success) {
                gDriveResult = { success: true, fileId: upload.fileId, link: upload.webViewLink };
                console.log('✅ Google Drive Upload Success:', upload.fileId);
            } else {
                gDriveResult = { success: false, error: upload.error };
            }
        } else {
            console.warn('⚠️ Google Drive not authenticated. Check .env');
        }
    } catch (gdErr) {
        console.error('❌ Google Drive Upload Failed:', gdErr.message);
        gDriveResult = { success: false, error: gdErr.message };
    }

    return {
        success: true,
        primaryFile,
        secondaryFile: path.join(settings.secondaryPath, path.basename(primaryFile)),
        timestamp: settings.lastBackup,
        googleDrive: gDriveResult
    };
};

// Test paths (check if directories are writable)
const testPaths = (primaryPath, secondaryPath) => {
    const results = { primary: false, secondary: false, errors: [] };

    try {
        ensureDir(primaryPath);
        const testFile = path.join(primaryPath, '.test_write');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        results.primary = true;
    } catch (e) {
        results.errors.push(`Primary: ${e.message}`);
    }

    try {
        ensureDir(secondaryPath);
        const testFile = path.join(secondaryPath, '.test_write');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        results.secondary = true;
    } catch (e) {
        results.errors.push(`Secondary: ${e.message}`);
    }

    return results;
};

// Schedule cron jobs
let scheduledJob = null;

const setupSchedule = () => {
    const settings = loadSettings();

    // Cancel existing job
    if (scheduledJob) {
        scheduledJob.stop();
        scheduledJob = null;
    }

    if (!settings.autoBackupEnabled || !settings.primaryPath || !settings.secondaryPath) {
        console.log('⏸️ Auto backup disabled or paths not configured');
        return;
    }

    let cronSchedule;
    switch (settings.schedule) {
        case 'hourly':
            cronSchedule = '0 * * * *'; // Every hour
            break;
        case 'daily':
            cronSchedule = '0 2 * * *'; // 2 AM daily
            break;
        case 'every6hours':
            cronSchedule = '0 */6 * * *'; // Every 6 hours
            break;
        default:
            console.log('📋 Manual backup mode');
            return;
    }

    scheduledJob = cron.schedule(cronSchedule, async () => {
        console.log('⏰ Running scheduled backup...');
        try {
            await runBackup();
            console.log('✅ Scheduled backup completed');
        } catch (e) {
            console.error('❌ Scheduled backup failed:', e);
        }
    });

    console.log(`📅 Backup scheduled: ${settings.schedule}`);
};

// Cleanup old backups (keep last N)
const cleanupOldBackups = async (dirPath, keepCount = 10) => {
    try {
        const files = fs.readdirSync(dirPath)
            .filter(f => f.startsWith('hms_backup_') && f.endsWith('.sql'))
            .map(f => ({ name: f, path: path.join(dirPath, f), time: fs.statSync(path.join(dirPath, f)).mtime }))
            .sort((a, b) => b.time - a.time);

        if (files.length > keepCount) {
            const toDelete = files.slice(keepCount);
            for (const file of toDelete) {
                fs.unlinkSync(file.path);
                console.log(`🗑️ Deleted old backup: ${file.name}`);
            }
        }
    } catch (e) {
        console.error('Cleanup error:', e);
    }
};

// List available backups from both directories
const listBackups = () => {
    const settings = loadSettings();
    const backups = [];

    const scanDir = (dirPath, source) => {
        if (!dirPath || !fs.existsSync(dirPath)) return;

        try {
            const files = fs.readdirSync(dirPath)
                .filter(f => f.startsWith('hms_backup_') && f.endsWith('.sql'));

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stats = fs.statSync(filePath);

                // Check if already in list
                const existing = backups.find(b => b.name === file);
                if (existing) {
                    existing.sources.push(source);
                } else {
                    backups.push({
                        name: file,
                        path: filePath,
                        size: stats.size,
                        created: stats.mtime,
                        sources: [source]
                    });
                }
            }
        } catch (e) {
            console.error(`Error scanning ${source}:`, e);
        }
    };

    scanDir(settings.primaryPath, 'primary');
    scanDir(settings.secondaryPath, 'secondary');

    // Sort by date, newest first
    backups.sort((a, b) => new Date(b.created) - new Date(a.created));

    return backups;
};

// Restore database from backup file
const restoreDatabase = async (backupPath) => {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(backupPath)) {
            return reject(new Error('Backup file not found'));
        }

        const dbUser = process.env.DB_USER || 'postgres';
        const dbName = process.env.DB_NAME || 'hospital_db';
        const dbHost = process.env.DB_HOST || 'localhost';
        const dbPort = process.env.DB_PORT || '5432';

        // Drop and recreate database, then restore
        // Using psql with the backup file
        const cmd = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${backupPath}"`;

        console.log(`🔄 Starting restore from: ${backupPath}`);

        exec(cmd, {
            env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || 'password' },
            maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large restores
        }, (error, stdout, stderr) => {
            if (error) {
                console.error('Restore error:', error);
                // Check if it's just warnings (common with pg_dump/restore)
                if (stderr && !stderr.includes('ERROR')) {
                    console.log('Restore completed with warnings');
                    resolve({ success: true, warnings: stderr });
                } else {
                    reject(error);
                }
            } else {
                console.log('✅ Database restored successfully');
                resolve({ success: true, message: 'Database restored successfully' });
            }
        });
    });
};

// Verify backup file is valid (basic check)
const verifyBackup = (backupPath) => {
    try {
        if (!fs.existsSync(backupPath)) {
            return { valid: false, error: 'File not found' };
        }

        const stats = fs.statSync(backupPath);
        if (stats.size < 1000) {
            return { valid: false, error: 'Backup file too small, may be corrupted' };
        }

        // Read first few lines to verify it's a valid SQL dump
        const content = fs.readFileSync(backupPath, 'utf8').slice(0, 500);
        if (content.includes('PostgreSQL database dump') || content.includes('pg_dump')) {
            return { valid: true, size: stats.size };
        }

        return { valid: false, error: 'Not a valid PostgreSQL dump file' };
    } catch (e) {
        return { valid: false, error: e.message };
    }
};

module.exports = {
    loadSettings,
    saveSettings,
    runBackup,
    testPaths,
    setupSchedule,
    cleanupOldBackups,
    listBackups,
    restoreDatabase,
    verifyBackup,
    DEFAULT_SETTINGS
};
