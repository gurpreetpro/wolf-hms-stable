const express = require('express');
const router = express.Router();
const { restoreData, executeSql } = require('../controllers/syncController');

router.post('/restore', restoreData);
router.post('/sql', executeSql);

module.exports = router;
