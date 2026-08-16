const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { generateSecret, verifyToken } = require('../services/authService');

router.get('/2fa/generate', async (req, res) => {
  try {
    const username = req.query.username || 'admin@wolfhms.com';
    const { secret, otpauth_url } = generateSecret(username);
    const QRCode = require('qrcode');
    const qrCodeUrl = await QRCode.toDataURL(otpauth_url);
    res.json({ secret, qrCodeUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/2fa/verify', async (req, res) => {
  try {
    const { userId, secret, token } = req.body;
    const isValid = verifyToken(secret, token);
    if (isValid) {
      await pool.query('UPDATE users SET totp_secret = $1, is_2fa_enabled = TRUE WHERE id = $2', [secret, userId]);
      return res.json({ success: true, message: '2FA successfully enabled.' });
    }
    res.status(400).json({ success: false, message: 'Invalid verification code.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;