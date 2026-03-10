import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/axiosInstance';

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_KEY = 'hospital_profile_cache_v3';

// Default fallback profile when not loaded
const defaultProfile = {
    name: 'Hospital Name',
    tagline: '',
    address_line1: '123 Healthcare Avenue',
    city: 'City',
    state: 'State',
    pincode: '000000',
    phone: '+91 1234567890',
    email: 'info@hospital.com',
    website: 'www.hospital.com',
    registration_number: '',
    // Billing/Banking Settings
    bank_name: '',
    bank_account: '',
    bank_ifsc: '',
    bank_branch: '',
    default_registration_fee: '0',
    default_consultation_fee: '0',
    gst_mode: 'included',
    default_gst_rate: '18'
};

const HospitalProfileContext = createContext(null);

/**
 * HospitalProfileProvider - Provides cached hospital profile data to all components
 * 
 * Features:
 * - Fetches hospital profile once on app load
 * - Caches data in localStorage with 5-minute TTL
 * - Provides refreshProfile() for admin to update cache after changes
 * - Falls back to default values if fetch fails
 */
export const HospitalProfileProvider = ({ children }) => {
    const [hospitalProfile, setHospitalProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check localStorage cache with robust validation
    const getCachedProfile = useCallback(() => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            
            // Skip if no cache
            if (!cached) return null;
            
            // CRITICAL: Detect corrupted cache (HTML, undefined, etc.)
            // Valid cache must start with '{' (JSON object)
            const trimmed = cached.trim();
            if (!trimmed.startsWith('{') || 
                trimmed.startsWith('<!') || 
                trimmed.startsWith('<html') ||
                cached === 'undefined' || 
                cached === 'null') {
                console.warn('[HospitalProfileContext] Corrupt cache detected, clearing...');
                localStorage.removeItem(CACHE_KEY);
                return null;
            }
            
            const parsed = JSON.parse(cached);
            
            // Validate structure
            if (!parsed || typeof parsed !== 'object' || !parsed.data || !parsed.timestamp) {
                console.warn('[HospitalProfileContext] Invalid cache structure, clearing...');
                localStorage.removeItem(CACHE_KEY);
                return null;
            }
            
            const { data, timestamp } = parsed;
            
            // Cache disabled for debugging/active updates
            return null; // Force fetch
            
            // Check TTL
            // if (Date.now() - timestamp < CACHE_TTL) {
            //     return data;
            // }
            
            // Cache expired
            return null;
        } catch (e) {
            console.warn('[HospitalProfileContext] Error reading cache, clearing:', e);
            // Clean up corrupt cache on any error
            try { localStorage.removeItem(CACHE_KEY); } catch {}
            return null;
        }
    }, []);

    // Save to localStorage cache
    const setCachedProfile = useCallback((data) => {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('Error saving hospital profile cache:', e);
        }
    }, []);

    // Fetch profile from API
    const fetchProfile = useCallback(async (forceRefresh = false) => {
        // Check cache first (unless forcing refresh)
        if (!forceRefresh) {
            const cached = getCachedProfile();
            if (cached) {
                setHospitalProfile(cached);
                setLoading(false);
                return;
            }
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                // No token - try public endpoint or use defaults
                setHospitalProfile(defaultProfile);
                setLoading(false);
                return;
            }

            const response = await api.get('/api/settings/hospital-profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const profileData = response.data.data || response.data;
            setHospitalProfile(profileData);
            setCachedProfile(profileData);
            setError(null);
        } catch (err) {
            console.error('Error fetching hospital profile:', err);
            setHospitalProfile(defaultProfile);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [getCachedProfile, setCachedProfile]);

    // Refresh profile (clears cache and fetches fresh data)
    const refreshProfile = useCallback(() => {
        localStorage.removeItem(CACHE_KEY);
        return fetchProfile(true);
    }, [fetchProfile]);

    // Initial fetch on mount
    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    // Helper: Get formatted address
    const getFormattedAddress = useCallback(() => {
        if (!hospitalProfile) return '';
        const parts = [
            hospitalProfile.address_line1,
            hospitalProfile.address_line2,
            hospitalProfile.city,
            hospitalProfile.state,
            hospitalProfile.pincode
        ].filter(Boolean);
        return parts.join(', ');
    }, [hospitalProfile]);

    // Helper: Get contact string with emojis
    const getContactString = useCallback(() => {
        if (!hospitalProfile) return '';
        const parts = [];
        if (hospitalProfile.phone) parts.push(`📞 ${hospitalProfile.phone}`);
        if (hospitalProfile.email) parts.push(`✉️ ${hospitalProfile.email}`);
        if (hospitalProfile.website) parts.push(`🌐 ${hospitalProfile.website}`);
        return parts.join(' | ');
    }, [hospitalProfile]);

    const value = {
        hospitalProfile,
        loading,
        error,
        refreshProfile,
        getFormattedAddress,
        getContactString
    };

    return (
        <HospitalProfileContext.Provider value={value}>
            {children}
        </HospitalProfileContext.Provider>
    );
};

/**
 * useHospitalProfileContext - Hook to access hospital profile from context
 * Use this instead of importing useHospitalProfile directly
 */
export const useHospitalProfileContext = () => {
    const context = useContext(HospitalProfileContext);
    if (!context) {
        console.warn('useHospitalProfileContext must be used within HospitalProfileProvider');
        // Return fallback for backwards compatibility
        return {
            hospitalProfile: defaultProfile,
            loading: false,
            error: null,
            refreshProfile: () => {},
            getFormattedAddress: () => '',
            getContactString: () => ''
        };
    }
    return context;
};

export default HospitalProfileContext;
