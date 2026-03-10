const { checkLicenseFile } = require('../utils/licenseUtil');

const checkLicense = (req, res, next) => {
    // Allow activation endpoint and static files
    if (req.path === '/api/license/activate' || req.path === '/api/license/status') {
        return next();
    }

    const status = checkLicenseFile();
    if (!status.valid) {
        return res.status(402).json({
            message: 'License Error',
            detail: status.message,
            action: 'Please activate your copy of HMS Premium.'
        });
    }

    // Attach license info to request
    req.license = status;
    next();
};

module.exports = checkLicense;
