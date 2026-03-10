const express = require('express');
const router = express.Router();
const { getChart, logVitals, logDrug, updateCount } = require('../controllers/anaesthesiaController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:surgeryId', protect, getChart);
router.post('/vitals', protect, logVitals);
router.post('/drugs', protect, logDrug);
router.post('/count', protect, updateCount);

module.exports = router;
