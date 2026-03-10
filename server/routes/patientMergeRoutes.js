const express = require('express');
const router = express.Router();
const { findDuplicates, mergePatients, getMergeHistory } = require('../controllers/patientMergeController');
const { protect: verifyToken, authorize: authorizeRole } = require('../middleware/authMiddleware');

// All merge operations require admin role
router.get('/duplicates', verifyToken, authorizeRole('admin', 'super_admin'), findDuplicates);
router.post('/merge', verifyToken, authorizeRole('admin', 'super_admin'), mergePatients);
router.get('/merge-history', verifyToken, authorizeRole('admin', 'super_admin'), getMergeHistory);

module.exports = router;
