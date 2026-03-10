const express = require('express');
const router = express.Router();
const {
    orderTest,
    getLabQueue,
    uploadResult,
    getLabStats,
    getLabTests,
    getLabResultsByPatient,
    getLabHistory,
    getPackages,
    requestLabChange,
    getLabRequests,
    approveLabChange,
    denyLabChange,
    // Phase 1 Upgrades
    generateBarcode,
    collectSample,
    processPayment, // ADDED - was missing!
    getAuditLog,
    getReferenceRanges,
    getCriticalAlerts,
    // Phase 2 Upgrades
    getTATAnalytics,
    amendResult,
    getResultVersions,
    verifyResult,
    getPatientTrends,
    acknowledgeCriticalAlert,
    getPendingCriticalAlerts,
    // Phase 3 Upgrades
    getReagents,
    addReagent,
    updateReagent,
    useReagent,
    getLowStockAlerts,
    getQCMaterials,
    addQCResult,
    getQCResults,
    generateReportToken,
    getPublicReport,
    // Phase 4 Upgrades
    getLabRevenue,
    getLabWorkload,
    // Phase 5: Dual-Department Payment Integration
    getPendingLabPayments,
    getLabPaymentStatus,
    // Phase 5: AI OCR
} = require('../controllers/labController');
const { parseLabReport } = require('../controllers/labOCRController');
const multer = require('multer');
const path = require('path');

// Configure Multer for temp uploads
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|pdf/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images/PDFs are allowed!'));
    }
});
const { protect, authorize } = require('../middleware/authMiddleware');

// Existing Routes
router.post('/order', protect, authorize('doctor', 'admin'), orderTest);
router.get('/queue', protect, authorize('lab_tech', 'admin'), getLabQueue);
router.post('/upload-result', protect, authorize('lab_tech', 'admin'), uploadResult);
router.get('/stats', protect, authorize('lab_tech', 'admin'), getLabStats);
router.get('/tests', protect, getLabTests); // Available to all authenticated users
router.get('/patient/:patient_id', protect, getLabResultsByPatient);
router.get('/history', protect, authorize('lab_tech', 'admin'), getLabHistory);
router.post('/parse-result', protect, authorize('lab_tech', 'admin'), upload.single('file'), parseLabReport);

// Lab Packages
router.get('/packages', protect, getPackages); // Available to all

// Lab Change Requests (Admin Logic)
router.post('/change-request', protect, authorize('lab_tech', 'admin'), requestLabChange);
router.get('/requests', protect, authorize('admin'), getLabRequests);
router.post('/request/:id/approve', protect, authorize('admin'), approveLabChange);
router.post('/request/:id/deny', protect, authorize('admin'), denyLabChange);

// =============================================
// PHASE 1 UPGRADES - December 2025
// =============================================

// Barcode & Sample Collection
router.post('/barcode/:id', protect, authorize('lab_tech', 'admin'), generateBarcode);
router.post('/collect/:id', protect, authorize('lab_tech', 'admin'), collectSample);
router.post('/payment/:id', protect, authorize('lab_tech', 'admin'), processPayment); // ADDED - Payment Processing

// Audit Trail
router.get('/audit/:id', protect, authorize('lab_tech', 'admin'), getAuditLog);

// Reference Ranges
router.get('/reference-ranges', protect, getReferenceRanges);

// Critical Alerts
router.get('/critical-alerts', protect, authorize('lab_tech', 'admin', 'doctor'), getCriticalAlerts);

// =============================================
// PHASE 2 UPGRADES - December 2025
// =============================================

// TAT Analytics
router.get('/analytics/tat', protect, authorize('lab_tech', 'admin'), getTATAnalytics);

// Result Amendment & Verification
router.post('/result/:id/amend', protect, authorize('lab_tech', 'admin'), amendResult);
router.get('/result/:id/versions', protect, authorize('lab_tech', 'admin'), getResultVersions);
router.post('/result/:id/verify', protect, authorize('lab_tech', 'admin', 'doctor'), verifyResult);

// Patient Trends
router.get('/trends/:patient_id', protect, getPatientTrends);
router.get('/trends/:patient_id/:test_type', protect, getPatientTrends);

// Critical Alerts Management
router.get('/critical-alerts/pending', protect, authorize('lab_tech', 'admin', 'doctor'), getPendingCriticalAlerts);
router.post('/critical-alerts/:id/acknowledge', protect, authorize('lab_tech', 'admin', 'doctor'), acknowledgeCriticalAlert);

// =============================================
// PHASE 3 UPGRADES - December 2025
// =============================================

// Reagent Inventory
router.get('/reagents', protect, authorize('lab_tech', 'admin'), getReagents);
router.post('/reagents', protect, authorize('lab_tech', 'admin'), addReagent);
router.put('/reagents/:id', protect, authorize('lab_tech', 'admin'), updateReagent);
router.post('/reagents/:id/use', protect, authorize('lab_tech', 'admin'), useReagent);
router.get('/reagents/low-stock', protect, authorize('lab_tech', 'admin'), getLowStockAlerts);

// QC Management
router.get('/qc/materials', protect, authorize('lab_tech', 'admin'), getQCMaterials);
router.post('/qc/results', protect, authorize('lab_tech', 'admin'), addQCResult);
router.get('/qc/results/:material_id', protect, authorize('lab_tech', 'admin'), getQCResults);

// Report Sharing
router.post('/report/:id/generate-link', protect, authorize('lab_tech', 'admin'), generateReportToken);
router.get('/public/report/:token', getPublicReport); // No auth required

// =============================================
// PHASE 4 UPGRADES - December 2025
// =============================================

// Revenue & Workload Analytics
router.get('/analytics/revenue', protect, authorize('lab_tech', 'admin'), getLabRevenue);
router.get('/analytics/workload', protect, authorize('lab_tech', 'admin'), getLabWorkload);

// =============================================
// PHASE 5: DUAL-DEPARTMENT PAYMENT INTEGRATION
// =============================================

// Pending Lab Payments (for Billing Dashboard)
router.get('/pending-payments', protect, authorize('admin', 'receptionist', 'billing', 'lab_tech'), getPendingLabPayments);

// Lab Payment Status
router.get('/payment-status/:id', protect, getLabPaymentStatus);

// =============================================
// PHASE 6: UNIFIED LAB SYSTEM - December 2025
// =============================================

const pool = require('../config/db');

// Get test parameters by test ID (unified endpoint)
router.get('/test/:testId/parameters', protect, async (req, res) => {
    try {
        const { testId } = req.params;
        
        // First get parameters linked to this test
        const result = await pool.query(`
            SELECT p.*, t.name as test_name
            FROM lab_parameters p
            JOIN lab_test_types t ON p.test_type_id = t.id
            WHERE p.test_type_id = $1
            ORDER BY p.display_order
        `, [testId]);
        
        // If none found, return empty array (frontend uses hardcoded fallback)
        res.json(result.rows);
    } catch (error) {
        console.error('Get test parameters error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get package with all tests and their parameters
router.get('/package/:packageId/full', protect, async (req, res) => {
    try {
        const { packageId } = req.params;
        
        // Get package details
        const pkgResult = await pool.query(
            'SELECT * FROM lab_packages WHERE id = $1',
            [packageId]
        );
        
        if (pkgResult.rows.length === 0) {
            return res.status(404).json({ message: 'Package not found' });
        }
        
        const pkg = pkgResult.rows[0];
        
        // Get all tests in package with their parameters
        const testsResult = await pool.query(`
            SELECT 
                t.id as test_id,
                t.name as test_name,
                COALESCE(json_agg(
                    json_build_object(
                        'key', p.parameter_name,
                        'label', p.parameter_name,
                        'type', 'number',
                        'unit', p.unit,
                        'reference_min', p.normal_range_min,
                        'reference_max', p.normal_range_max
                    )
                ) FILTER (WHERE p.id IS NOT NULL), '[]') as parameters
            FROM lab_package_items i
            JOIN lab_test_types t ON i.test_type_id = t.id
            LEFT JOIN lab_parameters p ON p.test_type_id = t.id
            WHERE i.package_id = $1
            GROUP BY t.id, t.name
        `, [packageId]);
        
        res.json({
            ...pkg,
            tests: testsResult.rows
        });
    } catch (error) {
        console.error('Get package full error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create custom package
router.post('/packages', protect, authorize('admin', 'lab_tech'), async (req, res) => {
    try {
        const { name, price, description, category, test_ids } = req.body;
        
        // Create package
        const pkgResult = await pool.query(`
            INSERT INTO lab_packages (name, price, description, category)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [name, price, description, category || 'Custom']);
        
        const packageId = pkgResult.rows[0].id;
        
        // Link tests to package
        if (test_ids && test_ids.length > 0) {
            for (const testId of test_ids) {
                await pool.query(
                    'INSERT INTO lab_package_items (package_id, test_type_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [packageId, testId]
                );
            }
        }
        
        res.status(201).json(pkgResult.rows[0]);
    } catch (error) {
        console.error('Create package error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update package
router.put('/packages/:id', protect, authorize('admin', 'lab_tech'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, description, category, test_ids } = req.body;
        
        // Update package
        const result = await pool.query(`
            UPDATE lab_packages 
            SET name = COALESCE($1, name), 
                price = COALESCE($2, price),
                description = COALESCE($3, description),
                category = COALESCE($4, category)
            WHERE id = $5
            RETURNING *
        `, [name, price, description, category, id]);
        
        // Update test links if provided
        if (test_ids) {
            await pool.query('DELETE FROM lab_package_items WHERE package_id = $1', [id]);
            for (const testId of test_ids) {
                await pool.query(
                    'INSERT INTO lab_package_items (package_id, test_type_id) VALUES ($1, $2)',
                    [id, testId]
                );
            }
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update package error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete package
router.delete('/packages/:id', protect, authorize('admin'), async (req, res) => {
    try {
        await pool.query('DELETE FROM lab_package_items WHERE package_id = $1', [req.params.id]);
        await pool.query('DELETE FROM lab_packages WHERE id = $1', [req.params.id]);
        res.json({ message: 'Package deleted' });
    } catch (error) {
        console.error('Delete package error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all available test types for package builder - FIXED: Now filters by hospital_id
router.get('/test-types', protect, async (req, res) => {
    try {
        const hospitalId = req.user?.hospital_id || req.query.hospital_id;
        const result = await pool.query(`
            SELECT t.id, t.name, t.price, c.name as category, t.hospital_id
            FROM lab_test_types t
            LEFT JOIN lab_test_categories c ON t.category_id = c.id
            WHERE (t.hospital_id = $1 OR t.hospital_id IS NULL)
            ORDER BY c.name, t.name
        `, [hospitalId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Get test types error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// ADMIN: DIRECT PRICE UPDATE (bypasses approval workflow)
// =============================================

// Update individual test price directly (admin only)
router.put('/test/:id/price', protect, authorize('admin', 'super_admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { price, reason } = req.body;
        const hospitalId = req.user?.hospital_id;
        
        if (!price || isNaN(price)) {
            return res.status(400).json({ message: 'Valid price is required' });
        }
        
        // Get current price for audit
        const current = await pool.query('SELECT * FROM lab_test_types WHERE id = $1', [id]);
        if (current.rows.length === 0) {
            return res.status(404).json({ message: 'Test not found' });
        }
        
        const oldPrice = current.rows[0].price;
        
        // Update price
        const result = await pool.query(
            'UPDATE lab_test_types SET price = $1 WHERE id = $2 RETURNING *',
            [price, id]
        );
        
        // Log the change
        console.log(`[ADMIN PRICE UPDATE] Test: ${result.rows[0].name}, Old: ₹${oldPrice}, New: ₹${price}, By: ${req.user.username}, Reason: ${reason || 'N/A'}`);
        
        res.json({ 
            message: 'Price updated successfully', 
            test: result.rows[0],
            change: { old_price: oldPrice, new_price: price }
        });
    } catch (error) {
        console.error('Update test price error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Bulk update prices (admin only)
router.post('/tests/bulk-price-update', protect, authorize('admin', 'super_admin'), async (req, res) => {
    try {
        const { updates } = req.body; // Array of { id, price }
        const hospitalId = req.user?.hospital_id;
        
        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({ message: 'Updates array is required' });
        }
        
        const results = [];
        for (const update of updates) {
            if (update.id && update.price && !isNaN(update.price)) {
                await pool.query(
                    'UPDATE lab_test_types SET price = $1 WHERE id = $2 AND (hospital_id = $3 OR hospital_id IS NULL)',
                    [update.price, update.id, hospitalId]
                );
                results.push({ id: update.id, price: update.price, status: 'updated' });
            }
        }
        
        res.json({ 
            message: `Updated ${results.length} test prices`, 
            results,
            by: req.user.username
        });
    } catch (error) {
        console.error('Bulk price update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// ADMIN: INITIALIZE KOKILA LAB TESTS
// =============================================

// Kokila Hospital Lab Test Prices (hardcoded for initialization)
const kokilaLabTests = [
    { name: 'HCV - RNA Quantitative', price: 6000, category: 'Hematology' },
    { name: 'ESR', price: 100, category: 'Hematology' },
    { name: 'RBS (Random Blood Sugar)', price: 100, category: 'Hematology' },
    { name: 'BG (Blood Group)', price: 100, category: 'Hematology' },
    { name: 'Semen Analysis', price: 200, category: 'Hematology' },
    { name: 'U/R (Urine Routine)', price: 100, category: 'Hematology' },
    { name: 'PCT', price: 2500, category: 'Hematology' },
    { name: 'Feretin (Ferritin)', price: 400, category: 'Hematology' },
    { name: 'Pus C/S', price: 500, category: 'Hematology' },
    { name: 'Fluid Culture', price: 500, category: 'Hematology' },
    { name: 'Blood C/S', price: 1000, category: 'Hematology' },
    { name: 'RFT (Renal Function Test)', price: 400, category: 'Hematology' },
    { name: 'Urea', price: 100, category: 'Hematology' },
    { name: 'S. Crt (Serum Creatinine)', price: 100, category: 'Hematology' },
    { name: 'Na+ (Sodium)', price: 100, category: 'Hematology' },
    { name: 'FNAC', price: 800, category: 'Hematology' },
    { name: 'LFT (Liver Function Test)', price: 400, category: 'Hematology' },
    { name: 'OT (SGOT)', price: 80, category: 'Hematology' },
    { name: 'PT (SGPT)', price: 80, category: 'Hematology' },
    { name: 'Bilirubin', price: 100, category: 'Hematology' },
    { name: 'Lipid Profile', price: 400, category: 'Hematology' },
    { name: 'Cholestrol', price: 100, category: 'Hematology' },
    { name: 'VDRL', price: 100, category: 'Hematology' },
    { name: 'TFT (Thyroid Function Test)', price: 500, category: 'Hematology' },
    { name: 'TSH', price: 300, category: 'Hematology' },
    { name: 'LH', price: 800, category: 'Hematology' },
    { name: 'FSH', price: 750, category: 'Hematology' },
    { name: 'E2 (Estradiol)', price: 600, category: 'Hematology' },
    { name: 'S. Prolactin', price: 700, category: 'Hematology' },
    { name: 'Beta HCG', price: 500, category: 'Hematology' },
    { name: 'S. Testosterone', price: 1200, category: 'Hematology' },
    { name: 'Lipase', price: 400, category: 'Hematology' },
    { name: 'Amylase', price: 400, category: 'Hematology' },
    { name: 'CK-MB', price: 600, category: 'Hematology' },
    { name: 'HbA1c', price: 400, category: 'Hematology' },
    { name: 'Dengue', price: 1000, category: 'Hematology' },
    { name: 'ALP', price: 80, category: 'Hematology' },
    { name: 'IgE', price: 1000, category: 'Hematology' },
    { name: 'Fluid Cytology', price: 500, category: 'Hematology' },
    { name: 'Biochemistry', price: 500, category: 'Hematology' },
    { name: 'S. ADA', price: 900, category: 'Hematology' },
    { name: 'S. AFB', price: 400, category: 'Hematology' },
    { name: 'CA-125', price: 1000, category: 'Hematology' },
    { name: 'CA-19.9', price: 1000, category: 'Hematology' },
    { name: 'Mantoux', price: 100, category: 'Hematology' },
    { name: 'Electrolyte', price: 300, category: 'Hematology' },
    { name: 'ABG', price: 1000, category: 'Hematology' },
    { name: 'ESH', price: 500, category: 'Hematology' },
    { name: 'Protein', price: 100, category: 'Hematology' },
    { name: 'Albumin', price: 100, category: 'Hematology' },
    { name: 'S. Ammonia', price: 1000, category: 'Hematology' },
    { name: 'CB-NAAT', price: 2200, category: 'Hematology' },
    { name: 'KOH Smear', price: 150, category: 'Hematology' },
    { name: 'LL/CLPD Renal basic', price: 8000, category: 'Hematology' },
    { name: 'CLL/CLPD Comprehensive', price: 13000, category: 'Hematology' },
    { name: 'CSF Fluid', price: 500, category: 'Hematology' },
    { name: 'Malignant Cytology', price: 500, category: 'Hematology' },
    { name: 'TB Gold', price: 2500, category: 'Hematology' },
    { name: 'Pap Smear', price: 800, category: 'Hematology' },
    { name: 'APTT', price: 600, category: 'Hematology' },
    { name: 'Widal Slide Method', price: 100, category: 'Hematology' },
    { name: 'MP Card', price: 200, category: 'Hematology' },
    { name: 'Gram Stain', price: 400, category: 'Hematology' },
    { name: 'CBC', price: 150, category: 'Hematology' },
    { name: 'Uric Acid', price: 100, category: 'Hematology' },
    { name: 'Calcium', price: 200, category: 'Hematology' },
    { name: 'RA Factor', price: 100, category: 'Hematology' },
    { name: 'Quantitative RA', price: 400, category: 'Hematology' },
    { name: 'PT/INR', price: 400, category: 'Hematology' },
    { name: 'Vit-D', price: 1000, category: 'Hematology' },
    { name: 'CRP', price: 400, category: 'Hematology' },
    { name: 'PBF', price: 200, category: 'Hematology' },
    { name: 'PSA', price: 600, category: 'Hematology' },
    { name: 'AFP', price: 700, category: 'Hematology' },
    { name: 'Iron Studies', price: 1500, category: 'Hematology' },
    { name: 'Vit B12', price: 1000, category: 'Hematology' },
    { name: 'Folic Acid', price: 1000, category: 'Hematology' },
    { name: 'Urine C/S', price: 500, category: 'Hematology' },
    { name: 'Stool R/E', price: 150, category: 'Hematology' },
    { name: 'Occult Blood', price: 400, category: 'Hematology' },
    { name: 'Stool Culture', price: 500, category: 'Hematology' },
    { name: 'CEA', price: 700, category: 'Hematology' },
    { name: 'Sputum C/S', price: 550, category: 'Hematology' },
    { name: 'Retic Count', price: 150, category: 'Hematology' },
    { name: 'FBS (Fasting Blood Sugar)', price: 100, category: 'Hematology' }
];

// Initialize Kokila Lab Tests (admin only, one-time setup)
router.post('/admin/initialize-kokila-tests', protect, authorize('admin', 'super_admin'), async (req, res) => {
    try {
        // Find Kokila Hospital
        const hospitalRes = await pool.query("SELECT id FROM hospitals WHERE name ILIKE '%kokila%' LIMIT 1");
        if (hospitalRes.rows.length === 0) {
            return res.status(404).json({ message: 'Kokila Hospital not found' });
        }
        const kokilaHospitalId = hospitalRes.rows[0].id;
        
        let created = 0, updated = 0;
        
        for (const test of kokilaLabTests) {
            // Check if test exists for Kokila
            const existing = await pool.query(
                'SELECT id, price FROM lab_test_types WHERE name = $1 AND hospital_id = $2',
                [test.name, kokilaHospitalId]
            );
            
            if (existing.rows.length > 0) {
                // Update price if different
                if (parseFloat(existing.rows[0].price) !== test.price) {
                    await pool.query(
                        'UPDATE lab_test_types SET price = $1 WHERE id = $2',
                        [test.price, existing.rows[0].id]
                    );
                    updated++;
                }
            } else {
                // Create new test
                await pool.query(
                    'INSERT INTO lab_test_types (name, price, hospital_id, is_active) VALUES ($1, $2, $3, TRUE)',
                    [test.name, test.price, kokilaHospitalId]
                );
                created++;
            }
        }
        
        res.json({ 
            success: true,
            message: `Kokila Lab Tests initialized`,
            hospitalId: kokilaHospitalId,
            created,
            updated,
            total: kokilaLabTests.length
        });
    } catch (error) {
        console.error('Initialize Kokila tests error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


module.exports = router;

