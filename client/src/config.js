/**
 * App Configuration
 * Central source of truth for global constants
 */

// domain defaults to localhost in dev, or the window location in prod if not set
// But for the 'Master Domain' logic (creating subdomains), we need a fixed root.
// In a real env, this handles 'wolfhms.com' vs 'wolfsecurity.in'

// Detect if we are in development mode
const isDev = import.meta.env.DEV;

export const APP_CONFIG = {
    // The master domain used for generating tenant URLs
    // Users can override this via .env VITE_MASTER_DOMAIN
    MASTER_DOMAIN: import.meta.env.VITE_MASTER_DOMAIN || 'wolfhms.com',
    
    // The protocol to use (http for local, https for prod)
    PROTOCOL: isDev ? 'http' : 'https',
    
    // Feature Flags
    ENABLE_MFA: false,
    ENABLE_ANALYTICS: false
};

// API Base URL for Wolf Care components
export const API_BASE = import.meta.env.VITE_API_URL || 
    (isDev ? 'http://localhost:3001' : '');

export const getTenantUrl = (subdomain) => {
    // If it's localhost, we might use subdomains like tenant.localhost:5173 
    // but that usually requires extra host file setup. 
    // For now, simpler to just return the production-style URL format for display
    return `${APP_CONFIG.PROTOCOL}://${subdomain}.${APP_CONFIG.MASTER_DOMAIN}`;
};
