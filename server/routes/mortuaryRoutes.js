const express = require('express');
const router = express.Router();
const mortuaryController = require('../controllers/mortuaryController');
const { protect, authorize } = require('../middleware/authMiddleware');

const ALL_STAFF = ['admin', 'doctor', 'nurse', 'mortuary', 'security_guard'];
const ADMIN_MORTUARY = ['admin', 'mortuary'];
const RELEASE_AUTH = ['admin', 'mortuary', 'security_guard']; // Guard does final physical release

// Dashboard
router.get('/status', protect, authorize(...ALL_STAFF), mortuaryController.getMortuaryStatus);

// Operations
router.post('/declare', protect, authorize('admin', 'doctor'), mortuaryController.declareDeath);
router.post('/allocate', protect, authorize(...ADMIN_MORTUARY), mortuaryController.allocateChamber);
router.post('/pass', protect, authorize(...ADMIN_MORTUARY), mortuaryController.issueReleasePass);
router.post('/release', protect, authorize(...RELEASE_AUTH), mortuaryController.releaseBody);

// Setup
router.post('/init', protect, authorize('admin', 'developer'), mortuaryController.initChambers);

module.exports = router;
