/**
 * Cloud Run Entry Point
 * Simplified startup for Google Cloud Run deployment
 * Starts HTTP server first, then loads services
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const RedisStore = require('rate-limit-redis').default || require('rate-limit-redis');
const Redis = require('ioredis');

dotenv.config();

console.log('🚀 Starting Wolf HMS Server (Cloud Mode)...');
console.log('📍 PORT:', process.env.PORT || 8080);
console.log('📍 DB_HOST:', process.env.DB_HOST);

const app = express();

// Trust proxy for Cloud Run (required for rate limiting)
app.set('trust proxy', 1);

const { isOriginAllowed } = require('./config/secrets');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        console.warn(`[Socket.IO CORS] Blocked unauthorized origin: ${origin}`);
        callback(new Error('CORS Not Allowed'));
      }
    },
    methods: ["GET", "POST"]
  }
});

// [Phase 4 Hardening] Realtime Horizontal Clustering via Redis Adapter
const { attachAdapter } = require('./services/socketCluster');
attachAdapter(io, process.env.REDIS_URL);

// Basic middleware
app.use(helmet({ 
    contentSecurityPolicy: false, 
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false 
}));

// [Phase 2 Hardening] Strict CORS Allowlist Enforcement
app.use((req, res, next) => {
    const origin = req.get('origin');

    if (origin) {
        if (isOriginAllowed(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Vary', 'Origin');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, X-Hospital-ID, X-Client-Type, X-Setup-Key');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        } else {
            console.warn(`[CORS] ⛔ Rejected request from disallowed origin: ${origin}`);
            if (req.method === 'OPTIONS') {
                return res.status(403).json({ error: 'CORS Origin Not Allowed' });
            }
        }
    } else {
        // Direct / same-origin / server-to-server requests without Origin header
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, X-Hospital-ID, X-Client-Type, X-Setup-Key');
    }

    // Handle Preflight
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

// Phase 6 Observability: Request Metrics Middleware (prom-client)
const { metricsMiddleware } = require('./middleware/metricsMiddleware');
app.use(metricsMiddleware);

// REMOVED: app.use(cors(corsOptions));
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// DEV DASHBOARD: Serve static files for Developer Platform Dashboard
const devDashboardPath = path.join(__dirname, '../client/public/dev-dashboard');
app.use('/dev-dashboard', express.static(devDashboardPath));
// Handle SPA routing for dev-dashboard sub-routes
app.get('/dev-dashboard/*', (req, res) => {
  const filePath = req.path.replace('/dev-dashboard', '');
  const htmlPath = path.join(devDashboardPath, filePath + '.html');
  const indexPath = path.join(devDashboardPath, filePath, 'index.html');
  const fs = require('fs');
  
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.sendFile(path.join(devDashboardPath, 'index.html'));
  }
});

// React SPA Handling - Serve index.html for all non-API routes
// This allows React Router to handle client-side routing (e.g., /login, /dashboard)
// SPA Fallback moved to end of file

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Rate limiting
let limiterConfig = {
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests' }
};

if (process.env.REDIS_HOST) {
    console.log('⚡ Enabling Distributed Rate Limiting (Redis)...');
    const client = new Redis({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT || 6379,
        connectTimeout: 10000
    });
    
    client.on('error', (err) => console.error('Redis Client Error:', err));
    
    limiterConfig.store = new RedisStore({
        sendCommand: (...args) => client.call(...args),
    });
}

const generalLimiter = rateLimit(limiterConfig);
app.use('/api/', generalLimiter);

// CRITICAL: Tenant Resolution BEFORE all routes (fixes login 500 error)
const { resolveHospital } = require('./middleware/tenantResolver');
app.use('/api/', resolveHospital);

// Attach io to request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Modular System, Setup & Security Compatibility Routes (Phase 3 Modularization)
const systemRoutes = require('./routes/systemRoutes');
const { router: setupRoutes } = require('./routes/setupRoutes');
const securityCompatRoutes = require('./routes/securityCompatRoutes');

app.use('/api', systemRoutes);
app.use('/api', setupRoutes);
app.use('/api', securityCompatRoutes);

// ==========================================
// CRITICAL: Load routes SYNCHRONOUSLY before server starts
// This ensures routes are available immediately for Cloud Run
// ==========================================
console.log('📦 Loading routes synchronously...');

// Load all routes upfront
const authRoutes = require('./routes/authRoutes');
const ssoRoutes = require('./routes/ssoRoutes'); // Phase 5: Enterprise OIDC/SSO
const auditExportRoutes = require('./routes/auditExportRoutes'); // Phase 5: Super-Admin HIPAA Audit Export
const userRoutes = require('./routes/userRoutes');
const opdRoutes = require('./routes/opdRoutes');
const admissionRoutes = require('./routes/admissionRoutes');
const patientRoutes = require('./routes/patientRoutes');
const labRoutes = require('./routes/labRoutes');
const pharmacyRoutes = require('./routes/pharmacyRoutes');
const aiRoutes = require('./routes/aiRoutes');
const wardRoutes = require('./routes/wardRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const financeRoutes = require('./routes/financeRoutes');
const clinicalRoutes = require('./routes/clinicalRoutes');
const adminRoutes = require('./routes/adminRoutes');
const consentRoutes = require('./routes/consentRoutes');
const nurseRoutes = require('./routes/nurseRoutes');
const receptionRoutes = require('./routes/receptionRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const doctorAnalyticsRoutes = require('./routes/doctorAnalyticsRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const bloodBankRoutes = require('./routes/bloodBankRoutes');
const automationRoutes = require('./routes/automationRoutes');
const tpaRoutes = require('./routes/tpaRoutes');
const carePlanRoutes = require('./routes/carePlanRoutes');
const insuranceRoutes = require('./routes/insuranceRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const instrumentRoutes = require('./routes/instrumentRoutes');
const labTestParamsRoutes = require('./routes/labTestParamsRoutes');
const cssdRoutes = require('./routes/cssdRoutes');
const radiologyRoutes = require('./routes/radiologyRoutes');
const smsRoutes = require('./routes/smsRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const overwatchRoutes = require('./routes/overwatchRoutes');
const cloudBackupRoutes = require('./routes/cloudBackupRoutes');
const securityRoutes = require('./routes/securityRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const rosterRoutes = require('./routes/rosterRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const auditRoutes = require('./routes/auditRoutes');
const wardPassRoutes = require('./routes/wardPassRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const syncRoutes = require('./routes/syncRoutes');
const parkingRoutes = require('./routes/parkingRoutes');
const dietaryRoutes = require('./routes/dietaryRoutes');
const housekeepingRoutes = require('./routes/housekeepingRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const bedRoutes = require('./routes/bedRoutes');
const billingRoutes = require('./routes/billingRoutes');
const otRoutes = require('./routes/otRoutes');
const treatmentPackageRoutes = require('./routes/treatmentPackageRoutes');
const adminDataStewardRoutes = require('./routes/adminDataStewardRoutes');
const adminRecoveryRoutes = require('./routes/adminRecoveryRoutes'); // Admin Recovery Console (DPDP Act)

// Wolf Care 2.0 - Self-Hosted Patient App Routes
const patientAuthRoutes = require('./routes/patientAuthRoutes'); // OTP Auth
const telehealthRoutes = require('./routes/telehealthRoutes'); // Video Calls
const homeCollectionRoutes = require('./routes/homeCollectionRoutes'); // Wolf Path
const ipdPatientRoutes = require('./routes/ipdPatientRoutes'); // My Stay Dashboard

// Wolf Care Phase 1-5 Routes with debug logging
let reviewRoutes, familyRoutes, articlesRoutes, homeLabRoutes;
try {
    console.log('[WOLF-CARE] Loading Phase 1-5 routes...');
    reviewRoutes = require('./routes/reviewRoutes');
    console.log('[WOLF-CARE] ✅ reviewRoutes loaded');
    familyRoutes = require('./routes/familyRoutes');
    console.log('[WOLF-CARE] ✅ familyRoutes loaded');
    articlesRoutes = require('./routes/articlesRoutes');
    console.log('[WOLF-CARE] ✅ articlesRoutes loaded');
    homeLabRoutes = require('./routes/homeLabRoutes');
    console.log('[WOLF-CARE] ✅ homeLabRoutes loaded');
    console.log('[WOLF-CARE] All Phase 1-5 routes loaded successfully');
} catch (err) {
    console.error('[WOLF-CARE] ❌ ROUTE LOAD ERROR:', err.message);
    console.error(err.stack);
}

// Phase 1 & 5 Security Hardening: Audit Middleware across all 12 PHI resource routes
const { auditMiddleware } = require('./middleware/auditMiddleware');

// Mount PHI audit middleware BEFORE route handlers so requests are captured
app.use('/api/patients', auditMiddleware);
app.use('/api/admissions', auditMiddleware);
app.use('/api/prescriptions', auditMiddleware);
app.use('/api/lab', auditMiddleware);
app.use('/api/pharmacy', auditMiddleware);
app.use('/api/radiology', auditMiddleware);
app.use('/api/clinical', auditMiddleware);
app.use('/api/appointments', auditMiddleware);
app.use('/api/opd', auditMiddleware);
app.use('/api/billing', auditMiddleware);
app.use('/api/finance', auditMiddleware);
app.use('/api/insurance', auditMiddleware);
app.use('/api/pmjay/claims', auditMiddleware);

// Mount routes SYNCHRONOUSLY
// [DEBUG] Prove Deployment
// /api/debug/ping now served via systemRoutes.js
app.use('/api/migrations', require('./routes/migrationRoutes')); // Mount High Priority

app.use('/api/sync', syncRoutes); // High Priority
app.use('/api/auth/sso', ssoRoutes); // Phase 5 Enterprise SSO (Must precede /api/auth)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients/app', patientRoutes);
app.use('/api/opd', opdRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ward', wardRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/clinical', clinicalRoutes);
app.use('/api/admin/data-steward', adminDataStewardRoutes);
app.use('/api/admin/recovery', adminRecoveryRoutes); // Admin Recovery Console
app.use('/api/admin/audit', auditExportRoutes); // Phase 5 Super-Admin HIPAA Audit Export
app.use('/api/admin', adminRoutes);
app.use('/api/migrations', require('./routes/migrationRoutes'));
app.use('/api/nurse', nurseRoutes);
app.use('/api/reception', receptionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/doctor', doctorAnalyticsRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/blood-bank', bloodBankRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/tpa', tpaRoutes);
app.use('/api/care-plans', carePlanRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/instruments', instrumentRoutes);
app.use('/api/lab-params', labTestParamsRoutes);
app.use('/api/cssd', cssdRoutes);
app.use('/api/radiology', radiologyRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/overwatch', overwatchRoutes);
app.use('/api/backup', cloudBackupRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/locations', require('./routes/locationRoutes'));
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/roster', rosterRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/ward-access', wardPassRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/dietary', dietaryRoutes);
app.use('/api/housekeeping', housekeepingRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/beds', bedRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/ot', otRoutes);
app.use('/api/packages', treatmentPackageRoutes);

// Wolf Care 2.0 - Patient App Routes (Self-Hosted, No Firebase)
console.log('Mounting /api/patient-auth inside server-cloud.js');
app.use('/api/patient-auth', patientAuthRoutes); // OTP Auth for Wolf Care app
app.use('/api/telehealth', telehealthRoutes); // Video consultations
app.use('/api/home-collection', homeCollectionRoutes); // Wolf Path logistics
app.use('/api/ipd', ipdPatientRoutes); // My Stay patient dashboard

// Mount Wolf Care Phase 1-5 routes with logging
if (reviewRoutes) {
    app.use('/api/reviews', reviewRoutes);
    console.log('[WOLF-CARE] 🔗 Mounted /api/reviews');
}
if (familyRoutes) {
    app.use('/api/family', familyRoutes);
    console.log('[WOLF-CARE] 🔗 Mounted /api/family');
}
if (articlesRoutes) {
    app.use('/api/articles', articlesRoutes);
    console.log('[WOLF-CARE] 🔗 Mounted /api/articles');
}
if (homeLabRoutes) {
    app.use('/api/home-lab', homeLabRoutes);
    console.log('[WOLF-CARE] 🔗 Mounted /api/home-lab');
}

// [NEW] Medicine Orders (Wolf Care App)
try {
    const medicineOrderRoutes = require('./routes/medicineOrderRoutes');
    app.use('/api/medicine-orders', medicineOrderRoutes);
    console.log('[WOLF-CARE] 🔗 Mounted /api/medicine-orders');
} catch (err) {
    console.error('[WOLF-CARE] ❌ Failed to load medicineOrderRoutes:', err.message);
}

// [PMJAY] HBP 2.0 Rate Lookup and Claims Management Routes
try {
    const pmjayRateRoutes = require('./routes/pmjayRateRoutes');
    const pmjayClaimRoutes = require('./routes/pmjayClaimRoutes');
    app.use('/api/pmjay/hbp', pmjayRateRoutes);
    app.use('/api/pmjay/claims', pmjayClaimRoutes);
    console.log('[PMJAY] 📦 HBP 2.0 Routes mounted at /api/pmjay/hbp');
    console.log('[PMJAY] 📋 Claims Routes mounted at /api/pmjay/claims');
} catch (pmjayErr) {
    console.error('[PMJAY] ❌ Route load error:', pmjayErr.message);
}

// Phase 2: Webhook routes
const webhookRoutes = require('./routes/webhookRoutes');
app.use('/api/webhooks', webhookRoutes);

// Phase 2: Apply gateway middleware for API analytics
const { gatewayMiddleware } = require('./middleware/gatewayMiddleware');
app.use('/api/', gatewayMiddleware);

// Phase 3: FHIR R4 routes
const fhirRoutes = require('./routes/fhirRoutes');
app.use('/fhir', fhirRoutes);

// Apply consent routes (moved here to keep order clean)
app.use('/api/consent', consentRoutes);

const platformRoutes = require('./routes/platformRoutes');
app.use('/api/platform', platformRoutes);

console.log('✅ All routes loaded synchronously');

// Serve static files from public directory (React app)
// path already required at top

const jwt = require('jsonwebtoken'); // Added for Socket.IO Auth
app.use(express.static(path.join(__dirname, 'public')));


// Error handler (Production-safe)
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Invalid or expired token', code: 'AUTH_ERROR' });
  }
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server listening on port ${PORT}`);
  
  // Run async initialization (migrations, etc.) in background
  initializeServices();
});

// Async initialization for services (not routes)
async function initializeServices() {
  try {
    console.log('📦 Initializing services...');
    const { pool } = require('./db');
    
    // Test database connection
    try {
      await pool.query('SELECT NOW()');
      console.log('✅ Database connected successfully');
      
      // Run migrations
      try {
        console.log('🔄 Checking for database migrations...');
        const MigrationService = require('./services/MigrationService');
        await MigrationService.run();
        console.log('✅ Migrations checked/applied.');
      } catch (migrationErr) {
        console.error('⚠️ Migration error (continuing):', migrationErr.message);
      }
    } catch (dbErr) {
      console.error('⚠️ Database connection failed:', dbErr.message);
    }

    // Initialize Overwatch
    try {
      const Overwatch = require('./services/OverwatchService');
      Overwatch.initSentry(app);
      Overwatch.initTelegramBot();
      console.log('🔍 AI Overwatch monitoring initialized');
    } catch (owErr) {
      console.error('⚠️ Overwatch init error:', owErr.message);
    }

    console.log('✅ All services initialized');
  } catch (err) {
    console.error('❌ Service initialization error:', err.message);
  }
}

// ========== VIDEO CALL SIGNALING ==========
// Initialize video socket handler for teleconsultation
try {
  const videoSocketHandler = require('./services/videoSocketHandler');
  videoSocketHandler(io);
  console.log('📹 Video call signaling initialized');
} catch (videoErr) {
  console.error('⚠️ Video socket handler error:', videoErr.message);
}

// Initialize Crons
const { initCron } = require('./services/cron/dailyBedCharge');
const { initRetentionCron } = require('./services/cron/dataRetention');

try {
    initCron();
    initRetentionCron();
    console.log('⏰ Daily Bed Charge & DPDP Retention Crons Initialized');
} catch (err) {
    console.error('Failed to init Crons:', err);
}

// Socket.IO Logic
// Middleware: Authenticate Socket & Tenant
io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
        // Allow unauthenticated connections for now (dev) or handle strictly?
        // For Wolf HMS, strict auth is preferred.
        return next(new Error('Authentication error: No token provided'));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return next(new Error('Authentication error: Invalid token'));
        }
        socket.user = decoded; // Attach user to socket
        next();
    });
});

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} | User: ${socket.user.username} | Hospital: ${socket.user.hospital_id}`);
    
    // Join Hospital-Specific Room
    const hospitalId = socket.user.hospital_id;
    if (hospitalId) {
        socket.join(`hospital_${hospitalId}`);
        console.log(`Socket ${socket.id} joined room: hospital_${hospitalId}`);
    }

    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
    });
});


// React SPA Handling - Serve index.html for all non-API routes
// This allows React Router to handle client-side routing (e.g., /login, /dashboard)
// PLACED AT THE END to ensure it doesn't intercept API routes

app.get('*', (req, res) => {
  // Don't intercept API routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
     return res.status(404).json({ error: 'Endpoint not found', path: req.path });
  }
  
  // Serve the React app - MUST exist in public/index.html
  // Force absolute path resolution
  const indexPath = path.resolve(__dirname, 'public', 'index.html');
  res.sendFile(indexPath);
});

module.exports = { app, server, io };
