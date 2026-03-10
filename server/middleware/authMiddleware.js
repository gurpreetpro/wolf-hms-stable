const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            if (!process.env.JWT_SECRET) {
                console.error("[CRITICAL] JWT_SECRET is not defined in environment variables!");
                return res.status(500).json({ message: 'Server misconfiguration' });
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // [FIX] STRICT TENANT ISOLATION (Middleware Layer)
            // Verify that the Token's hospital_id matches the requested Domain's hospital_id
            
            const tokenHospitalId = decoded.hospital_id;
            const domainHospitalId = req.hospital_id; // Set by tenantResolver

            // Logic:
            // 1. If user is super_admin/platform_admin, allow Access (Roaming)
            // 2. If token has hospital_id, it MUST match the domain's hospital_id
            
            const isPlatformAdmin = ['super_admin', 'platform_admin'].includes(decoded.role);

            if (!isPlatformAdmin && tokenHospitalId && domainHospitalId && tokenHospitalId !== domainHospitalId) {
                console.warn(`[AuthMiddleware] ⛔ BLOCKED Cross-Tenant Access! Token(ID:${tokenHospitalId}) vs Domain(ID:${domainHospitalId})`);
                return res.status(403).json({ 
                    message: 'Access Forbidden: You are logged into a different hospital. Please logout and login with the correct credentials.',
                    code: 'CROSS_TENANT_ACCESS' 
                });
            }

            req.user = decoded;
            
            // Sync hospital_id for downstream controllers (Trust logic: Domain > Token? No, they match now)
            if (tokenHospitalId) {
                req.hospital_id = tokenHospitalId;
            }
            
            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'User role not authorized' });
        }
        next();
    };
};

// Aliases for different naming conventions used across routes
const authenticateToken = protect;
const authorizeRoles = authorize;

// Basic MFA middleware stub
const requireMfa = (req, res, next) => {
    // TODO: Implement actual MFA check (e.g. check session flag)
    // For now, allow through to unblock deployment
    next();
};

module.exports = { 
    protect, 
    authorize, 
    authenticateToken, 
    authorizeRoles,
    requireMfa
};
