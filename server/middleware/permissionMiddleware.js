const { ROLE_PERMISSIONS } = require('../config/permissions');
const pool = require('../config/db');

// Cache permissions to reduce DB queries
const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Legacy support: Simple Role Check
const checkRole = (requiredRole) => {
    return (req, res, next) => {
        if (req.user && (req.user.role === requiredRole || req.user.role === 'admin' || req.user.role === 'super_admin')) {
            next();
        } else {
            return res.status(403).json({ message: 'Access denied' });
        }
    };
};

/**
 * Check if user has granular permission (Phase 8: Security)
 */
const checkStaticPermission = (requiredPermission) => {
    return (req, res, next) => {
        const userRole = req.user?.role;
        const hospitalId = req.hospital_id;

        if (!userRole) return res.status(401).json({ message: 'Auth required' });

        // 1. Super Admin Bypass
        if (userRole === 'super_admin') return next();

        // 2. Check Static Role Permissions (Config)
        const staticPerms = ROLE_PERMISSIONS[userRole] || [];
        if (staticPerms.includes(requiredPermission)) return next();

        // 3. (Optional) Check Dynamic DB Permissions [Future Scope]
        // ...

        return res.status(403).json({ message: `Access Denied: Missing permission ${requiredPermission}` });
    };
};


/**
 * Get permissions for a role in a hospital
 */
const getPermissions = async (role, hospitalId) => {
    const cacheKey = `${role}:${hospitalId || 'global'}`;
    
    // Check cache
    if (permissionCache.has(cacheKey)) {
        const cached = permissionCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }
    }

    try {
        // Get hospital-specific permissions first, fall back to global
        const result = await pool.query(`
            SELECT module, can_create, can_read, can_update, can_delete, can_export
            FROM role_permissions
            WHERE role = $1 AND (hospital_id = $2 OR hospital_id IS NULL)
            ORDER BY hospital_id NULLS LAST
        `, [role, hospitalId]);

        // Convert to lookup object
        const permissions = {};
        result.rows.forEach(row => {
            if (!permissions[row.module]) {
                permissions[row.module] = {
                    create: row.can_create,
                    read: row.can_read,
                    update: row.can_update,
                    delete: row.can_delete,
                    export: row.can_export
                };
            }
        });

        permissionCache.set(cacheKey, { data: permissions, timestamp: Date.now() });
        return permissions;
    } catch (error) {
        console.error('[Permission] Error fetching permissions:', error.message);
        return {};
    }
};

/**
 * Check if user has permission for action on module
 */
const checkPermission = (module, action) => {
    return async (req, res, next) => {
        // Super admins and platform admins bypass checks
        if (req.user?.role === 'superadmin' || req.is_platform_admin) {
            return next();
        }

        const role = req.user?.role;
        const hospitalId = req.hospital_id;

        if (!role) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const permissions = await getPermissions(role, hospitalId);
        const modulePermissions = permissions[module];

        if (!modulePermissions) {
            console.warn(`[Permission] No permissions found for ${role} on ${module}`);
            return res.status(403).json({ 
                message: 'Access denied', 
                details: `No ${module} permissions for role: ${role}` 
            });
        }

        if (!modulePermissions[action]) {
            console.warn(`[Permission] ${role} denied ${action} on ${module}`);
            return res.status(403).json({ 
                message: 'Access denied', 
                details: `Cannot ${action} ${module}` 
            });
        }

        // Attach permissions to request for controller use
        req.permissions = modulePermissions;
        next();
    };
};

/**
 * Middleware factory for common permission checks
 */
const canCreate = (module) => checkPermission(module, 'create');
const canRead = (module) => checkPermission(module, 'read');
const canUpdate = (module) => checkPermission(module, 'update');
const canDelete = (module) => checkPermission(module, 'delete');
const canExport = (module) => checkPermission(module, 'export');

/**
 * Clear permission cache (call after permission updates)
 */
const clearPermissionCache = () => {
    permissionCache.clear();
};

module.exports = {
    checkStaticPermission,
    checkRole,
    checkPermission,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canExport,
    getPermissions,
    clearPermissionCache
};
