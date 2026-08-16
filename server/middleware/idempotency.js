const { pool } = require('../db');

module.exports = async function idempotencyMiddleware(req, res, next) {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Missing Idempotency-Key header for transactional safety.' });
  }
  try {
    const existing = await pool.query('SELECT response_body, status_code FROM idempotency_keys WHERE key = $1', [idempotencyKey]);
    if (existing.rows.length > 0) {
      console.log('⚡ IDEMPOTENCY CACHE HIT: Returning cached response for key:', idempotencyKey);
      const cached = existing.rows[0];
      return res.status(cached.status_code).json(cached.response_body);
    }
    const originalJson = res.json;
    res.json = function(body) {
      const statusCode = res.statusCode || 200;
      pool.query('INSERT INTO idempotency_keys (key, response_body, status_code) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING', [idempotencyKey, JSON.stringify(body), statusCode]).catch(err => console.error('Idempotency save error:', err.message));
      originalJson.call(this, body);
    };
    next();
  } catch (e) {
    console.error('❌ Idempotency Middleware Error:', e.message);
    next(e);
  }
};