/**
 * HBP Rate Service
 * Ayushman Bharat HBP 2.0 Rate Lookup
 * Provides access to PMJAY procedure rates from database
 * 
 * WOLF HMS
 */

const { Pool } = require('pg');

class HBPRateService {
    constructor() {
        this.pool = null;
    }

    /**
     * Initialize with database pool
     * @param {Pool} pool - PostgreSQL pool instance
     */
    initialize(pool) {
        this.pool = pool;
    }

    // ============================================
    // Specialty Methods
    // ============================================

    /**
     * Get all active specialties
     * @returns {Promise<Array>} List of specialties
     */
    async getSpecialties() {
        const result = await this.pool.query(`
            SELECT code, name, procedure_count, is_active
            FROM pmjay_specialties
            WHERE is_active = TRUE
            ORDER BY name
        `);
        return result.rows;
    }

    /**
     * Get specialty by code
     * @param {string} code - Specialty code (e.g., 'MG', 'GS')
     */
    async getSpecialtyByCode(code) {
        const result = await this.pool.query(
            'SELECT * FROM pmjay_specialties WHERE code = $1',
            [code.toUpperCase()]
        );
        return result.rows[0] || null;
    }

    // ============================================
    // Package Methods
    // ============================================

    /**
     * Get packages by specialty
     * @param {string} specialtyCode - Specialty code
     * @param {Object} options - Filters (requiresPreauth, isSurgical, etc.)
     */
    async getPackagesBySpecialty(specialtyCode, options = {}) {
        let query = `
            SELECT p.*, s.name as specialty_name
            FROM pmjay_packages p
            JOIN pmjay_specialties s ON p.specialty_code = s.code
            WHERE p.specialty_code = $1 AND p.is_active = TRUE
        `;
        const params = [specialtyCode.toUpperCase()];

        if (options.requiresPreauth !== undefined) {
            query += ` AND p.requires_preauth = $${params.length + 1}`;
            params.push(options.requiresPreauth);
        }

        if (options.isSurgical !== undefined) {
            query += ` AND p.is_surgical = $${params.length + 1}`;
            params.push(options.isSurgical);
        }

        query += ' ORDER BY p.name';

        const result = await this.pool.query(query, params);
        return result.rows;
    }

    /**
     * Get package by code
     * @param {string} code - Package code (e.g., 'GS001')
     */
    async getPackageByCode(code) {
        const result = await this.pool.query(`
            SELECT p.*, s.name as specialty_name
            FROM pmjay_packages p
            JOIN pmjay_specialties s ON p.specialty_code = s.code
            WHERE p.code = $1
        `, [code.toUpperCase()]);
        return result.rows[0] || null;
    }

    /**
     * Search packages by name
     * @param {string} query - Search query
     * @param {number} limit - Max results
     */
    async searchPackages(query, limit = 20) {
        const result = await this.pool.query(`
            SELECT p.code, p.name, p.base_rate, p.specialty_code, 
                   s.name as specialty_name, p.requires_preauth, p.is_surgical
            FROM pmjay_packages p
            JOIN pmjay_specialties s ON p.specialty_code = s.code
            WHERE p.is_active = TRUE 
            AND (p.name ILIKE $1 OR p.code ILIKE $1)
            ORDER BY 
                CASE WHEN p.code ILIKE $1 THEN 0 ELSE 1 END,
                p.name
            LIMIT $2
        `, [`%${query}%`, limit]);
        return result.rows;
    }

    // ============================================
    // Procedure Methods
    // ============================================

    /**
     * Get procedures by package
     * @param {string} packageCode - Package code
     */
    async getProceduresByPackage(packageCode) {
        const result = await this.pool.query(`
            SELECT * FROM pmjay_procedures
            WHERE package_code = $1 AND is_active = TRUE
            ORDER BY name
        `, [packageCode.toUpperCase()]);
        return result.rows;
    }

    /**
     * Get procedure by code
     * @param {string} code - Procedure code (e.g., 'GS001A')
     */
    async getProcedureByCode(code) {
        const result = await this.pool.query(`
            SELECT pr.*, pk.name as package_name, pk.base_rate as package_rate,
                   s.name as specialty_name
            FROM pmjay_procedures pr
            LEFT JOIN pmjay_packages pk ON pr.package_code = pk.code
            LEFT JOIN pmjay_specialties s ON pr.specialty_code = s.code
            WHERE pr.code = $1
        `, [code.toUpperCase()]);
        return result.rows[0] || null;
    }

    /**
     * Search procedures
     * @param {string} query - Search query
     * @param {Object} filters - Specialty, preauth filters
     */
    async searchProcedures(query, filters = {}) {
        let sql = `
            SELECT pr.code, pr.name, pr.rate, pr.specialty_code, pr.package_code,
                   pr.requires_preauth, pk.name as package_name, s.name as specialty_name
            FROM pmjay_procedures pr
            LEFT JOIN pmjay_packages pk ON pr.package_code = pk.code
            LEFT JOIN pmjay_specialties s ON pr.specialty_code = s.code
            WHERE pr.is_active = TRUE
            AND (pr.name ILIKE $1 OR pr.code ILIKE $1)
        `;
        const params = [`%${query}%`];

        if (filters.specialtyCode) {
            sql += ` AND pr.specialty_code = $${params.length + 1}`;
            params.push(filters.specialtyCode.toUpperCase());
        }

        if (filters.requiresPreauth !== undefined) {
            sql += ` AND pr.requires_preauth = $${params.length + 1}`;
            params.push(filters.requiresPreauth);
        }

        if (filters.minRate) {
            sql += ` AND pr.rate >= $${params.length + 1}`;
            params.push(filters.minRate);
        }

        if (filters.maxRate) {
            sql += ` AND pr.rate <= $${params.length + 1}`;
            params.push(filters.maxRate);
        }

        sql += ` ORDER BY pr.name LIMIT $${params.length + 1}`;
        params.push(filters.limit || 50);

        const result = await this.pool.query(sql, params);
        return result.rows;
    }

    // ============================================
    // AI-Assisted Package Suggestion
    // ============================================

    /**
     * Suggest packages based on diagnosis
     * @param {string} diagnosis - Diagnosis text
     * @param {Array<string>} icdCodes - ICD-10 codes
     * @returns {Promise<Array>} Suggested packages with match scores
     */
    async suggestPackages(diagnosis, icdCodes = []) {
        // Simple keyword-based matching for now
        // TODO: Integrate with AI service for better matching
        
        const keywords = diagnosis.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        
        if (keywords.length === 0) {
            return [];
        }

        // Build OR conditions for each keyword
        const conditions = keywords.map((_, i) => `p.name ILIKE $${i + 1}`).join(' OR ');
        const params = keywords.map(k => `%${k}%`);

        const result = await this.pool.query(`
            SELECT p.code, p.name, p.base_rate, p.specialty_code, p.requires_preauth,
                   p.expected_los, p.is_surgical, s.name as specialty_name,
                   (
                       SELECT COUNT(*) FROM unnest($${params.length + 1}::text[]) k 
                       WHERE p.name ILIKE '%' || k || '%'
                   ) as match_score
            FROM pmjay_packages p
            JOIN pmjay_specialties s ON p.specialty_code = s.code
            WHERE p.is_active = TRUE AND (${conditions})
            ORDER BY match_score DESC, p.base_rate DESC
            LIMIT 10
        `, [...params, keywords]);

        return result.rows.map(row => ({
            ...row,
            matchScore: parseInt(row.match_score) / keywords.length,
            suggestedBy: 'keyword_match'
        }));
    }

    // ============================================
    // Rate Calculations
    // ============================================

    /**
     * Get package rate based on city tier
     * @param {string} packageCode - Package code
     * @param {string} cityTier - T1, T2, or T3
     */
    async getPackageRate(packageCode, cityTier = 'T2') {
        const pkg = await this.getPackageByCode(packageCode);
        if (!pkg) return null;

        let rate = pkg.base_rate;
        
        switch (cityTier.toUpperCase()) {
            case 'T1':
                rate = pkg.tier1_rate || pkg.base_rate;
                break;
            case 'T2':
                rate = pkg.tier2_rate || pkg.base_rate;
                break;
            case 'T3':
                rate = pkg.tier3_rate || pkg.base_rate;
                break;
        }

        return {
            packageCode: pkg.code,
            packageName: pkg.name,
            baseRate: parseFloat(pkg.base_rate),
            appliedRate: parseFloat(rate),
            cityTier: cityTier.toUpperCase(),
            requiresPreauth: pkg.requires_preauth,
            expectedLOS: pkg.expected_los
        };
    }

    /**
     * Calculate total claim amount for multiple procedures
     * @param {Array<{code: string, quantity?: number}>} procedures - Procedure list
     * @param {string} cityTier - City tier
     */
    async calculateClaimAmount(procedures, cityTier = 'T2') {
        let totalAmount = 0;
        let totalImplantCost = 0;
        const breakdown = [];

        for (const proc of procedures) {
            const procedureData = await this.getProcedureByCode(proc.code);
            if (!procedureData) continue;

            const quantity = proc.quantity || 1;
            const amount = parseFloat(procedureData.rate) * quantity;
            const implant = parseFloat(procedureData.implant_cost || 0) * quantity;

            totalAmount += amount;
            totalImplantCost += implant;

            breakdown.push({
                code: procedureData.code,
                name: procedureData.name,
                rate: parseFloat(procedureData.rate),
                quantity,
                amount,
                implantCost: implant,
                requiresPreauth: procedureData.requires_preauth
            });
        }

        return {
            totalPackageAmount: totalAmount,
            totalImplantCost,
            grossClaimAmount: totalAmount + totalImplantCost,
            cityTier,
            procedureCount: breakdown.length,
            breakdown,
            requiresPreauth: breakdown.some(p => p.requiresPreauth)
        };
    }

    // ============================================
    // Hospital Empanelment
    // ============================================

    /**
     * Get hospital's PMJAY empanelment status
     * @param {number} hospitalId - Hospital ID
     */
    async getHospitalEmpanelment(hospitalId) {
        const result = await this.pool.query(`
            SELECT * FROM pmjay_hospital_empanelment
            WHERE hospital_id = $1
        `, [hospitalId]);
        return result.rows[0] || null;
    }

    /**
     * Update or create hospital empanelment
     * @param {number} hospitalId - Hospital ID
     * @param {Object} data - Empanelment data
     */
    async upsertHospitalEmpanelment(hospitalId, data) {
        const result = await this.pool.query(`
            INSERT INTO pmjay_hospital_empanelment (
                hospital_id, pmjay_hospital_id, empanelment_status, city_tier,
                state_code, district_code, specialties_enabled
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (hospital_id) DO UPDATE SET
                pmjay_hospital_id = EXCLUDED.pmjay_hospital_id,
                empanelment_status = EXCLUDED.empanelment_status,
                city_tier = EXCLUDED.city_tier,
                state_code = EXCLUDED.state_code,
                district_code = EXCLUDED.district_code,
                specialties_enabled = EXCLUDED.specialties_enabled,
                updated_at = NOW()
            RETURNING *
        `, [
            hospitalId,
            data.pmjayHospitalId,
            data.empanelmentStatus || 'PENDING',
            data.cityTier || 'T2',
            data.stateCode,
            data.districtCode,
            data.specialtiesEnabled || []
        ]);
        return result.rows[0];
    }

    // ============================================
    // Procedure Mapping
    // ============================================

    /**
     * Get hospital's procedure mappings
     * @param {number} hospitalId - Hospital ID
     */
    async getHospitalMappings(hospitalId) {
        const result = await this.pool.query(`
            SELECT m.*, pr.name as pmjay_procedure_name, pr.rate as pmjay_rate
            FROM pmjay_hospital_mappings m
            JOIN pmjay_procedures pr ON m.pmjay_procedure_code = pr.code
            WHERE m.hospital_id = $1 AND m.is_enabled = TRUE
            ORDER BY pr.name
        `, [hospitalId]);
        return result.rows;
    }

    /**
     * Create or update procedure mapping
     * @param {number} hospitalId - Hospital ID
     * @param {Object} mapping - Mapping data
     */
    async upsertProcedureMapping(hospitalId, mapping) {
        const result = await this.pool.query(`
            INSERT INTO pmjay_hospital_mappings (
                hospital_id, pmjay_procedure_code, hospital_procedure_name, hospital_rate
            ) VALUES ($1, $2, $3, $4)
            ON CONFLICT (hospital_id, pmjay_procedure_code) DO UPDATE SET
                hospital_procedure_name = EXCLUDED.hospital_procedure_name,
                hospital_rate = EXCLUDED.hospital_rate,
                updated_at = NOW()
            RETURNING *
        `, [
            hospitalId,
            mapping.pmjayProcedureCode,
            mapping.hospitalProcedureName,
            mapping.hospitalRate
        ]);
        return result.rows[0];
    }

    // ============================================
    // Statistics
    // ============================================

    /**
     * Get HBP database statistics
     */
    async getStats() {
        const result = await this.pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM pmjay_specialties WHERE is_active = TRUE) as specialty_count,
                (SELECT COUNT(*) FROM pmjay_packages WHERE is_active = TRUE) as package_count,
                (SELECT COUNT(*) FROM pmjay_procedures WHERE is_active = TRUE) as procedure_count,
                (SELECT MIN(base_rate) FROM pmjay_packages) as min_rate,
                (SELECT MAX(base_rate) FROM pmjay_packages) as max_rate,
                (SELECT COUNT(*) FROM pmjay_packages WHERE requires_preauth = TRUE) as preauth_required_count
        `);
        return result.rows[0];
    }
}

// Singleton instance
const hbpRateService = new HBPRateService();

module.exports = hbpRateService;
