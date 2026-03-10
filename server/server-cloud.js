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

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Basic middleware
app.use(helmet({ 
    contentSecurityPolicy: false, 
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false 
}));

// MANUAL CORS & LOGGING (DEBUGGING)
app.use((req, res, next) => {
    // Log Headers
    console.log(`[Request] ${req.method} ${req.url}`);
    console.log(`[Headers] Origin: ${req.get('origin')} | Host: ${req.get('host')} | Referer: ${req.get('referer')}`);

    // Set CORS Headers Manually
    const origin = req.get('origin');
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*'); 
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle Preflight
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

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

// Hospital Branding (public endpoint for Wolf Care app - inline to avoid dependency chain)
app.get('/api/hospitals/branding/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const pool = require('./config/db');
    
    const result = await pool.query(`
      SELECT 
        id, code, name, subdomain, logo_url, 
        primary_color, secondary_color, settings
      FROM hospitals 
      WHERE (subdomain = $1 OR custom_domain = $1 OR code = $1) AND is_active = true
    `, [code]);
    
    if (result.rows.length === 0) {
      // Return default branding if no hospital found
      return res.json({
        success: true,
        data: {
          id: 1,
          name: 'Wolf HMS',
          subdomain: 'app',
          logo_url: null,
          primary_color: '#0d6efd',
          secondary_color: '#6c757d',
          settings: { in_person_fee: 200, video_call_fee: 300 }
        }
      });
    }
    
    const hospital = result.rows[0];
    res.json({ success: true, data: hospital });
  } catch (error) {
    console.error('[Hospital Branding] Error:', error.message);
    // Even on error, return default branding so app doesn't crash
    res.json({
      success: true,
      data: {
        id: 1,
        name: 'Wolf HMS',
        subdomain: 'app',
        logo_url: null,
        primary_color: '#0d6efd',
        secondary_color: '#6c757d',
        settings: { in_person_fee: 200, video_call_fee: 300 }
      }
    });
  }
});

// MANUALLY TRIGGER TENANT BACKFILL (MIGRATION 080)
// MANUALLY TRIGGER TENANT BACKFILL (MIGRATION 080)
app.post('/api/health/run-migration', async (req, res) => {
  return res.status(410).json({ 
      error: 'Legacy Migration Endpoint Disabled', 
      message: 'Schema management is now handled by standard migrations and ensureAdmins.js. Please do not these manual backfill scripts as they are destructive.' 
  });
});

// DEBUG: Execute arbitrary SQL (for schema fixes)
app.post('/api/health/exec-sql', async (req, res) => {
  const { setupKey, sql } = req.body;
  if (setupKey !== 'WolfSetup2024!') return res.status(403).json({ error: 'Invalid setup key' });
  if (!sql) return res.status(400).json({ error: 'SQL query required' });
  
  try {
    const { pool } = require('./db');
    console.log('Executing SQL:', sql.substring(0, 100) + '...');
    const result = await pool.query(sql);
    res.json({ success: true, rowCount: result.rowCount, rows: result.rows });
  } catch (error) {
    console.error('SQL Execution Error:', error);
    res.status(500).json({ success: false, error: error.message, code: error.code });
  }
});

// SETUP: Full Database Reset and Seed (for testing/staging only)
const { resetAndSeedCloud } = require('./controllers/setupController');
app.post('/api/setup/reset-and-seed', resetAndSeedCloud);

// SETUP: Full Schema Sync (creates all missing tables)
const { fullSchemaSync } = require('./controllers/schemaSyncController');
app.post('/api/setup/schema-sync', fullSchemaSync);

// DEBUG: List /cloudsql directory
  app.get('/api/debug/env', (req, res) => {
    res.json({
      DB_HOST: process.env.DB_HOST,
      DB_USER: process.env.DB_USER,
      DB_NAME: process.env.DB_NAME,
      DB_PORT: process.env.DB_PORT,
      NODE_ENV: process.env.NODE_ENV
    });
  });

// DEBUG: List /cloudsql directory
app.get('/api/debug/fs', (req, res) => {
    try {
        const fs = require('fs');
        const root = fs.existsSync('/cloudsql') ? fs.readdirSync('/cloudsql') : ['/cloudsql not found'];
        let instance = [];
        try {
             if (fs.existsSync('/cloudsql/wolf-tech-hms:asia-south1:wolf-hms-db')) {
                 instance = fs.readdirSync('/cloudsql/wolf-tech-hms:asia-south1:wolf-hms-db');
             } else {
                 instance = ['Instance dir not found'];
             }
        } catch (e) { instance = [e.message]; }
        
        res.json({ root, instance });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Attach io to request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ========== JITSI VIDEO CALL NOTIFICATION ==========
// Send Jitsi room URL to patient via Socket.IO
app.post('/api/notifications/video-call', (req, res) => {
  try {
    const { patientId, patientPhone, appointmentId, jitsiRoom, jitsiUrl, doctorName } = req.body;

    console.log('[Jitsi Notify] Sending call notification:', {
      patientId,
      patientPhone,
      jitsiRoom,
      doctorName
    });

    if (!jitsiRoom || !jitsiUrl) {
      return res.status(400).json({ success: false, error: 'Missing Jitsi room information' });
    }

    // Emit to video namespace - patient app will listen for 'jitsi-call' event
    const videoNamespace = io.of('/video');
    const patientIdentifier = patientPhone || patientId;

    // Log connected clients count for debugging
    const connectedClients = videoNamespace.sockets ? videoNamespace.sockets.size : 0;
    console.log(`[Jitsi Notify] Video namespace has ${connectedClients} connected clients`);

    // Broadcast to all connected patients (patient will filter by their own ID)
    videoNamespace.emit('jitsi-call', {
      patientPhone: patientPhone,
      patientId: patientId,
      jitsiRoom,
      jitsiUrl,
      doctorName,
      appointmentId,
      timestamp: new Date().toISOString(),
    });

    console.log(`[Jitsi Notify] Broadcasted Jitsi call to video namespace for patient ${patientIdentifier}`);
    
    res.json({ 
      success: true, 
      message: 'Notification sent',
      jitsiUrl
    });

  } catch (error) {
    console.error('[Jitsi Notify] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to send notification' });
  }
});

// Health check (critical for Cloud Run)
// app.get('/', (req, res) => {
//   res.json({ status: 'OK', message: 'Wolf HMS API (MIGRATION ENABLED v1.4)', mode: 'cloud' });
// });

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database diagnostic endpoint (for debugging Cloud SQL connection)
app.get('/api/db-check', async (req, res) => {
  try {
    const pool = require('./config/db');
    
    // Test basic query
    const timeResult = await pool.query('SELECT NOW() as time');
    
    // Count users
    const userCountResult = await pool.query('SELECT COUNT(*) as count FROM users');
    
    // Get first 3 usernames (for debugging)
    const usersResult = await pool.query('SELECT username, role, is_active FROM users LIMIT 3');
    
    res.json({
      status: 'OK',
      database: 'Connected',
      dbTime: timeResult.rows[0].time,
      userCount: userCountResult.rows[0].count,
      sampleUsers: usersResult.rows,
      envCheck: {
        DB_HOST: process.env.DB_HOST ? 'SET' : 'NOT SET',
        DB_USER: process.env.DB_USER ? 'SET' : 'NOT SET',
        DB_NAME: process.env.DB_NAME ? 'SET' : 'NOT SET',
        DB_PASSWORD: process.env.DB_PASSWORD ? 'SET' : 'NOT SET',
        JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'Failed',
      error: error.message
    });
  }
});

// DEBUG: List ALL users
app.get('/api/debug/users', async (req, res) => {
  try {
    const pool = require('./config/db');
    const usersResult = await pool.query('SELECT id, username, email, role, is_active FROM users ORDER BY id');
    res.json({ users: usersResult.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Seed/Reset admin_user with password123
app.post('/api/debug/seed-admin', async (req, res) => {
  try {
    const pool = require('./config/db');
    const bcrypt = require('bcryptjs');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Check if admin_user exists
    const existing = await pool.query("SELECT id FROM users WHERE username = 'admin_user'");
    
    if (existing.rows.length === 0) {
      // Create new admin user
      await pool.query(`
        INSERT INTO users (username, email, password, role, is_active, approval_status)
        VALUES ('admin_user', 'admin@wolf-hms.com', $1, 'admin', true, 'APPROVED')
      `, [hashedPassword]);
      res.json({ success: true, message: 'admin_user created with password: password123' });
    } else {
      // Update existing password
      await pool.query("UPDATE users SET password = $1, is_active = true WHERE username = 'admin_user'", [hashedPassword]);
      res.json({ success: true, message: 'admin_user password reset to: password123' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Seed/Reset developer user with WolfDev2024!
app.post('/api/debug/seed-developer', async (req, res) => {
  try {
    const pool = require('./config/db');
    const bcrypt = require('bcryptjs');
    
    const hashedPassword = await bcrypt.hash('WolfDev2024!', 10);
    
    // Check if developer exists
    const existing = await pool.query("SELECT id FROM users WHERE username = 'developer'");
    
    if (existing.rows.length === 0) {
      // Create developer user
      await pool.query(`
        INSERT INTO users (username, email, password, role, is_active, approval_status, full_name)
        VALUES ('developer', 'developer@wolfhms.com', $1, 'admin', true, 'APPROVED', 'Wolf Developer')
      `, [hashedPassword]);
      res.json({ success: true, message: 'developer created with password: WolfDev2024!' });
    } else {
      // Update existing password
      await pool.query("UPDATE users SET password = $1, is_active = true, role = 'admin' WHERE username = 'developer'", [hashedPassword]);
      res.json({ success: true, message: 'developer password reset to: WolfDev2024!' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// [SECURITY] Dangerous endpoints removed. Use migration scripts instead.

// DEBUG: Create Demo Hospital for Multi-Tenancy Testing
app.get('/api/debug/create-demo-hospital', async (req, res) => {
  try {
    const pool = require('./config/db');
    const bcrypt = require('bcryptjs');
    
    // Create Demo Hospital
    const demoHospitalId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    await pool.query(`
      INSERT INTO hospitals (id, hospital_name, hospital_domain)
      VALUES ($1, 'Demo Hospital', 'demo.wolf-hms.com')
      ON CONFLICT (hospital_domain) DO NOTHING
    `, [demoHospitalId]);
    
    // Create Demo Admin User
    const hashedPassword = await bcrypt.hash('demo123', 10);
    await pool.query(`
      INSERT INTO users (username, email, password, role, is_active, approval_status, hospital_id)
      VALUES ('demo_admin', 'admin@demo.wolf-hms.com', $1, 'admin', true, 'APPROVED', $2)
      ON CONFLICT (username) DO UPDATE SET hospital_id = $2
    `, [hashedPassword, demoHospitalId]);
    
    res.json({
      success: true,
      message: 'Demo Hospital created with admin user',
      hospital_id: demoHospitalId,
      login: { username: 'demo_admin', password: 'demo123' },
      domain: 'demo.wolf-hms.com'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SEED: Lab Tests and Medicines (for Doctor Dashboard)
app.post('/api/debug/seed-lab-pharmacy', async (req, res) => {
  try {
    const pool = require('./config/db');
    console.log('🌱 Seeding Lab Tests and Medicines...');
    
    // 1. Seed lab categories
    const categories = ['Haematology', 'Biochemistry', 'Microbiology', 'Serology', 'Endocrinology', 'Radiology', 'Cardiology', 'Parasitology', 'Histopathology'];
    for (const cat of categories) {
      await pool.query('INSERT INTO lab_test_categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [cat]);
    }
    
    // 2. Seed lab test types
    const labTests = [
      { name: 'Complete Blood Count (CBC)', category: 'Haematology', price: 350 },
      { name: 'Liver Function Test (LFT)', category: 'Biochemistry', price: 850 },
      { name: 'Kidney Function Test (RFT)', category: 'Biochemistry', price: 600 },
      { name: 'Lipid Profile', category: 'Biochemistry', price: 800 },
      { name: 'Thyroid Profile (T3, T4, TSH)', category: 'Endocrinology', price: 700 },
      { name: 'HbA1c', category: 'Biochemistry', price: 550 },
      { name: 'Blood Sugar Fasting', category: 'Biochemistry', price: 80 },
      { name: 'Blood Sugar PP', category: 'Biochemistry', price: 80 },
      { name: 'Urine Routine', category: 'Microbiology', price: 150 },
      { name: 'Stool Routine', category: 'Microbiology', price: 150 },
      { name: 'Chest X-Ray', category: 'Radiology', price: 400 },
      { name: 'ECG', category: 'Cardiology', price: 300 },
      { name: 'Uric Acid', category: 'Biochemistry', price: 250 },
      { name: 'Serum Creatinine', category: 'Biochemistry', price: 200 },
      { name: 'ESR', category: 'Haematology', price: 100 },
      { name: 'PT INR', category: 'Haematology', price: 450 },
      { name: 'Vitamin D', category: 'Biochemistry', price: 1200 },
      { name: 'Vitamin B12', category: 'Biochemistry', price: 900 },
      { name: 'Dengue NS1', category: 'Serology', price: 800 },
      { name: 'Malaria Antigen', category: 'Parasitology', price: 400 },
      { name: 'Troponin I', category: 'Cardiology', price: 1500 },
      { name: 'HIV 1&2 Antibody', category: 'Serology', price: 350 },
      { name: 'HBsAg (Hepatitis B)', category: 'Serology', price: 400 },
      { name: 'Anti-HCV (Hepatitis C)', category: 'Serology', price: 600 },
      { name: 'CRP (C-Reactive Protein)', category: 'Biochemistry', price: 500 },
      { name: 'Procalcitonin', category: 'Biochemistry', price: 1800 },
      { name: 'D-Dimer', category: 'Haematology', price: 1200 },
      { name: 'Blood Group & Rh', category: 'Haematology', price: 200 },
      { name: 'Platelet Count', category: 'Haematology', price: 100 },
      { name: 'Hemoglobin', category: 'Haematology', price: 80 }
    ];
    
    for (const test of labTests) {
      const catRes = await pool.query('SELECT id FROM lab_test_categories WHERE name = $1', [test.category]);
      const categoryId = catRes.rows[0]?.id || null;
      await pool.query(
        `INSERT INTO lab_test_types (name, category_id, price, hospital_id) VALUES ($1, $2, $3, 2) ON CONFLICT DO NOTHING`,
        [test.name, categoryId, test.price]
      );
    }
    
    // 3. Seed medicines
    const medicines = [
      { name: 'Paracetamol 500mg', generic: 'Acetaminophen', category: 'Analgesic', price: 2, stock: 1000 },
      { name: 'Paracetamol 650mg', generic: 'Acetaminophen', category: 'Analgesic', price: 3, stock: 800 },
      { name: 'Dolo 650', generic: 'Paracetamol', category: 'Analgesic', price: 3.5, stock: 500 },
      { name: 'Crocin 500mg', generic: 'Paracetamol', category: 'Analgesic', price: 2.5, stock: 600 },
      { name: 'Ibuprofen 400mg', generic: 'Ibuprofen', category: 'NSAID', price: 4, stock: 500 },
      { name: 'Brufen 400', generic: 'Ibuprofen', category: 'NSAID', price: 5, stock: 400 },
      { name: 'Amoxicillin 500mg', generic: 'Amoxicillin', category: 'Antibiotic', price: 8, stock: 300 },
      { name: 'Augmentin 625mg', generic: 'Amoxicillin+Clavulanate', category: 'Antibiotic', price: 25, stock: 200 },
      { name: 'Azithromycin 500mg', generic: 'Azithromycin', category: 'Antibiotic', price: 45, stock: 200 },
      { name: 'Zithromax 250mg', generic: 'Azithromycin', category: 'Antibiotic', price: 40, stock: 150 },
      { name: 'Ciprofloxacin 500mg', generic: 'Ciprofloxacin', category: 'Antibiotic', price: 12, stock: 300 },
      { name: 'Metformin 500mg', generic: 'Metformin', category: 'Antidiabetic', price: 3, stock: 800 },
      { name: 'Glimepiride 2mg', generic: 'Glimepiride', category: 'Antidiabetic', price: 4, stock: 500 },
      { name: 'Amlodipine 5mg', generic: 'Amlodipine', category: 'Antihypertensive', price: 5, stock: 600 },
      { name: 'Losartan 50mg', generic: 'Losartan', category: 'Antihypertensive', price: 8, stock: 400 },
      { name: 'Telmisartan 40mg', generic: 'Telmisartan', category: 'Antihypertensive', price: 10, stock: 350 },
      { name: 'Atorvastatin 10mg', generic: 'Atorvastatin', category: 'Statin', price: 6, stock: 500 },
      { name: 'Rosuvastatin 10mg', generic: 'Rosuvastatin', category: 'Statin', price: 12, stock: 300 },
      { name: 'Omeprazole 20mg', generic: 'Omeprazole', category: 'PPI', price: 4, stock: 700 },
      { name: 'Pantoprazole 40mg', generic: 'Pantoprazole', category: 'PPI', price: 5, stock: 600 },
      { name: 'Ranitidine 150mg', generic: 'Ranitidine', category: 'H2 Blocker', price: 3, stock: 400 },
      { name: 'Cetirizine 10mg', generic: 'Cetirizine', category: 'Antihistamine', price: 2, stock: 800 },
      { name: 'Montelukast 10mg', generic: 'Montelukast', category: 'Anti-asthmatic', price: 8, stock: 300 },
      { name: 'Salbutamol Inhaler', generic: 'Salbutamol', category: 'Bronchodilator', price: 120, stock: 100 },
      { name: 'Aspirin 75mg', generic: 'Aspirin', category: 'Antiplatelet', price: 2, stock: 500 },
      { name: 'Clopidogrel 75mg', generic: 'Clopidogrel', category: 'Antiplatelet', price: 12, stock: 300 },
      { name: 'Diclofenac 50mg', generic: 'Diclofenac', category: 'NSAID', price: 3, stock: 600 },
      { name: 'Tramadol 50mg', generic: 'Tramadol', category: 'Opioid', price: 8, stock: 200 },
      { name: 'Alprazolam 0.5mg', generic: 'Alprazolam', category: 'Anxiolytic', price: 5, stock: 200 },
      { name: 'Multivitamin Tablet', generic: 'Multivitamin', category: 'Supplement', price: 5, stock: 1000 }
    ];
    
    for (const med of medicines) {
      await pool.query(
        `INSERT INTO inventory_items (name, generic_name, category, price_per_unit, stock_quantity, hospital_id) VALUES ($1, $2, $3, $4, $5, 2) ON CONFLICT DO NOTHING`,
        [med.name, med.generic, med.category, med.price, med.stock]
      );
    }
    
    // 4. Get counts
    const labCount = await pool.query('SELECT COUNT(*) FROM lab_test_types');
    const invCount = await pool.query('SELECT COUNT(*) FROM inventory_items');
    
    res.json({ 
      success: true, 
      message: 'Lab tests and medicines seeded successfully!',
      counts: { lab_tests: labCount.rows[0].count, medicines: invCount.rows[0].count }
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: error.message });
  }
});

// [BILLING UNIFICATION] Migrate OPD Payments to Invoices (Self-Healing)
app.post('/api/debug/migrate-opd-to-invoices', async (req, res) => {
    try {
        const pool = require('./config/db');
        console.log('🔧 Starting OPD Payments → Invoices Migration...');
        
        // 1. Ensure invoice_id column exists on payments table
        await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_id INTEGER;`);
        
        // 2. Find OPD payments (have visit_id) that don't have an invoice
        const payments = await pool.query(`
            SELECT p.id, p.patient_id, p.visit_id, p.amount, 
                   COALESCE(p.received_at, NOW()) as payment_date, p.hospital_id,
                   ov.doctor_id, u.username as doctor_name, u.department
            FROM payments p
            JOIN opd_visits ov ON p.visit_id = ov.id
            LEFT JOIN users u ON ov.doctor_id = u.id
            WHERE p.visit_id IS NOT NULL
              AND p.invoice_id IS NULL
        `);
        
        console.log(`Found ${payments.rows.length} OPD payments without invoices`);
        
        let created = 0, skipped = 0, errors = [];
        
        for (const pmt of payments.rows) {
            try {
                // Check if invoice already exists for this date/amount (idempotent)
                const existing = await pool.query(
                    `SELECT id FROM invoices WHERE patient_id = $1 
                     AND generated_at::date = $2::date AND total_amount = $3`,
                    [pmt.patient_id, pmt.payment_date, pmt.amount]
                );
                
                let invoiceId;
                
                if (existing.rows.length === 0) {
                    // Create invoice
                    const inv = await pool.query(
                        `INSERT INTO invoices 
                         (patient_id, total_amount, paid_amount, status, generated_at, hospital_id)
                         VALUES ($1, $2, $3, 'Paid', $4, $5)
                         RETURNING id`,
                        [pmt.patient_id, pmt.amount, pmt.amount, pmt.payment_date, pmt.hospital_id || 1]
                    );
                    invoiceId = inv.rows[0].id;
                    
                    // Create invoice item
                    const description = `OPD Consultation${pmt.doctor_name ? ` - Dr. ${pmt.doctor_name}` : ''}${pmt.department ? ` (${pmt.department})` : ''}`;
                    await pool.query(
                        `INSERT INTO invoice_items 
                         (invoice_id, description, quantity, unit_price, total_price)
                         VALUES ($1, $2, 1, $3, $4)`,
                        [invoiceId, description, pmt.amount, pmt.amount]
                    );
                    
                    created++;
                } else {
                    invoiceId = existing.rows[0].id;
                    skipped++;
                }
                
                // Link payment to invoice
                await pool.query(`UPDATE payments SET invoice_id = $1 WHERE id = $2`, [invoiceId, pmt.id]);
                
            } catch (err) {
                errors.push({ payment_id: pmt.id, error: err.message });
            }
        }
        
        console.log(`✅ Migration complete: ${created} invoices created, ${skipped} already existed`);
        
        res.json({ 
            success: true, 
            message: `Migrated ${created} OPD payments to invoices`,
            stats: {
                total_payments_scanned: payments.rows.length,
                invoices_created: created,
                already_existed: skipped,
                errors: errors.length
            },
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (err) {
        console.error('Migration Failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// EMERGENCY CLEAR: Fix Schema and Clear All Active Emergencies
app.get('/api/debug/clear-emergencies', async (req, res) => {
    try {
        const pool = require('./config/db');
        console.log('🚨 Fixing emergency_logs schema and clearing active emergencies...');
        
        // 1. Fix schema - add missing columns
        await pool.query(`ALTER TABLE emergency_logs ADD COLUMN IF NOT EXISTS resolved_by INTEGER`);
        await pool.query(`ALTER TABLE emergency_logs ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP`);
        await pool.query(`ALTER TABLE emergency_logs ADD COLUMN IF NOT EXISTS hospital_id INTEGER`);
        
        // 2. Force resolve all active emergencies
        const result = await pool.query(`
            UPDATE emergency_logs 
            SET status = 'Resolved', resolved_at = NOW()
            WHERE status = 'Active'
            RETURNING id, code, location
        `);
        
        console.log(`✅ Cleared ${result.rowCount} active emergencies`);
        
        res.json({ 
            success: true, 
            message: `Cleared ${result.rowCount} active emergencies`,
            resolved: result.rows
        });
    } catch (error) {
        console.error('Clear Emergencies Failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// [FIX] Sync Beds Table - Clear orphaned occupied beds
app.get('/api/test/sync-beds', async (req, res) => {
    try {
        const pool = require('./config/db');
        console.log('🔧 Syncing beds with active admissions...');
        
        // Find all beds marked as Occupied in the status column
        const occupiedBeds = await pool.query(`
            SELECT b.id, b.bed_number, b.status, w.name as ward_name
            FROM beds b
            JOIN wards w ON w.id = b.ward_id
            WHERE b.status = 'Occupied'
        `);
        
        let fixed = 0;
        const details = [];
        
        for (const bed of occupiedBeds.rows) {
            // Check if there's an active admission for this bed
            const activeAdmission = await pool.query(`
                SELECT id, status 
                FROM admissions 
                WHERE bed_number = $1 AND LOWER(TRIM(ward)) = LOWER(TRIM($2)) AND status = 'Admitted'
                LIMIT 1
            `, [bed.bed_number, bed.ward_name]);
            
            if (activeAdmission.rows.length === 0) {
                // No active admission - mark bed as Available
                await pool.query(`
                    UPDATE beds 
                    SET status = 'Available'
                    WHERE id = $1
                `, [bed.id]);
                
                fixed++;
                details.push({
                    bed: bed.bed_number,
                    ward: bed.ward_name,
                    action: 'Cleared - no active admission found'
                });
            }
        }
        
        console.log(`✅ Synced ${fixed} beds`);
        res.json({ 
            success: true, 
            message: `Synced ${fixed} beds - cleared orphaned occupied status`, 
            fixed,
            details 
        });
    } catch (err) {
        console.error('Sync Beds Failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// [MIGRATION] Admin Recovery Console - Soft Delete & Audit Tables
app.get('/api/test/migrate-recovery-console', async (req, res) => {
    try {
        const pool = require('./config/db');
        console.log('🔧 Running Admin Recovery Console Migration...');
        
        // 1. Add soft delete columns to patients
        await pool.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
        await pool.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_by INT`);
        await pool.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS deletion_reason TEXT`);
        
        // 2. Add soft delete columns to admissions
        await pool.query(`ALTER TABLE admissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
        await pool.query(`ALTER TABLE admissions ADD COLUMN IF NOT EXISTS deleted_by INT`);
        await pool.query(`ALTER TABLE admissions ADD COLUMN IF NOT EXISTS deletion_reason TEXT`);
        
        // 3. Create patient_history table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS patient_history (
                id SERIAL PRIMARY KEY,
                patient_id INT,
                hospital_id INT,
                changed_by INT,
                changed_at TIMESTAMP DEFAULT NOW(),
                action VARCHAR(20) NOT NULL,
                before_data JSONB,
                after_data JSONB,
                reason TEXT,
                ip_address VARCHAR(45)
            )
        `);
        
        // 4. Create admin_audit_log table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin_audit_log (
                id SERIAL PRIMARY KEY,
                hospital_id INT,
                user_id INT,
                username VARCHAR(255),
                role VARCHAR(50),
                action VARCHAR(100) NOT NULL,
                entity_type VARCHAR(50) NOT NULL,
                entity_id INT,
                entity_name VARCHAR(255),
                before_data JSONB,
                after_data JSONB,
                reason TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        // 5. Create indexes
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_patient_history_patient ON patient_history(patient_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_audit_hospital ON admin_audit_log(hospital_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_audit_date ON admin_audit_log(created_at DESC)`);
        
        console.log('✅ Admin Recovery Console Migration Complete');
        res.json({ success: true, message: "Admin Recovery Console migration complete - all tables created" });
    } catch (err) {
        console.error('Recovery Console Migration Failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// EMERGENCY: Run Ward Dashboard Migration (076) - HARDCODED FIX
app.get('/api/debug/migrate-ward', async (req, res) => {
  try {
    const pool = require('./config/db');
    
    console.log('🔧 Manual trigger: Running migration 076 (Hardcoded Force)...');
    
    const migrationSQL = `
      -- DROP Tables to ensure clean state (force fix schema mismatches)
      DROP TABLE IF EXISTS ward_change_requests;
      DROP TABLE IF EXISTS ward_service_charges;
      DROP TABLE IF EXISTS ward_consumables;
      -- NOT dropping hospital_settings blindly if it has data, but for this fix we assume it is the blocker
      -- Let's try to CREATE IF NOT EXISTS for hospital_settings but adding columns if needed is hard in one go.
      -- Given 404 on profile, it likely doesn't exist or is empty.
      CREATE TABLE IF NOT EXISTS hospital_settings (
          key VARCHAR(50) PRIMARY KEY,
          value TEXT,
          updated_at TIMESTAMP DEFAULT NOW(),
          hospital_id INTEGER
      );

      -- Ward Service Charges
      CREATE TABLE IF NOT EXISTS ward_service_charges (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          hospital_id INTEGER
      );

      -- Ward Consumables
      CREATE TABLE IF NOT EXISTS ward_consumables (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          stock_quantity INTEGER DEFAULT 0,
          active BOOLEAN DEFAULT TRUE,
          hospital_id INTEGER
      );

      -- Ward Change Requests
      CREATE TABLE IF NOT EXISTS ward_change_requests (
          id SERIAL PRIMARY KEY,
          request_type VARCHAR(50),
          item_type VARCHAR(20),
          item_id INTEGER,
          new_name VARCHAR(100),
          new_price DECIMAL(10, 2),
          notes TEXT,
          status VARCHAR(20) DEFAULT 'Pending',
          requested_by INTEGER,
          processed_by INTEGER,
          created_at TIMESTAMP DEFAULT NOW(),
          processed_at TIMESTAMP,
          hospital_id INTEGER
      );

      -- Seed Data: Service Charges
      INSERT INTO ward_service_charges (name, price) VALUES
      ('Nursing Care (Per Day)', 500.00),
      ('Oxygen Support (Per Hour)', 200.00),
      ('Venipuncture', 150.00),
      ('Dressing Change - Small', 250.00),
      ('Dressing Change - Large', 500.00),
      ('Nebulization', 100.00),
      ('Ryles Tube Insertion', 800.00),
      ('Catheterization', 800.00),
      ('ECG Monitoring (Per Hour)', 300.00)
      ON CONFLICT DO NOTHING;

      -- Seed Data: Consumables
      INSERT INTO ward_consumables (name, price, stock_quantity) VALUES
      ('IV Kit (Cannula + Set)', 350.00, 100),
      ('Syringe 5ml', 20.00, 500),
      ('Syringe 10ml', 30.00, 500),
      ('Gloves (Pair)', 50.00, 1000),
      ('N95 Mask', 150.00, 200),
      ('Surgical Mask', 20.00, 1000),
      ('Cotton Roll (500g)', 300.00, 50),
      ('Betadine Solution (500ml)', 450.00, 20),
      ('Paracetamol IV (100ml)', 120.00, 100),
      ('Normal Saline (500ml)', 100.00, 200)
      ON CONFLICT DO NOTHING;

      -- Seed Data: Hospital Settings
      INSERT INTO hospital_settings (key, value) VALUES 
      ('hospital_name', 'Wolf Hospital'),
      ('hospital_address', '123 Wolf Street, Cyber City')
      ON CONFLICT (key) DO NOTHING;
    `;
    
    // Run Query
    await pool.query(migrationSQL);
    
    console.log('✅ Ward tables created and seeded (Hardcoded).');
    res.json({ success: true, message: 'Migration 076 (Hardcoded force) applied successfully' });
  } catch (error) {
    console.error('Migration 076 Failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// MANUAL MIGRATION: Roster Tables (Force Fix)
app.get('/api/debug/migrate-roster', async (req, res) => {
  try {
    const pool = require('./config/db');
    console.log('🔧 Manual trigger: Running Roster Migration (Hardcoded)...');

    const migrationSQL = `
      CREATE TABLE IF NOT EXISTS nurse_assignments (
          id SERIAL PRIMARY KEY,
          nurse_id INTEGER REFERENCES users(id),
          ward_id INTEGER,
          shift_type VARCHAR(20),
          assignment_date DATE,
          bed_ids JSONB DEFAULT '[]',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
      );
      
      -- Index for performance
      CREATE INDEX IF NOT EXISTS idx_nurse_assignments_date ON nurse_assignments(assignment_date);
      CREATE INDEX IF NOT EXISTS idx_nurse_assignments_nurse ON nurse_assignments(nurse_id);
      CREATE INDEX IF NOT EXISTS idx_nurse_assignments_ward ON nurse_assignments(ward_id);
    `;

    await pool.query(migrationSQL);
    console.log('✅ Roster tables created.');
    res.json({ success: true, message: 'Roster tables created successfully' });
  } catch (error) {
    console.error('Roster Migration Failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// MANUALLY TRIGGER TENANT BACKFILL (MIGRATION 080)
app.post('/api/health/run-migration', async (req, res) => {
  const { setupKey } = req.body;
  if (setupKey !== 'WolfSetup2024!') return res.status(403).json({ error: 'Invalid key' });

  try {
    const pool = require('./config/db');
    console.log('🔧 Manual trigger: Running Tenant Backfill (080) v2...');

    // 1. Fix Schema (Sequential Steps)
    try {
        console.log('Step 1: Creating/Fixing Hospitals Table...');
        
        // [NUCLEAR FIX] Drop table to ensure clean slate
        await pool.query(`DROP TABLE IF EXISTS hospitals CASCADE;`);

        await pool.query(`
            CREATE TABLE hospitals (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                subdomain VARCHAR(255) UNIQUE,
                custom_domain VARCHAR(255) UNIQUE,
                hospital_domain VARCHAR(255) UNIQUE, -- Legacy 
                logo_url TEXT,
                primary_color VARCHAR(20) DEFAULT '#0d6efd',
                secondary_color VARCHAR(20) DEFAULT '#6c757d',
                settings JSONB DEFAULT '{}',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log('Step 2: Registering Kokila Hospital...');
        await pool.query(`
            INSERT INTO hospitals (id, code, name, subdomain, hospital_domain, primary_color, secondary_color, is_active)
            VALUES (
                    '7f9d5e32-8491-49b8-a73c-6e2c1d0f5b9a',
                    'kokila',
                    'Kokila Hospital',
                    'kokila',
                    'kokila-wolfhms.web.app',
                    '#06b6d4',
                    '#1e293b',
                    true
                ) 
            ON CONFLICT (hospital_domain) DO UPDATE 
            SET name = EXCLUDED.name, code = EXCLUDED.code, subdomain = EXCLUDED.subdomain;
        `);

        console.log('Step 3: Creating Utility Function...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION backfill_tenant(tbl text) RETURNS void AS $$ 
            BEGIN 
                -- [AGGRESSIVE FIX] Drop column if exists to ensure Type is UUID
                EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS hospital_id CASCADE', tbl);
                
                -- Add column
                EXECUTE format('ALTER TABLE %I ADD COLUMN hospital_id UUID', tbl);

                -- Update NULLs to Kokila UUID
                EXECUTE format('UPDATE %I SET hospital_id = %L', tbl, '7f9d5e32-8491-49b8-a73c-6e2c1d0f5b9a');

                -- SPECIAL HANDLING FOR hospital_settings (Fix PK)
                IF tbl = 'hospital_settings' THEN
                    BEGIN
                        EXECUTE 'ALTER TABLE hospital_settings DROP CONSTRAINT IF EXISTS hospital_settings_pkey';
                        EXECUTE 'ALTER TABLE hospital_settings ADD UNIQUE (key, hospital_id)';
                    EXCEPTION WHEN OTHERS THEN
                        RAISE NOTICE 'Could not fix hospital_settings PK: %', SQLERRM;
                    END;
                END IF;

                -- Add Foreign Key
                BEGIN 
                    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT fk_%I_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id)', tbl, tbl);
                EXCEPTION WHEN duplicate_object THEN 
                    -- Constraint already exists
                END;
            END;
            $$ LANGUAGE plpgsql;
        `);

        console.log('✅ Schema setup complete.');
    } catch (setupErr) {
        console.error('❌ Schema Setup Failed:', setupErr);
        return res.status(200).json({ success: false, phase: 'schema_setup', error: setupErr.message });
    }

    const tables = [
      'users', 'patients', 'admissions', 'appointments', 'opd_visits', 
      'transactions', 'invoices', 'prescriptions', 'lab_requests', 
      'radiology_requests', 'wards', 'beds', 'inventory_items', 
      'purchase_orders', 'shift_handovers', 'nurse_assignments', 
      'emergency_logs', 'ot_schedules', 'diet_charts', 'housekeeping_tasks', 
      'ambulance_trips', 'blood_bank_inventory', 'morgue_bodies', 
      'asset_maintenance', 'visitor_passes', 'guard_patrols',
      'nursing_care_plans', 'pain_scores', 'fluid_balance', 'iv_lines',
      'ward_consumables', 'ward_service_charges', 'ward_change_requests', 'patient_consumables', 'payments'
    ];

    const results = [];
    for (const tbl of tables) {
      try {
        await pool.query(`SELECT backfill_tenant($1)`, [tbl]);
        results.push({ table: tbl, status: 'scucess' });
      } catch (err) {
        console.error(`Failed to backfill ${tbl}:`, err);
        results.push({ table: tbl, status: 'failed', error: err.message });
      }
    }

    console.log('✅ Tenant backfill process finished.');
    res.json({ success: true, results });
  } catch (error) {
    console.error('Tenant Backfill Schema Failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/debug/migrate-tenants-v2', async (req, res) => {
  try {
    const pool = require('./config/db');
    console.log('🔧 Manual trigger: Running Tenant Backfill (080) v2...');

    // 1. Fix Schema (Sequential Steps)
    try {
        console.log('Step 1: Creating/Fixing Hospitals Table...');
        
        // [NUCLEAR FIX] Drop table to ensure clean slate
        await pool.query(`DROP TABLE IF EXISTS hospitals CASCADE;`);

        await pool.query(`
            CREATE TABLE hospitals (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                subdomain VARCHAR(255) UNIQUE,
                custom_domain VARCHAR(255) UNIQUE,
                hospital_domain VARCHAR(255) UNIQUE, -- Legacy 
                logo_url TEXT,
                primary_color VARCHAR(20) DEFAULT '#0d6efd',
                secondary_color VARCHAR(20) DEFAULT '#6c757d',
                settings JSONB DEFAULT '{}',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log('Step 2: Registering Kokila Hospital...');
        await pool.query(`
            INSERT INTO hospitals (id, code, name, subdomain, hospital_domain, primary_color, secondary_color, is_active)
            VALUES (
                    '7f9d5e32-8491-49b8-a73c-6e2c1d0f5b9a',
                    'kokila',
                    'Kokila Hospital',
                    'kokila',
                    'kokila-wolf-hms.web.app',
                    '#06b6d4',
                    '#1e293b',
                    true
                ) 
            ON CONFLICT (hospital_domain) DO UPDATE 
            SET name = EXCLUDED.name, code = EXCLUDED.code, subdomain = EXCLUDED.subdomain;
        `);

        console.log('Step 3: Creating Utility Function...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION backfill_tenant(tbl text) RETURNS void AS $$ 
            BEGIN 
                -- [AGGRESSIVE FIX] Drop column if exists to ensure Type is UUID
                EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS hospital_id CASCADE', tbl);
                
                -- Add column
                EXECUTE format('ALTER TABLE %I ADD COLUMN hospital_id UUID', tbl);

                -- Update NULLs to Kokila UUID
                EXECUTE format('UPDATE %I SET hospital_id = %L', tbl, '7f9d5e32-8491-49b8-a73c-6e2c1d0f5b9a');

                -- SPECIAL HANDLING FOR hospital_settings (Fix PK)
                IF tbl = 'hospital_settings' THEN
                    BEGIN
                        EXECUTE 'ALTER TABLE hospital_settings DROP CONSTRAINT IF EXISTS hospital_settings_pkey';
                        EXECUTE 'ALTER TABLE hospital_settings ADD UNIQUE (key, hospital_id)';
                    EXCEPTION WHEN OTHERS THEN
                        RAISE NOTICE 'Could not fix hospital_settings PK: %', SQLERRM;
                    END;
                END IF;

                -- Add Foreign Key
                BEGIN 
                    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT fk_%I_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id)', tbl, tbl);
                EXCEPTION WHEN duplicate_object THEN 
                    -- Constraint already exists
                END;
            END;
            $$ LANGUAGE plpgsql;
        `);

        console.log('✅ Schema setup complete.');
    } catch (setupErr) {
        console.error('❌ Schema Setup Failed:', setupErr);
        return res.status(200).json({ success: false, phase: 'schema_setup', error: setupErr.message });
    }

    const tables = [
      'users', 'patients', 'admissions', 'appointments', 'opd_visits', 
      'transactions', 'invoices', 'prescriptions', 'lab_requests', 
      'radiology_requests', 'wards', 'beds', 'inventory_items', 
      'purchase_orders', 'shift_handovers', 'nurse_assignments', 
      'emergency_logs', 'ot_schedules', 'diet_charts', 'housekeeping_tasks', 
      'ambulance_trips', 'blood_bank_inventory', 'morgue_bodies', 
      'asset_maintenance', 'visitor_passes', 'guard_patrols',
      'nursing_care_plans', 'pain_scores', 'fluid_balance', 'iv_lines',
      'ward_consumables', 'ward_service_charges', 'ward_change_requests', 'patient_consumables', 'payments'
    ];

    const results = [];
    for (const tbl of tables) {
      try {
        await pool.query(`SELECT backfill_tenant($1)`, [tbl]);
        results.push({ table: tbl, status: 'scucess' });
      } catch (err) {
        console.error(`Failed to backfill ${tbl}:`, err);
        results.push({ table: tbl, status: 'failed', error: err.message });
      }
    }

    console.log('✅ Tenant backfill process finished.');
    res.json({ success: true, results });
  } catch (error) {
    console.error('Tenant Backfill Schema Failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// EMERGENCY: SQL Execute
app.post('/api/debug/sql', async (req, res) => {
    try {
        const { query, params } = req.body;
        const pool = require('./config/db');
        const result = await pool.query(query, params || []);
        res.json({ rowCount: result.rowCount, rows: result.rows });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// EMERGENCY: Force Fix Data (Update NULLs only)
app.post('/api/debug/force-fix-data', async (req, res) => {
    try {
        const pool = require('./config/db');
        const hospitalId = '7f9d5e32-8491-49b8-a73c-6e2c1d0f5b9a';
        
        console.log('🔧 Running Force Data Fix (AGGRESSIVE)...');
        
        // 1. Ensure Kokila exists
        await pool.query(`
            INSERT INTO hospitals (id, hospital_name, hospital_domain)
            VALUES ($1, 'Kokila Hospital', 'kokila-wolfhms.web.app') 
            ON CONFLICT (hospital_domain) DO NOTHING
        `, [hospitalId]);

        const tables = ['users', 'patients', 'admissions', 'appointments', 'opd_visits', 'transactions', 'invoices', 'prescriptions'];
        
        const results = {};
        
        for (const tbl of tables) {
            try {
                // Check null count before
                const preCheck = await pool.query(`SELECT count(*) as c FROM ${tbl} WHERE hospital_id IS NULL`);
                const nullCount = preCheck.rows[0].c;

                // Determine if column exists
                const colCheck = await pool.query(`
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = $1 AND column_name = 'hospital_id'
                `, [tbl]);
                
                if (colCheck.rows.length === 0) {
                     await pool.query(`ALTER TABLE ${tbl} ADD COLUMN hospital_id UUID`);
                }
                
                // AGGRESSIVE UPDATE: NO WHERE CLAUSE
                const updateRes = await pool.query(`UPDATE ${tbl} SET hospital_id = $1`, [hospitalId]);
                results[tbl] = {
                    nullsBefore: nullCount,
                    updated: updateRes.rowCount,
                    status: 'Updated All'
                };
                
            } catch (e) {
                results[tbl] = e.message;
            }
        }
        
        res.json({ success: true, results });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// CRITICAL: Load routes SYNCHRONOUSLY before server starts
// This ensures routes are available immediately for Cloud Run
// ==========================================
console.log('📦 Loading routes synchronously...');

// Load all routes upfront
const authRoutes = require('./routes/authRoutes');
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

// Phase 1 Security Hardening: Audit Middleware
const { auditMiddleware } = require('./middleware/auditMiddleware');

// Mount routes SYNCHRONOUSLY
// [DEBUG] Prove Deployment
app.get('/api/debug/ping', (req, res) => res.json({ message: 'pong', timestamp: new Date().toISOString() }));
app.use('/api/migrations', require('./routes/migrationRoutes')); // Mount High Priority

app.use('/api/sync', syncRoutes); // High Priority
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
app.use('/api/admin', adminRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/admin/data-steward', adminDataStewardRoutes);
app.use('/api/admin/recovery', adminRecoveryRoutes); // Admin Recovery Console
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

// Apply audit middleware to PHI-sensitive routes
app.use('/api/patients', auditMiddleware);
app.use('/api/admissions', auditMiddleware);
app.use('/api/lab', auditMiddleware);
app.use('/api/pharmacy', auditMiddleware);

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
