/**
 * Theming Service
 * White-label branding management
 * Phase 6: Advanced Features (Gold Standard HMS)
 */

const pool = require('../config/db');

// Cache branding per hospital
const brandingCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get branding for a hospital
 */
const getBranding = async (hospitalId) => {
    // Check cache
    if (brandingCache.has(hospitalId)) {
        const cached = brandingCache.get(hospitalId);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }
    }

    try {
        const result = await pool.query(`
            SELECT hb.*, h.hospital_name, h.hospital_logo
            FROM hospital_branding hb
            RIGHT JOIN hospitals h ON hb.hospital_id = h.id
            WHERE h.id = $1
        `, [hospitalId]);

        if (result.rows.length === 0) {
            return getDefaultBranding();
        }

        const branding = {
            ...getDefaultBranding(),
            ...result.rows[0],
            hospital_name: result.rows[0].hospital_name,
            logo_url: result.rows[0].logo_url || result.rows[0].hospital_logo
        };

        brandingCache.set(hospitalId, { data: branding, timestamp: Date.now() });
        return branding;
    } catch (error) {
        console.error('[Theming] Error fetching branding:', error.message);
        return getDefaultBranding();
    }
};

/**
 * Get default branding
 */
const getDefaultBranding = () => ({
    primary_color: '#667eea',
    secondary_color: '#764ba2',
    accent_color: '#10b981',
    background_color: '#f8fafc',
    text_primary: '#1a1a2e',
    text_secondary: '#64748b',
    font_family: 'Inter, system-ui, sans-serif',
    heading_font: 'Inter, system-ui, sans-serif',
    sidebar_style: 'modern',
    header_style: 'fixed',
    powered_by_visible: true,
    footer_text: 'Powered by Wolf HMS'
});

/**
 * Update branding for a hospital
 */
const updateBranding = async (hospitalId, brandingData) => {
    try {
        // Build dynamic update query
        const fields = Object.keys(brandingData).filter(k => k !== 'hospital_id');
        const values = fields.map(f => brandingData[f]);
        
        const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
        
        const result = await pool.query(`
            INSERT INTO hospital_branding (hospital_id, ${fields.join(', ')})
            VALUES ($1, ${fields.map((_, i) => `$${i + 2}`).join(', ')})
            ON CONFLICT (hospital_id) DO UPDATE SET ${setClause}, updated_at = NOW()
            RETURNING *
        `, [hospitalId, ...values]);

        // Clear cache
        brandingCache.delete(hospitalId);

        return result.rows[0];
    } catch (error) {
        console.error('[Theming] Error updating branding:', error.message);
        throw error;
    }
};

/**
 * Generate CSS variables from branding
 */
const generateCssVariables = (branding) => {
    return `
:root {
    --primary-color: ${branding.primary_color};
    --secondary-color: ${branding.secondary_color};
    --accent-color: ${branding.accent_color};
    --bg-color: ${branding.background_color};
    --text-primary: ${branding.text_primary};
    --text-secondary: ${branding.text_secondary};
    --font-family: ${branding.font_family};
    --heading-font: ${branding.heading_font};
}
${branding.custom_css || ''}
    `.trim();
};

/**
 * Clear branding cache
 */
const clearCache = (hospitalId) => {
    if (hospitalId) {
        brandingCache.delete(hospitalId);
    } else {
        brandingCache.clear();
    }
};

module.exports = {
    getBranding,
    updateBranding,
    generateCssVariables,
    getDefaultBranding,
    clearCache
};
