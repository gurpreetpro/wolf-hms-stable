/**
 * Safe localStorage utilities for Wolf HMS
 * Handles corrupted data like literal "undefined" strings
 */

/**
 * Safely parse user from localStorage
 * Returns null if data is invalid/corrupted
 */
export const safeGetUser = () => {
    try {
        const raw = localStorage.getItem('user');
        // Guard against null, undefined string, or empty
        if (!raw || raw === 'undefined' || raw === 'null' || raw === '') {
            return null;
        }
        return JSON.parse(raw);
    } catch (error) {
        console.error('Failed to parse user from localStorage:', error);
        // Clean up corrupted data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        return null;
    }
};

/**
 * Safely store user data
 * Only stores if data is valid
 */
export const safeSetUser = (user) => {
    if (user && typeof user === 'object') {
        localStorage.setItem('user', JSON.stringify(user));
        return true;
    }
    return false;
};

/**
 * Safely store token
 * Only stores if token is a valid string
 */
export const safeSetToken = (token) => {
    if (token && typeof token === 'string' && token !== 'undefined') {
        localStorage.setItem('token', token);
        return true;
    }
    return false;
};

/**
 * Clear all auth data
 */
export const clearAuth = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
};

/**
 * Check if user is authenticated with valid data
 */
export const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    const user = safeGetUser();
    return !!(token && token !== 'undefined' && user);
};
