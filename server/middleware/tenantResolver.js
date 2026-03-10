const pool = require('../config/db');

// In-memory cache for hospital data to reduce DB hits
// Key: domain, Value: { id, name, domain }
const hospitalCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Set the tenant context for PostgreSQL RLS (Row Level Security)
 * This MUST be called before any database queries in a request
 * [IRON DOME] Phase 1 Security Upgrade
 */
const setTenantContext = async (hospitalId) => {
    if (hospitalId) {
        try {
            await pool.query("SELECT set_config('app.current_tenant', $1, false)", [hospitalId.toString()]);
        } catch (err) {
            console.error('[RLS] Failed to set tenant context:', err.message);
        }
    }
};

/**
 * Clear the tenant context (for cleanup/admin operations)
 */
const clearTenantContext = async () => {
    try {
        await pool.query("SET app.current_tenant TO ''");
    } catch (err) {
        console.error('[RLS] Failed to clear tenant context:', err.message);
    }
};

const getHospitalFromDomain = async (domain) => {
    // 1. Check Cache
    if (hospitalCache.has(domain)) {
        const cached = hospitalCache.get(domain);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }
    }

    // 2. Query DB (This query runs BEFORE tenant is set)
    try {
        const result = await pool.query('SELECT id, name, subdomain as domain FROM hospitals WHERE subdomain = $1', [domain]);

        if (result.rows.length > 0) {
            const hospital = result.rows[0];
            hospitalCache.set(domain, { data: hospital, timestamp: Date.now() });
            return hospital;
        }
    } catch (err) {
        console.error('Error fetching hospital by domain:', err);
    }

    return null;
};

const tenantResolver = async (req, res, next) => {
    // 0. Use originalUrl to handle cases where middleware is mounted at a path prefix (e.g. /api)
    const requestPath = req.originalUrl || req.path;

    // Bypass for Sync/Health Routes (Maintenance/Migration)
    if (requestPath.startsWith('/api/sync') || requestPath.startsWith('/api/health')) {
        return next();
    }

    // 0.1 Bypass for Wolf Care 2.0 Public Routes (Self-Hosted Auth)
    // These routes handle their own hospital resolution via request body
    if (requestPath.startsWith('/api/patient-auth') ||
        requestPath.startsWith('/api/telehealth') ||
        requestPath.startsWith('/api/home-collection') ||
        requestPath.startsWith('/api/ipd') ||
        requestPath.startsWith('/api/hospitals') ||
        // Wolf Care Phase 1-5 Routes
        requestPath.startsWith('/api/reviews') ||
        requestPath.startsWith('/api/family') ||
        requestPath.startsWith('/api/chat') ||
        requestPath.startsWith('/api/articles') ||
        requestPath.startsWith('/api/home-lab')) {
        // Set default hospital for patient app routes
        req.hospital_id = req.headers['x-hospital-id'] || 1;
        req.hospital_name = 'Default';
        return next();
    }

    // 0. Mobile App Header Override (Universal App Support)
    const headerHospitalId = req.headers['x-hospital-id'];
    if (headerHospitalId) {
        const id = parseInt(headerHospitalId);
        if (!isNaN(id)) {
            const result = await pool.query('SELECT id, name FROM hospitals WHERE id = $1', [id]);
            if (result.rows.length > 0) {
                const hospital = result.rows[0];
                req.hospital_id = hospital.id;
                req.hospital_name = hospital.name;
                req.is_mobile_app = true;

                // [IRON DOME] Set RLS context
                await setTenantContext(hospital.id);

                console.log(`[Tenant] Resolved via Header: ${hospital.name} (${hospital.id})`);
                return next();
            }
        }
    }

    // 1. Determine Domain
    let origin = req.headers['x-forwarded-host'] || req.headers.origin || req.get('host') || '';
    let fullDomain = origin.replace(/^https?:\/\//, '').split(':')[0];
    let domain = fullDomain.split('.')[0];

    console.log(`[Tenant] Host: ${fullDomain} → Subdomain: ${domain}`);

    // 2. Resolve Hospital
    let hospital = await getHospitalFromDomain(domain);

    // 3. Fallback for Legacy/Dev/Bootstrap Environments
    if (!hospital) {
        if (fullDomain.includes('wolf-tech-server') && fullDomain.includes('.run.app')) {
            console.log(`[Tenant] Cloud Run Production Domain Detected: ${fullDomain}`);
            req.hospital_id = 1;
            req.hospital_name = 'Kokila Hospital';
            await setTenantContext(1);
            return next();
        }

        if (domain === 'kokila') {
            console.log(`[Tenant] BOOTSTRAP: Forcing Kokila ID 1`);
            hospital = { id: 1, name: 'Kokila Hospital' };
        }
        else if (domain === 'drparveen') {
            console.log(`[Tenant] BOOTSTRAP: Forcing Dr Parveen ID 2`);
            hospital = { id: 2, name: 'Dr. Parveen Hospital' };
        }
        else if (domain.includes('wolf-hms') || domain.includes('localhost') || domain === '127' || fullDomain.startsWith('127.0.0.1') || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(fullDomain) || fullDomain.includes('sslip.io')) {
            try {
                const fallbackRes = await pool.query(
                    "SELECT id, name FROM hospitals WHERE code = 'kokila' OR id = 1 ORDER BY id LIMIT 1"
                );
                if (fallbackRes.rows.length > 0) {
                    hospital = {
                        id: fallbackRes.rows[0].id,
                        name: fallbackRes.rows[0].name
                    };
                }
            } catch (fallbackErr) {
                console.error('[Tenant] Fallback DB Query Failed:', fallbackErr.message);
            }
        }

        if (domain === 'wolfhms.web.app') {
            req.is_platform_admin = true;
            return next();
        }
    }

    // 4. Attach to Request or Block
    if (hospital) {
        req.hospital_id = hospital.id;
        req.hospital_name = hospital.name;

        // [IRON DOME] Set RLS context for this request
        await setTenantContext(hospital.id);

        next();
    } else {
        console.warn(`[Tenant] Unknown Domain: ${domain}`);
        if (req.method === 'OPTIONS') return next();
        res.status(404).json({ message: 'Hospital environment not found for this domain.' });
    }
};

module.exports = {
    resolveHospital: tenantResolver,
    setTenantContext,
    clearTenantContext
};
