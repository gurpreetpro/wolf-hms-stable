/**
 * Lab Instrument Routes - Multi-Tenant  
 * Connects lab analyzers to Wolf HMS
 */
const express = require('express');
const router = express.Router();
const net = require('net');
const { protect, authorize } = require('../middleware/authMiddleware');
const instrumentController = require('../controllers/instrumentController');
const lisService = require('../services/lisService');
const driverRegistry = require('../lib/drivers');

// =============================================
// DRIVER REGISTRY (from code - not DB)
// =============================================

// GET available drivers from code registry (not DB)
router.get('/registry', protect, (req, res) => {
    res.json({
        success: true,
        data: driverRegistry.getAvailableDrivers(),
        byManufacturer: driverRegistry.getDriversByManufacturer(),
        totalDrivers: Object.keys(driverRegistry.DRIVERS).length
    });
});

// =============================================
// AUTO-DISCOVERY
// =============================================

// POST scan network for instruments on common LIS ports
router.post('/discover', protect, authorize('admin', 'super_admin'), async (req, res) => {
    const { subnet = '192.168.1', startIp = 1, endIp = 254 } = req.body;
    const commonPorts = [5000, 5100, 5200, 4000, 4001, 8000];
    const timeout = 500; // 500ms per scan
    
    const discovered = [];
    const scanPromises = [];
    
    // Scan a range of IPs (limit to 20 for performance)
    const maxScan = Math.min(endIp - startIp, 20);
    
    for (let i = startIp; i <= startIp + maxScan; i++) {
        const host = `${subnet}.${i}`;
        
        for (const port of commonPorts) {
            scanPromises.push(
                new Promise((resolve) => {
                    const socket = new net.Socket();
                    socket.setTimeout(timeout);
                    
                    socket.connect(port, host, () => {
                        discovered.push({ host, port, status: 'open' });
                        socket.destroy();
                        resolve();
                    });
                    
                    socket.on('error', () => resolve());
                    socket.on('timeout', () => { socket.destroy(); resolve(); });
                })
            );
        }
    }
    
    await Promise.all(scanPromises);
    
    res.json({
        success: true,
        data: discovered,
        scannedRange: `${subnet}.${startIp} - ${subnet}.${startIp + maxScan}`,
        scannedPorts: commonPorts
    });
});

// =============================================
// INSTRUMENT MANAGEMENT
// =============================================

// GET all instruments for this hospital
router.get('/', protect, instrumentController.getInstruments);

// GET available drivers (manufacturer/model presets)
router.get('/drivers', protect, instrumentController.getInstrumentDrivers);

// GET serial ports available on server
router.get('/serial-ports', protect, instrumentController.listSerialPorts);

// GET live results stream (from LIS service)
router.get('/live-results', protect, (req, res) => {
    const results = lisService.getLatestResults();
    res.json({
        success: true,
        data: results
    });
});

// GET connection status of all active instruments
router.get('/status', protect, instrumentController.getConnectionStatus);

// GET message statistics
router.get('/stats', protect, instrumentController.getMessageStats);

// =============================================
// SINGLE INSTRUMENT OPERATIONS
// =============================================

// GET logs for specific instrument
router.get('/:id/logs', protect, instrumentController.getInstrumentLogs);

// POST add new instrument
router.post('/', protect, authorize('admin', 'super_admin', 'lab_manager'), instrumentController.addInstrument);

// PUT update instrument
router.put('/:id', protect, authorize('admin', 'super_admin', 'lab_manager'), instrumentController.updateInstrument);

// DELETE instrument
router.delete('/:id', protect, authorize('admin', 'super_admin'), instrumentController.deleteInstrument);

// POST test connection to instrument
router.post('/:id/test', protect, instrumentController.testInstrumentConnection);

// POST start listening for results
router.post('/:id/start', protect, authorize('admin', 'super_admin', 'lab_manager'), instrumentController.startInstrumentListener);

// POST stop listening
router.post('/:id/stop', protect, authorize('admin', 'super_admin', 'lab_manager'), instrumentController.stopInstrumentListener);

// =============================================
// EXTERNAL BRIDGE ENDPOINT
// =============================================

// POST receive results from external lab bridge/middleware
router.post('/bridge/results', protect, instrumentController.receiveResultsFromBridge);

// =============================================
// LIS SERVICE CONTROL
// =============================================

// POST start LIS TCP server (for ASTM connections)
router.post('/lis/start', protect, authorize('admin', 'super_admin'), (req, res) => {
    try {
        const { port = 5100 } = req.body;
        if (lisService.server) {
            return res.json({ success: true, message: 'LIS Server already running' });
        }
        lisService.start(port);
        res.json({ success: true, message: `LIS Server started on port ${port}` });
    } catch (error) {
        console.error('LIS start error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET LIS server status
router.get('/lis/status', protect, (req, res) => {
    res.json({
        success: true,
        data: {
            isRunning: !!lisService.server,
            clientCount: lisService.clients?.size || 0,
            bufferedResults: lisService.resultsBuffer?.length || 0
        }
    });
});

module.exports = router;
