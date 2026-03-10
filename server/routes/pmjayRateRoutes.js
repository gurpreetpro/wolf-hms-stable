/**
 * PMJAY HBP Rate Routes
 * API endpoints for HBP 2.0 rate lookup
 * 
 * WOLF HMS
 */

const express = require('express');
const router = express.Router();
const hbpRateService = require('../services/insurance/HBPRateService');
const { pool } = require('../db');

// Initialize HBP service with database pool
hbpRateService.initialize(pool);

// ============================================
// Specialty Routes
// ============================================

/**
 * GET /api/pmjay/hbp/specialties
 * Get all HBP specialties
 */
router.get('/specialties', async (req, res) => {
    try {
        const specialties = await hbpRateService.getSpecialties();
        res.json({
            success: true,
            data: specialties,
            count: specialties.length
        });
    } catch (error) {
        console.error('[PMJAY HBP] Error fetching specialties:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/pmjay/hbp/specialties/:code
 * Get specialty by code
 */
router.get('/specialties/:code', async (req, res) => {
    try {
        const specialty = await hbpRateService.getSpecialtyByCode(req.params.code);
        if (!specialty) {
            return res.status(404).json({ success: false, error: 'Specialty not found' });
        }
        res.json({ success: true, data: specialty });
    } catch (error) {
        console.error('[PMJAY HBP] Error fetching specialty:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Package Routes
// ============================================

/**
 * GET /api/pmjay/hbp/packages
 * Get packages with optional filters
 * Query params: specialty, requiresPreauth, isSurgical
 */
router.get('/packages', async (req, res) => {
    try {
        const { specialty, requiresPreauth, isSurgical, search, limit } = req.query;

        if (search) {
            // Search mode
            const packages = await hbpRateService.searchPackages(search, parseInt(limit) || 20);
            return res.json({ success: true, data: packages, count: packages.length });
        }

        if (specialty) {
            // Filter by specialty
            const options = {};
            if (requiresPreauth !== undefined) options.requiresPreauth = requiresPreauth === 'true';
            if (isSurgical !== undefined) options.isSurgical = isSurgical === 'true';

            const packages = await hbpRateService.getPackagesBySpecialty(specialty, options);
            return res.json({ success: true, data: packages, count: packages.length });
        }

        // Return stats if no filter
        const stats = await hbpRateService.getStats();
        res.json({
            success: true,
            message: 'Use ?specialty=CODE or ?search=query to get packages',
            stats
        });
    } catch (error) {
        console.error('[PMJAY HBP] Error fetching packages:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/pmjay/hbp/packages/:code
 * Get package by code with tier-adjusted rate
 */
router.get('/packages/:code', async (req, res) => {
    try {
        const cityTier = req.query.tier || 'T2';
        const packageData = await hbpRateService.getPackageRate(req.params.code, cityTier);
        
        if (!packageData) {
            return res.status(404).json({ success: false, error: 'Package not found' });
        }
        
        // Also get procedures for this package
        const procedures = await hbpRateService.getProceduresByPackage(req.params.code);
        
        res.json({ 
            success: true, 
            data: {
                ...packageData,
                procedures
            }
        });
    } catch (error) {
        console.error('[PMJAY HBP] Error fetching package:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Procedure Routes
// ============================================

/**
 * GET /api/pmjay/hbp/procedures/search
 * Search procedures
 * Query params: q, specialty, requiresPreauth, minRate, maxRate, limit
 */
router.get('/procedures/search', async (req, res) => {
    try {
        const { q, specialty, requiresPreauth, minRate, maxRate, limit } = req.query;

        if (!q) {
            return res.status(400).json({ success: false, error: 'Search query (q) is required' });
        }

        const filters = {};
        if (specialty) filters.specialtyCode = specialty;
        if (requiresPreauth !== undefined) filters.requiresPreauth = requiresPreauth === 'true';
        if (minRate) filters.minRate = parseFloat(minRate);
        if (maxRate) filters.maxRate = parseFloat(maxRate);
        if (limit) filters.limit = parseInt(limit);

        const procedures = await hbpRateService.searchProcedures(q, filters);
        res.json({ success: true, data: procedures, count: procedures.length });
    } catch (error) {
        console.error('[PMJAY HBP] Error searching procedures:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/pmjay/hbp/procedures/:code
 * Get procedure by code
 */
router.get('/procedures/:code', async (req, res) => {
    try {
        const procedure = await hbpRateService.getProcedureByCode(req.params.code);
        if (!procedure) {
            return res.status(404).json({ success: false, error: 'Procedure not found' });
        }
        res.json({ success: true, data: procedure });
    } catch (error) {
        console.error('[PMJAY HBP] Error fetching procedure:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// AI Suggestion Routes
// ============================================

/**
 * POST /api/pmjay/hbp/suggest-package
 * AI-assisted package suggestion
 * Body: { diagnosis, icdCodes }
 */
router.post('/suggest-package', async (req, res) => {
    try {
        const { diagnosis, icdCodes } = req.body;

        if (!diagnosis) {
            return res.status(400).json({ success: false, error: 'Diagnosis is required' });
        }

        const suggestions = await hbpRateService.suggestPackages(diagnosis, icdCodes || []);
        res.json({
            success: true,
            data: suggestions,
            count: suggestions.length,
            tip: 'Packages are ranked by keyword match score'
        });
    } catch (error) {
        console.error('[PMJAY HBP] Error suggesting packages:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Claim Calculation Routes
// ============================================

/**
 * POST /api/pmjay/hbp/calculate-claim
 * Calculate claim amount for procedures
 * Body: { procedures: [{code, quantity}], cityTier }
 */
router.post('/calculate-claim', async (req, res) => {
    try {
        const { procedures, cityTier } = req.body;

        if (!procedures || !Array.isArray(procedures) || procedures.length === 0) {
            return res.status(400).json({ success: false, error: 'Procedures array is required' });
        }

        const claimData = await hbpRateService.calculateClaimAmount(procedures, cityTier || 'T2');
        res.json({ success: true, data: claimData });
    } catch (error) {
        console.error('[PMJAY HBP] Error calculating claim:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Hospital Empanelment Routes
// ============================================

/**
 * GET /api/pmjay/hbp/empanelment
 * Get current hospital's PMJAY empanelment status
 */
router.get('/empanelment', async (req, res) => {
    try {
        const hospitalId = req.user?.hospitalId || req.headers['x-hospital-id'];
        if (!hospitalId) {
            return res.status(400).json({ success: false, error: 'Hospital ID required' });
        }

        const empanelment = await hbpRateService.getHospitalEmpanelment(hospitalId);
        res.json({ 
            success: true, 
            data: empanelment || { message: 'Not enrolled in PMJAY' }
        });
    } catch (error) {
        console.error('[PMJAY HBP] Error fetching empanelment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/pmjay/hbp/empanelment
 * Update hospital PMJAY empanelment
 * Body: { pmjayHospitalId, cityTier, stateCode, districtCode, specialtiesEnabled }
 */
router.post('/empanelment', async (req, res) => {
    try {
        const hospitalId = req.user?.hospitalId || req.headers['x-hospital-id'];
        if (!hospitalId) {
            return res.status(400).json({ success: false, error: 'Hospital ID required' });
        }

        const empanelment = await hbpRateService.upsertHospitalEmpanelment(hospitalId, req.body);
        res.json({ success: true, data: empanelment });
    } catch (error) {
        console.error('[PMJAY HBP] Error updating empanelment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Statistics Route
// ============================================

/**
 * GET /api/pmjay/hbp/stats
 * Get HBP database statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await hbpRateService.getStats();
        res.json({ 
            success: true, 
            data: {
                ...stats,
                hbpVersion: '2.2',
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('[PMJAY HBP] Error fetching stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
