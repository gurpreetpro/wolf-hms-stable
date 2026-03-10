const { Pool } = require('pg');
const pool = require('../config/db'); // Assuming db config is exported as pool

const logAction = async (userId, action, details, ipAddress) => {
    try {
        await pool.query(
            'INSERT INTO system_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
            [userId, action, details, ipAddress]
        );
    } catch (error) {
        console.error('Logging failed:', error);
    }
};

module.exports = { logAction };
