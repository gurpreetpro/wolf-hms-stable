const fs = require('fs');
const path = require('path');
const { verifyLicense, generateLicense } = require('../utils/licenseUtil');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Activate License
const activate = asyncHandler(async (req, res) => {
    const { key } = req.body;

    const status = verifyLicense(key);
    if (!status.valid) {
        return ResponseHandler.error(res, status.message, 400);
    }

    // Save to file
    const licensePath = path.join(__dirname, '../../license.key');
    fs.writeFileSync(licensePath, key);

    ResponseHandler.success(res, { message: 'Activation Successful', hospital: status.hospitalName });
});

// Get Status
const getStatus = asyncHandler(async (req, res) => {
    const licensePath = path.join(__dirname, '../../license.key');
    if (!fs.existsSync(licensePath)) {
        return ResponseHandler.success(res, { active: false });
    }

    const key = fs.readFileSync(licensePath, 'utf8').trim();
    const status = verifyLicense(key);

    ResponseHandler.success(res, { active: status.valid, details: status });
});

// Generate (Admin Tool - exposed for demo purposes)
const generate = asyncHandler(async (req, res) => {
    const { hospital, days } = req.body;
    const expiry = Date.now() + (days * 24 * 60 * 60 * 1000);
    const key = generateLicense(hospital, expiry);
    ResponseHandler.success(res, { key });
});

module.exports = { activate, getStatus, generate };
