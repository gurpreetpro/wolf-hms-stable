/**
 * Government Rate Service
 * Unified rate calculation engine for CGHS, ECHS, and CAPF schemes
 * Handles multi-dimensional pricing: accreditation, city tier, ward, hospital type
 * WOLF HMS
 */

const { pool } = require('../../db');

class GovtRateService {
    constructor() {
        this.modifiersCache = {};
        this.cacheExpiry = null;
    }

    // ============================================
    // Rate Calculation (Core Engine)
    // ============================================

    /**
     * Calculate the adjusted rate for a package based on hospital configuration
     * @param {string} schemeCode - 'cghs', 'echs', or 'capf'
     * @param {string} packageCode - e.g., 'CGHS-GS-001'
     * @param {Object} hospitalConfig - { nabh, cityTier, wardType, isSuperSpecialty }
     * @returns {Object} Calculated rate with breakdown
     */
    async calculateRate(schemeCode, packageCode, hospitalConfig = {}) {
        const {
            nabh = true,
            cityTier = 'X',
            wardType = 'semi_private',
            isSuperSpecialty = false
        } = hospitalConfig;

        // Get base package data
        const pkgResult = await pool.query(
            `SELECT * FROM govt_scheme_packages 
             WHERE scheme_code = $1 AND package_code = $2 AND is_active = true`,
            [schemeCode, packageCode]
        );

        if (pkgResult.rows.length === 0) {
            throw new Error(`Package ${packageCode} not found for scheme ${schemeCode}`);
        }

        const pkg = pkgResult.rows[0];

        // Determine base rate based on accreditation
        let baseRate;
        if (isSuperSpecialty && pkg.rate_super_specialty > 0) {
            baseRate = parseFloat(pkg.rate_super_specialty);
        } else if (nabh) {
            baseRate = parseFloat(pkg.rate_nabh);
        } else {
            baseRate = parseFloat(pkg.rate_non_nabh);
        }

        // Apply modifiers
        const modifiers = await this.getModifiers(schemeCode);
        const appliedModifiers = [];
        let adjustedRate = baseRate;

        // City tier adjustment
        const cityMap = { 'Y': 'tier_2', 'Z': 'tier_3', 'T2': 'tier_2', 'T3': 'tier_3' };
        const cityKey = cityMap[cityTier];
        if (cityKey) {
            const cityMod = modifiers.find(m => m.modifier_type === 'city_tier' && m.modifier_key === cityKey);
            if (cityMod && this._modifierApplies(cityMod, pkg.procedure_type)) {
                const adjustment = adjustedRate * (parseFloat(cityMod.percentage_adjustment) / 100);
                adjustedRate += adjustment;
                appliedModifiers.push({
                    type: 'city_tier',
                    label: cityMod.modifier_label,
                    adjustment: Math.round(adjustment * 100) / 100,
                    percentage: parseFloat(cityMod.percentage_adjustment)
                });
            }
        }

        // Ward entitlement adjustment (only for surgical/medical, not investigations/daycare/consultation)
        const wardMap = { 'general': 'general', 'private': 'private' };
        const wardKey = wardMap[wardType];
        if (wardKey) {
            const wardMod = modifiers.find(m => m.modifier_type === 'ward_type' && m.modifier_key === wardKey);
            if (wardMod && this._modifierApplies(wardMod, pkg.procedure_type)) {
                const adjustment = adjustedRate * (parseFloat(wardMod.percentage_adjustment) / 100);
                adjustedRate += adjustment;
                appliedModifiers.push({
                    type: 'ward_type',
                    label: wardMod.modifier_label,
                    adjustment: Math.round(adjustment * 100) / 100,
                    percentage: parseFloat(wardMod.percentage_adjustment)
                });
            }
        }

        adjustedRate = Math.round(adjustedRate * 100) / 100;

        return {
            schemeCode,
            packageCode,
            procedureName: pkg.procedure_name,
            specialty: pkg.specialty,
            procedureType: pkg.procedure_type,
            baseRate,
            adjustedRate,
            accreditation: isSuperSpecialty ? 'super_specialty' : (nabh ? 'nabh' : 'non_nabh'),
            cityTier,
            wardType,
            appliedModifiers,
            implantAllowance: parseFloat(pkg.implant_allowance) || 0,
            consumableAllowance: parseFloat(pkg.consumable_allowance) || 0,
            totalAllowance: adjustedRate + (parseFloat(pkg.implant_allowance) || 0) + (parseFloat(pkg.consumable_allowance) || 0),
            maxLosDays: pkg.max_los_days,
            requiresPreauth: pkg.requires_preauth,
            isDaycare: pkg.is_daycare,
            inclusions: pkg.inclusions,
            exclusions: pkg.exclusions,
            specialConditions: pkg.special_conditions
        };
    }

    /**
     * Calculate bill allowance for multiple procedures
     * Applies multiple surgery rules (100%, 50%, 25%)
     * @param {string} schemeCode
     * @param {Array} procedures - [{packageCode, quantity, isBilateral}]
     * @param {Object} hospitalConfig
     */
    async calculateBill(schemeCode, procedures, hospitalConfig = {}) {
        const lineItems = [];
        let totalAllowance = 0;
        let surgicalCount = 0;

        // Sort procedures by rate (highest first for multi-surgery rules)
        const ratedProcedures = [];
        for (const proc of procedures) {
            const rate = await this.calculateRate(schemeCode, proc.packageCode, hospitalConfig);
            ratedProcedures.push({ ...proc, rate });
        }
        ratedProcedures.sort((a, b) => b.rate.adjustedRate - a.rate.adjustedRate);

        for (const proc of ratedProcedures) {
            const { rate } = proc;
            const qty = proc.quantity || 1;
            const isBilateral = proc.isBilateral || false;

            let lineAmount = rate.adjustedRate;
            let surgeryMultiplier = 1;
            let surgeryNote = '';

            // Apply multi-surgery rules for surgical procedures
            if (rate.procedureType === 'surgical') {
                surgicalCount++;
                if (surgicalCount === 2) {
                    surgeryMultiplier = 0.5;
                    surgeryNote = '2nd surgery in same session (50%)';
                } else if (surgicalCount >= 3) {
                    surgeryMultiplier = 0.25;
                    surgeryNote = '3rd+ surgery in same session (25%)';
                }
            }

            lineAmount = lineAmount * surgeryMultiplier;

            // Bilateral surgery
            let bilateralAmount = 0;
            if (isBilateral) {
                bilateralAmount = rate.adjustedRate * 0.5;
                surgeryNote += (surgeryNote ? ' + ' : '') + 'Bilateral (2nd side at 50%)';
            }

            const totalLine = (lineAmount + bilateralAmount) * qty;
            totalAllowance += totalLine;

            lineItems.push({
                packageCode: proc.packageCode,
                procedureName: rate.procedureName,
                specialty: rate.specialty,
                baseRate: rate.baseRate,
                adjustedRate: rate.adjustedRate,
                surgeryMultiplier,
                bilateralAmount,
                quantity: qty,
                lineTotal: Math.round(totalLine * 100) / 100,
                surgeryNote,
                implantAllowance: rate.implantAllowance * qty,
                consumableAllowance: rate.consumableAllowance * qty
            });
        }

        const totalImplants = lineItems.reduce((sum, li) => sum + li.implantAllowance, 0);
        const totalConsumables = lineItems.reduce((sum, li) => sum + li.consumableAllowance, 0);

        return {
            schemeCode,
            hospitalConfig,
            lineItems,
            summary: {
                packageTotal: Math.round(totalAllowance * 100) / 100,
                implantTotal: totalImplants,
                consumableTotal: totalConsumables,
                grandTotal: Math.round((totalAllowance + totalImplants + totalConsumables) * 100) / 100,
                procedureCount: procedures.length,
                surgicalCount: surgicalCount
            }
        };
    }

    // ============================================
    // Package Lookup
    // ============================================

    /**
     * Get packages for a scheme with optional filters
     */
    async getPackages(schemeCode, options = {}) {
        const { specialty, procedureType, requiresPreauth, isDaycare, limit = 100, offset = 0 } = options;

        let query = `SELECT * FROM govt_scheme_packages WHERE scheme_code = $1 AND is_active = true`;
        const params = [schemeCode];
        let paramCount = 1;

        if (specialty) {
            paramCount++;
            query += ` AND LOWER(specialty) = LOWER($${paramCount})`;
            params.push(specialty);
        }
        if (procedureType) {
            paramCount++;
            query += ` AND procedure_type = $${paramCount}`;
            params.push(procedureType);
        }
        if (requiresPreauth !== undefined) {
            paramCount++;
            query += ` AND requires_preauth = $${paramCount}`;
            params.push(requiresPreauth);
        }
        if (isDaycare !== undefined) {
            paramCount++;
            query += ` AND is_daycare = $${paramCount}`;
            params.push(isDaycare);
        }

        query += ` ORDER BY specialty, package_code LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Search packages by text
     */
    async searchPackages(schemeCode, searchQuery, limit = 20) {
        const result = await pool.query(
            `SELECT * FROM govt_scheme_packages 
             WHERE scheme_code = $1 AND is_active = true
             AND (LOWER(procedure_name) LIKE LOWER($2) OR LOWER(package_code) LIKE LOWER($2) OR LOWER(specialty) LIKE LOWER($2))
             ORDER BY procedure_name
             LIMIT $3`,
            [schemeCode, `%${searchQuery}%`, limit]
        );
        return result.rows;
    }

    /**
     * Get specialties for a scheme
     */
    async getSpecialties(schemeCode) {
        const result = await pool.query(
            `SELECT specialty, COUNT(*) as package_count 
             FROM govt_scheme_packages 
             WHERE scheme_code = $1 AND is_active = true
             GROUP BY specialty ORDER BY specialty`,
            [schemeCode]
        );
        return result.rows;
    }

    /**
     * Compare rates for same procedure across schemes
     */
    async compareRates(packageSuffix, hospitalConfig = {}) {
        // Package suffix is the part after scheme prefix, e.g., 'GS-001'
        const schemes = ['cghs', 'echs'];
        const comparison = {};

        for (const scheme of schemes) {
            try {
                // Try to find the package with scheme prefix
                const result = await pool.query(
                    `SELECT * FROM govt_scheme_packages 
                     WHERE scheme_code = $1 AND package_code LIKE $2 AND is_active = true LIMIT 1`,
                    [scheme, `%${packageSuffix}%`]
                );
                if (result.rows.length > 0) {
                    const rate = await this.calculateRate(scheme, result.rows[0].package_code, hospitalConfig);
                    comparison[scheme] = rate;
                }
            } catch (e) {
                comparison[scheme] = { error: e.message };
            }
        }

        return comparison;
    }

    // ============================================
    // Modifiers
    // ============================================

    /**
     * Get rate modifiers for a scheme (cached)
     */
    async getModifiers(schemeCode) {
        const now = Date.now();
        if (this.modifiersCache[schemeCode] && this.cacheExpiry && now < this.cacheExpiry) {
            return this.modifiersCache[schemeCode];
        }

        const result = await pool.query(
            `SELECT * FROM govt_rate_modifiers WHERE scheme_code = $1 AND is_active = true ORDER BY modifier_type`,
            [schemeCode]
        );

        this.modifiersCache[schemeCode] = result.rows;
        this.cacheExpiry = now + 300000; // 5 min cache
        return result.rows;
    }

    /**
     * Check if a modifier applies to a procedure type
     */
    _modifierApplies(modifier, procedureType) {
        if (!modifier.applies_to_procedure_types || modifier.applies_to_procedure_types.length === 0) {
            return true; // NULL or empty = applies to all
        }
        return modifier.applies_to_procedure_types.includes(procedureType);
    }

    // ============================================
    // Beneficiary Management
    // ============================================

    async registerBeneficiary(data) {
        const {
            patientId, schemeCode, beneficiaryId, cardType, beneficiaryName,
            relation, sponsoringAuthority, wardEntitlement,
            serviceNumber, rank, echsPolyclinic,
            forceName, serviceId, referralNumber, referralValidUntil
        } = data;

        const result = await pool.query(
            `INSERT INTO govt_scheme_beneficiaries 
             (patient_id, scheme_code, beneficiary_id, card_type, beneficiary_name,
              relation, sponsoring_authority, ward_entitlement,
              service_number, rank, echs_polyclinic,
              force_name, service_id, referral_number, referral_valid_until,
              verification_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'pending')
             ON CONFLICT (patient_id, scheme_code) DO UPDATE SET
                beneficiary_id = EXCLUDED.beneficiary_id,
                card_type = EXCLUDED.card_type,
                beneficiary_name = EXCLUDED.beneficiary_name,
                ward_entitlement = EXCLUDED.ward_entitlement,
                updated_at = NOW()
             RETURNING *`,
            [patientId, schemeCode, beneficiaryId, cardType, beneficiaryName,
             relation, sponsoringAuthority, wardEntitlement || 'semi_private',
             serviceNumber, rank, echsPolyclinic,
             forceName, serviceId, referralNumber, referralValidUntil]
        );
        return result.rows[0];
    }

    async verifyBeneficiary(beneficiaryDbId) {
        const result = await pool.query(
            `UPDATE govt_scheme_beneficiaries 
             SET verification_status = 'verified', verified_at = NOW(), updated_at = NOW()
             WHERE id = $1 RETURNING *`,
            [beneficiaryDbId]
        );
        return result.rows[0];
    }

    async searchBeneficiaries(schemeCode, searchQuery) {
        const result = await pool.query(
            `SELECT b.*, p.first_name, p.last_name, p.phone
             FROM govt_scheme_beneficiaries b
             JOIN patients p ON p.id = b.patient_id
             WHERE b.scheme_code = $1 
             AND (b.beneficiary_id ILIKE $2 OR b.beneficiary_name ILIKE $2 
                  OR b.service_number ILIKE $2 OR b.service_id ILIKE $2)
             ORDER BY b.created_at DESC LIMIT 20`,
            [schemeCode, `%${searchQuery}%`]
        );
        return result.rows;
    }

    async getPatientSchemes(patientId) {
        const result = await pool.query(
            `SELECT * FROM govt_scheme_beneficiaries 
             WHERE patient_id = $1::uuid AND is_active = true 
             ORDER BY scheme_code`,
            [patientId]
        );
        return result.rows;
    }

    // ============================================
    // Empanelment
    // ============================================

    async getEmpanelment(hospitalId, schemeCode = null) {
        let query = `SELECT * FROM govt_scheme_empanelment WHERE hospital_id = $1`;
        const params = [hospitalId];
        if (schemeCode) {
            query += ` AND scheme_code = $2`;
            params.push(schemeCode);
        }
        query += ` ORDER BY scheme_code`;
        const result = await pool.query(query, params);
        return schemeCode ? result.rows[0] : result.rows;
    }

    async upsertEmpanelment(hospitalId, data) {
        const {
            schemeCode, empanelmentId, nabhAccredited, nablAccredited,
            isSuperSpecialty, bedCount, cityTier, cityName, stateCode,
            specialtiesEnabled, moaValidUntil
        } = data;

        const result = await pool.query(
            `INSERT INTO govt_scheme_empanelment 
             (hospital_id, scheme_code, empanelment_id, nabh_accredited, nabl_accredited,
              is_super_specialty, bed_count, city_tier, city_name, state_code,
              specialties_enabled, moa_valid_until)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (hospital_id, scheme_code) DO UPDATE SET
                empanelment_id = EXCLUDED.empanelment_id,
                nabh_accredited = EXCLUDED.nabh_accredited,
                nabl_accredited = EXCLUDED.nabl_accredited,
                is_super_specialty = EXCLUDED.is_super_specialty,
                bed_count = EXCLUDED.bed_count,
                city_tier = EXCLUDED.city_tier,
                city_name = EXCLUDED.city_name,
                specialties_enabled = EXCLUDED.specialties_enabled,
                moa_valid_until = EXCLUDED.moa_valid_until,
                updated_at = NOW()
             RETURNING *`,
            [hospitalId, schemeCode, empanelmentId, nabhAccredited || false, nablAccredited || false,
             isSuperSpecialty || false, bedCount, cityTier || 'X', cityName, stateCode,
             specialtiesEnabled || [], moaValidUntil]
        );
        return result.rows[0];
    }

    // ============================================
    // Statistics
    // ============================================

    async getStats(schemeCode) {
        const result = await pool.query(
            `SELECT 
                scheme_code,
                COUNT(*) as total_packages,
                COUNT(DISTINCT specialty) as specialties,
                COUNT(*) FILTER (WHERE procedure_type = 'surgical') as surgical_count,
                COUNT(*) FILTER (WHERE procedure_type = 'investigation') as investigation_count,
                COUNT(*) FILTER (WHERE procedure_type = 'consultation') as consultation_count,
                COUNT(*) FILTER (WHERE is_daycare = true) as daycare_count,
                ROUND(AVG(rate_nabh), 2) as avg_nabh_rate,
                MIN(rate_nabh) as min_rate,
                MAX(rate_nabh) as max_rate
             FROM govt_scheme_packages 
             WHERE scheme_code = $1 AND is_active = true
             GROUP BY scheme_code`,
            [schemeCode]
        );
        return result.rows[0] || { scheme_code: schemeCode, total_packages: 0 };
    }

    /**
     * Get CGHS ward entitlement based on 7th CPC pay level
     */
    getWardEntitlement(basicPay) {
        if (basicPay <= 47600) return 'general';
        if (basicPay <= 63100) return 'semi_private';
        return 'private';
    }

    /**
     * Get package duration in days
     */
    getPackageDuration(procedureType, isSuperSpecialty = false) {
        if (isSuperSpecialty) return 12;
        const durations = {
            'surgical': 7,
            'medical': 7,
            'laparoscopic': 3,
            'daycare': 1,
            'minor': 1,
            'investigation': 0,
            'consultation': 0
        };
        return durations[procedureType] || 3;
    }

    // ============================================
    // CSV Import Helper (for bulk rate addition)
    // ============================================

    /**
     * Import packages from structured array (for CSV/Excel import)
     * @param {string} schemeCode
     * @param {Array} packages - [{packageCode, procedureName, specialty, rateNonNabh, rateNabh, rateSuperSpecialty, ...}]
     */
    async bulkImportPackages(schemeCode, packages) {
        let imported = 0;
        let errors = [];

        for (const pkg of packages) {
            try {
                await pool.query(
                    `INSERT INTO govt_scheme_packages 
                     (scheme_code, package_code, procedure_name, specialty, sub_specialty,
                      rate_non_nabh, rate_nabh, rate_super_specialty,
                      implant_allowance, consumable_allowance,
                      procedure_type, is_super_specialty, requires_preauth,
                      max_los_days, is_daycare, inclusions, exclusions)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                     ON CONFLICT (scheme_code, package_code) DO UPDATE SET
                        procedure_name = EXCLUDED.procedure_name,
                        rate_non_nabh = EXCLUDED.rate_non_nabh,
                        rate_nabh = EXCLUDED.rate_nabh,
                        rate_super_specialty = EXCLUDED.rate_super_specialty,
                        updated_at = NOW()`,
                    [schemeCode, pkg.packageCode, pkg.procedureName, pkg.specialty, pkg.subSpecialty || null,
                     pkg.rateNonNabh || 0, pkg.rateNabh || 0, pkg.rateSuperSpecialty || 0,
                     pkg.implantAllowance || 0, pkg.consumableAllowance || 0,
                     pkg.procedureType || 'surgical', pkg.isSuperSpecialty || false, pkg.requiresPreauth !== false,
                     pkg.maxLosDays || null, pkg.isDaycare || false, pkg.inclusions || null, pkg.exclusions || null]
                );
                imported++;
            } catch (e) {
                errors.push({ packageCode: pkg.packageCode, error: e.message });
            }
        }

        return { imported, errors, total: packages.length };
    }
}

module.exports = new GovtRateService();
