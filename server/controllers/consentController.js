const { pool } = require('../config/db');
const prisma = require('../config/prisma');

// Log a new consent action
exports.logConsent = async (req, res) => {
    try {
        const { patient_id, consent_type, status, version, notes } = req.body;
        const hospital_id = req.user.hospital_id; // Secured by middleware

        // Basic validation
        if (!patient_id || !consent_type || !status) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Record in Prisma
        const log = await prisma.patient_consent_logs.create({
            data: {
                patient_id,
                consent_type,
                status,
                version,
                notes,
                hospital_id,
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.headers['user-agent'],
                granted_at: new Date(),
                revoked_at: status === 'REVOKED' || status === 'DENIED' ? new Date() : null
            }
        });

        res.json({ success: true, data: log });
    } catch (error) {
        console.error('Log Consent Error:', error);
        res.status(500).json({ success: false, message: 'Failed to log consent' });
    }
};

// Get consent history for a patient
exports.getConsentHistory = async (req, res) => {
    try {
        const { patient_id } = req.params;

        // Retrieve logs
        const logs = await prisma.patient_consent_logs.findMany({
            where: { patient_id: patient_id },
            orderBy: { granted_at: 'desc' }
        });

        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('Get Consent History Error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve history' });
    }
};

// Revoke consent (shortcut)
exports.revokeConsent = async (req, res) => {
    try {
        const { patient_id, consent_type, notes } = req.body;
        const hospital_id = req.user.hospital_id;

        const log = await prisma.patient_consent_logs.create({
            data: {
                patient_id,
                consent_type,
                status: 'REVOKED',
                notes: notes || 'User revoked consent via API',
                hospital_id,
                ip_address: req.ip,
                user_agent: req.headers['user-agent'],
                granted_at: new Date(),
                revoked_at: new Date()
            }
        });

        res.json({ success: true, message: 'Consent revoked', data: log });
    } catch (error) {
        console.error('Revoke Consent Error:', error);
        res.status(500).json({ success: false, message: 'Failed to revoke consent' });
    }
};
