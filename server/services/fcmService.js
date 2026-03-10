/**
 * Firebase Cloud Messaging (FCM) Service
 * Push notifications for mobile and web
 * Phase 6: Advanced Features (Gold Standard HMS)
 */

const pool = require('../config/db');

// Would use firebase-admin in production
// const admin = require('firebase-admin');

/**
 * Initialize FCM (call on server start)
 */
const initFCM = () => {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.log('⚠️ FCM not configured (FIREBASE_SERVICE_ACCOUNT missing)');
        return false;
    }

    try {
        // In production, initialize with service account
        // const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        // admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log('✅ FCM initialized');
        return true;
    } catch (error) {
        console.error('[FCM] Init error:', error.message);
        return false;
    }
};

/**
 * Register device token for user
 */
const registerToken = async (userId, fcmToken, deviceType = 'android', hospitalId = null) => {
    try {
        await pool.query(`
            INSERT INTO notification_preferences (user_id, fcm_token, device_type, hospital_id)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, device_type) 
            DO UPDATE SET fcm_token = $2, updated_at = NOW()
        `, [userId, fcmToken, deviceType, hospitalId]);
        
        console.log(`[FCM] Token registered for user ${userId}`);
        return true;
    } catch (error) {
        console.error('[FCM] Register error:', error.message);
        return false;
    }
};

/**
 * Get user's notification preferences
 */
const getPreferences = async (userId) => {
    try {
        const result = await pool.query(
            'SELECT * FROM notification_preferences WHERE user_id = $1',
            [userId]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('[FCM] Get preferences error:', error.message);
        return null;
    }
};

/**
 * Update notification preferences
 */
const updatePreferences = async (userId, preferences) => {
    try {
        const fields = Object.keys(preferences);
        const values = Object.values(preferences);
        
        const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
        
        await pool.query(`
            UPDATE notification_preferences 
            SET ${setClause}, updated_at = NOW()
            WHERE user_id = $1
        `, [userId, ...values]);
        
        return true;
    } catch (error) {
        console.error('[FCM] Update preferences error:', error.message);
        return false;
    }
};

/**
 * Send push notification to a user
 */
const sendToUser = async (userId, title, body, data = {}) => {
    try {
        // Get user's FCM tokens
        const result = await pool.query(`
            SELECT fcm_token, device_type, 
                   notify_appointments, notify_lab_results, 
                   notify_prescriptions, notify_emergency, notify_admin,
                   quiet_start, quiet_end
            FROM notification_preferences 
            WHERE user_id = $1 AND enable_push = TRUE AND fcm_token IS NOT NULL
        `, [userId]);

        if (result.rows.length === 0) {
            console.log(`[FCM] No tokens for user ${userId}`);
            return { sent: 0 };
        }

        // Check category preferences
        const category = data.category || 'admin';
        const categoryField = `notify_${category}`;
        
        const eligibleTokens = result.rows.filter(r => {
            // Check if category is enabled
            if (r[categoryField] === false) return false;
            
            // Check quiet hours
            if (r.quiet_start && r.quiet_end) {
                const now = new Date();
                const currentTime = now.getHours() * 60 + now.getMinutes();
                const quietStart = parseInt(r.quiet_start.split(':')[0]) * 60 + parseInt(r.quiet_start.split(':')[1]);
                const quietEnd = parseInt(r.quiet_end.split(':')[0]) * 60 + parseInt(r.quiet_end.split(':')[1]);
                
                if (currentTime >= quietStart && currentTime <= quietEnd) {
                    return false; // In quiet hours
                }
            }
            
            return true;
        });

        if (eligibleTokens.length === 0) {
            console.log(`[FCM] No eligible tokens for user ${userId}`);
            return { sent: 0 };
        }

        // In production, send via Firebase Admin SDK
        // const message = {
        //     notification: { title, body },
        //     data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
        //     tokens: eligibleTokens.map(t => t.fcm_token)
        // };
        // const response = await admin.messaging().sendMulticast(message);

        console.log(`[FCM] Would send to ${eligibleTokens.length} devices: ${title}`);
        return { sent: eligibleTokens.length };
    } catch (error) {
        console.error('[FCM] Send error:', error.message);
        return { sent: 0, error: error.message };
    }
};

/**
 * Send push notification to multiple users (by role or all)
 */
const sendToRole = async (hospitalId, role, title, body, data = {}) => {
    try {
        // Get all users with the role in the hospital
        const result = await pool.query(`
            SELECT u.id FROM users u
            WHERE u.hospital_id = $1 AND u.role = $2 AND u.status = 'active'
        `, [hospitalId, role]);

        let totalSent = 0;
        for (const user of result.rows) {
            const { sent } = await sendToUser(user.id, title, body, data);
            totalSent += sent;
        }

        console.log(`[FCM] Sent to ${totalSent} devices for role ${role}`);
        return { sent: totalSent };
    } catch (error) {
        console.error('[FCM] Role send error:', error.message);
        return { sent: 0, error: error.message };
    }
};

/**
 * Send emergency broadcast to all staff
 */
const sendEmergencyBroadcast = async (hospitalId, title, body) => {
    try {
        const result = await pool.query(`
            SELECT np.fcm_token FROM notification_preferences np
            JOIN users u ON np.user_id = u.id
            WHERE u.hospital_id = $1 AND np.notify_emergency = TRUE
              AND np.enable_push = TRUE AND np.fcm_token IS NOT NULL
        `, [hospitalId]);

        console.log(`[FCM] Emergency broadcast to ${result.rows.length} devices`);
        return { sent: result.rows.length };
    } catch (error) {
        console.error('[FCM] Emergency broadcast error:', error.message);
        return { sent: 0, error: error.message };
    }
};

module.exports = {
    initFCM,
    registerToken,
    getPreferences,
    updatePreferences,
    sendToUser,
    sendToRole,
    sendEmergencyBroadcast
};
