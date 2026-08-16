const { pool } = require('../db');

module.exports = function logAdminAction(actionType, targetDepartment) {
  return async function(req, res, next) {
    const originalJson = res.json;
    res.json = function(body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const adminId = req.user ? req.user.id : 0;
        const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
        const payload = { body: req.body, query: req.query, responseSummary: typeof body === 'object' ? (body.message || 'Success') : 'OK' };
        pool.query(
          'INSERT INTO admin_audit_logs (admin_user_id, action_type, target_department, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
          [adminId, actionType, targetDepartment, JSON.stringify(payload), ip]
        ).catch(err => console.error('Admin audit log write failed:', err.message));
      }
      originalJson.call(this, body);
    };
    next();
  };
};