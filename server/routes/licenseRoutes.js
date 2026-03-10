const express = require('express');
const router = express.Router();
const { activate, getStatus, generate } = require('../controllers/licenseController');

router.post('/activate', activate);
router.get('/status', getStatus);
router.post('/generate', generate); // In real app, protect this!

module.exports = router;
