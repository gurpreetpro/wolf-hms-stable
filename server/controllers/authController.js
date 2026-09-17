const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const AuditService = require('../services/AuditService');
const LoginSecurityService = require('../services/LoginSecurityService');
const logger = require('../utils/logger');

// Sliding-scale failure tracker (shared service)
const { recordLoginFailure, clearLoginFailures } = require('../services/loginRateLimiter');

const login = asyncHandler(async (req, res) => {
    const { username, email, password, id, identifier } = req.body;
    // Wolf Guard Mobile App sends 'id' instead of 'username', frontend may send 'identifier'
    const loginIdentifier = identifier || username || email || id;

    // Get hospital_id from request (subdomain-based) for logging purposes
    const requestHospitalId = req.hospital_id;

    // [FIX] STRICT TENANT ISOLATION
    // 1. Find user by identifier (username/email/id)
    // 2. Enforce that the user belongs to the current hospital (req.hospital_id)
    // Exception: 'marketing' or 'super_admin' roles might exist across hospitals, but for now we enforce strictness.

    let query = 'SELECT id, username, email, password, role, hospital_id, is_active, security_question FROM users WHERE (username = $1 OR email = $1 OR id::text = $1)';
    const params = [loginIdentifier];

    // [DEBUG] Log exact query for troubleshooting
    console.log(`[Auth] 🔍 LOGIN DEBUG: Query = "${query}"`);
    console.log(`[Auth] 🔍 LOGIN DEBUG: Params = ${JSON.stringify(params)}`);

    let result;
    try {
        result = await pool.query(query, params);
    } catch (sqlErr) {
        console.error(`[Auth] 💥 SQL Query Failed: ${sqlErr.message}`);
        return ResponseHandler.error(res, `Database Error: ${sqlErr.message}`, 500);
    }

    console.log(`[Auth] 🔍 Query Result: Found ${result.rows.length} users`);

    if (result.rows.length === 0) {
        // [SLIDING SCALE] Record failure in rate limiter
        if (req.authRateInfo) {
            req.authRateInfo.recordFailure();
        } else {
            recordLoginFailure(req.ip || req.connection.remoteAddress);
        }

        // Log failed attempt (unknown user)
        await LoginSecurityService.logLoginEvent({
            username: loginIdentifier,
            hospital_id: requestHospitalId,
            action: 'LOGIN_FAILED',
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            details: { reason: 'User not found' }
        });
        return ResponseHandler.error(res, 'Incorrect username or password. Please try again.', 401);
    }

    // [FIX] Tenant Mismatch Check
    // If multiple users found (rare, but possible with same username in diff DBs?), pick the one matching hospital_id
    // If only one user found, CHECK if it matches requestHospitalId

    // Filter results to find the user belonging to THIS hospital
    // Use loose equality (==) to handle string/number mismatch
    let user = result.rows.find(u => u.hospital_id == requestHospitalId);

    // If not found strictly, checks if the user is a super_admin/platform_admin allowed to roam
    if (!user) {
        const potentialUser = result.rows[0];
        // Allow platform_admin or super_admin to login from anywhere (optional, keep strict for now to solve user issue)
        if (['super_admin', 'platform_admin'].includes(potentialUser.role)) {
            user = potentialUser;
            console.log(`[Auth] ⚠️ Allowing Cross-Tenant Login for Admin Role: ${user.role}`);
        } else {
            // START STRICT REJECTION
            console.warn(`[Auth] ⛔ Tenant Mismatch Attempt! User ${potentialUser.username} belongs to Hospital ${potentialUser.hospital_id}, but trying to login to Hospital ${requestHospitalId}.`);

            // Check if it's the specific "Parveen vs Kokila" case to give a helpful error log
            if (requestHospitalId === 2 && potentialUser.hospital_id === 1) {
                console.warn(`[Auth] ⛔ BLOCKED: Kokila User trying to access Dr Parveen Portal.`);
            }

            return ResponseHandler.error(res, 'This account does not belong to this hospital. Please check the correct hospital login page.', 401);
        }
    }
    console.log(`[Auth] 👤 User Found: ${user.username} (${user.id}). Verifying password...`);

    // [SECURITY] Check if account is locked
    const lockStatus = await LoginSecurityService.checkLockout(user.id);
    if (lockStatus && lockStatus.locked) {
        await LoginSecurityService.logLoginEvent({
            user_id: user.id, username: user.username,
            hospital_id: requestHospitalId, action: 'LOCKOUT',
            ip_address: req.ip, user_agent: req.headers['user-agent'],
            details: { minutes_remaining: lockStatus.minutes_remaining }
        });
        return ResponseHandler.error(res, `Your account is temporarily locked. Please try again in ${lockStatus.minutes_remaining} minute(s).`, 423);
    }

    let isMatch = false;
    try {
        if (!user.password) throw new Error('Stored password hash is missing/null');
        if (!password) throw new Error('Input password is missing');
        isMatch = await bcrypt.compare(password, user.password);
    } catch (bcryptErr) {
        console.error(`[Auth] 💥 Bcrypt Error: ${bcryptErr.message}`);
        return ResponseHandler.error(res, 'Authentication Error (Crypto Failure)', 500);
    }

    if (!isMatch) {
        console.warn(`[Auth] ⛔ Password Mismatch for ${user.username}`);

        // [SLIDING SCALE] Record failure in rate limiter
        if (req.authRateInfo) {
            req.authRateInfo.recordFailure();
        } else {
            recordLoginFailure(req.ip || req.connection.remoteAddress);
        }

        // [SECURITY] Record failed attempt & check for lockout
        await LoginSecurityService.recordFailedAttempt(user.id, req.ip);
        await LoginSecurityService.logLoginEvent({
            user_id: user.id, username: user.username,
            hospital_id: requestHospitalId, action: 'LOGIN_FAILED',
            ip_address: req.ip, user_agent: req.headers['user-agent'],
            details: { reason: 'Password mismatch' }
        });
        return ResponseHandler.error(res, 'Incorrect username or password. Please try again.', 401);
    }

    // [SECURITY] Reset failed counter on successful login
    await LoginSecurityService.resetFailedAttempts(user.id);

    // [SLIDING SCALE] Clear failure history on successful login
    if (req.authRateInfo) {
        req.authRateInfo.clearFailures();
    } else {
        clearLoginFailures(req.ip || req.connection.remoteAddress);
    }

    // [SECURITY] Detect suspicious login patterns
    const suspiciousFlags = await LoginSecurityService.detectSuspiciousLogin(user.id, req.ip, requestHospitalId);
    if (suspiciousFlags.length > 0) {
        console.warn(`[Auth] 🚨 SUSPICIOUS LOGIN: ${user.username} — Flags: ${suspiciousFlags.join(', ')}`);
        await LoginSecurityService.logLoginEvent({
            user_id: user.id, username: user.username,
            hospital_id: requestHospitalId, action: 'SUSPICIOUS',
            ip_address: req.ip, user_agent: req.headers['user-agent'],
            details: { flags: suspiciousFlags }
        });
    }

    // Include hospital_id in JWT for multi-tenancy
    console.log('[Auth] 🔑 Generating JWT...');
    const isMobileOrGuard = user.role === 'security_guard' ||
                            req.body.clientType === 'mobile' ||
                            req.headers['x-client-type'] === 'mobile' ||
                            (req.headers['user-agent'] && (req.headers['user-agent'].includes('okhttp') || req.headers['user-agent'].includes('Expo')));
    
    // Mobile/Security Guard tokens last 30 days so active shifts & patrols never drop mid-shift.
    // Web sessions use configured JWT_EXPIRES (default 8 hours).
    const tokenExpiry = isMobileOrGuard ? '30d' : (process.env.JWT_EXPIRES || '8h');

    if (!process.env.JWT_SECRET) {
        console.error('[CRITICAL] JWT_SECRET is not defined in environment variables!');
        return res.status(500).json({ message: 'Server misconfiguration: JWT_SECRET missing' });
    }

    const token = jwt.sign(
        {
            id: user.id,
            role: user.role,
            username: user.username,
            email: user.email, // Required for platform owner check
            hospital_id: user.hospital_id || 1 // Default to 1 for backward compatibility
        },
        process.env.JWT_SECRET,
        {
            expiresIn: tokenExpiry,
            issuer: process.env.JWT_ISSUER || 'wolf-hms',
            audience: process.env.JWT_AUDIENCE || 'wolf-hms-api'
        }
    );

    // [AUTH] Refresh Token Rotation (Hash Storage)
    let rawRefreshToken = null;
    try {
        rawRefreshToken = crypto.randomBytes(40).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        const deviceType = isMobileOrGuard ? 'mobile' : 'web';

        await pool.query(
            `INSERT INTO refresh_tokens (token_hash, user_id, device, expires_at) VALUES ($1, $2, $3, $4)`,
            [tokenHash, user.id, deviceType, expiresAt]
        );

        const isProduction = process.env.NODE_ENV === 'production';
        if (res.cookie) {
            res.cookie('refreshToken', rawRefreshToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'None' : 'Lax',
                maxAge: 30 * 24 * 60 * 60 * 1000
            });
        }
        console.log(`[Auth] 🍪 Refresh Token issued for ${user.username}`);
    } catch (rtErr) {
        console.error(`[Auth] ⚠️ Failed to record Refresh Token: ${rtErr.message}`);
    }

    if (!user.is_active) {
        return ResponseHandler.error(res, 'Account is inactive or pending approval.', 403);
    }

    // [AUDIT] Log successful login
    try {
        const auditContext = { user: { id: user.id, username: user.username }, hospital_id: user.hospital_id, ip: req.ip };
        AuditService.log('LOGIN', 'USER', user.id, { method: 'password' }, auditContext);
    } catch (auditErr) {
        console.warn(`[Auth] ⚠️ Audit Log Failed (Non-fatal): ${auditErr.message}`);
    }

    // [SECURITY] Log successful login to security audit trail
    await LoginSecurityService.logLoginEvent({
        user_id: user.id, username: user.username,
        hospital_id: user.hospital_id, action: 'LOGIN_SUCCESS',
        ip_address: req.ip, user_agent: req.headers['user-agent'],
        details: suspiciousFlags.length > 0 ? { suspicious_flags: suspiciousFlags } : null
    });

    const responseData = {
        token,
        refreshToken: rawRefreshToken,
        user: {
            id: user.id,
            username: user.username,
            name: user.full_name || user.username, // App expects 'name'
            full_name: user.full_name || user.username,
            email: user.email,
            role: user.role,
            department: user.department,
            hospital_id: user.hospital_id || 1
        },
        security_setup_required: !user.security_question
    };

    // Hybrid Response: support 'data' wrapper (Web) AND flat properties (Mobile App)
    // We construct the response manually to match exact original format
    return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: responseData,
        ...responseData
    });
});

const getUsers = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    console.log(`[Auth] getUsers for Hospital ID: ${hospitalId}`);
    const result = await pool.query(
        'SELECT id, username, email, role, is_active, created_at, department, consultation_fee FROM users WHERE hospital_id = $1 ORDER BY created_at DESC',
        [hospitalId]
    );
    ResponseHandler.success(res, result.rows);
});

const register = asyncHandler(async (req, res) => {
    const { username, email, password, role: rawRole, created_at, department } = req.body;

    // Normalize role: lowercase and replace spaces with underscores
    // Prevents constraint violations if non-standard roles are sent
    const role = rawRole ? rawRole.toLowerCase().replace(/\s+/g, '_') : 'user';

    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (userCheck.rows.length > 0) {
        return ResponseHandler.error(res, 'Username or Email already exists', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const hospitalId = req.hospital_id || 1;
    let query = 'INSERT INTO users (username, email, password, role, department, approval_status, is_active, hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, username, email, role, department, created_at';
    // Admin created users are auto-approved and active
    let params = [username, email, hashedPassword, role, department || null, 'APPROVED', true, hospitalId];

    if (created_at) {
        // Handle created_at if passed (usually for seeds)
        query = 'INSERT INTO users (username, email, password, role, created_at, department, approval_status, is_active, hospital_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, username, email, role, department, created_at';
        params = [username, email, hashedPassword, role, created_at, department || null, 'APPROVED', true, hospitalId];
    }

    const newUser = await pool.query(query, params);

    ResponseHandler.success(res, newUser.rows[0], 'User registered successfully', 201);
});


const updateUserStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    const result = await pool.query(
        'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, username, is_active',
        [is_active, id]
    );

    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'User not found', 404);
    }

    ResponseHandler.success(res, result.rows[0]);
});

const demoLogin = asyncHandler(async (req, res) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('demo123', salt);

    // Define all demo users needed for full simulation
    const demoUsers = [
        { username: 'demo_admin', email: 'demo.admin@wolf.com', role: 'admin' },
        { username: 'Dr. Demo (Medicine)', email: 'demo.doctor@wolf.com', role: 'doctor' },
        { username: 'demo_reception', email: 'demo.reception@wolf.com', role: 'reception' },
        { username: 'demo_pharmacist', email: 'demo.pharmacy@wolf.com', role: 'pharmacist' },
        { username: 'demo_lab', email: 'demo.lab@wolf.com', role: 'lab' },
        { username: 'demo_nurse', email: 'demo.nurse@wolf.com', role: 'nurse' }
    ];

    // Create all demo users if they don't exist (check both username and email)
    for (const demoUser of demoUsers) {
        try {
            const existing = await pool.query(
                'SELECT id FROM users WHERE username = $1 OR email = $2',
                [demoUser.username, demoUser.email]
            );
            if (existing.rows.length === 0) {
                await pool.query(
                    'INSERT INTO users (username, email, password, role, is_active) VALUES ($1, $2, $3, $4, true)',
                    [demoUser.username, demoUser.email, hashedPassword, demoUser.role]
                );
                console.log(`Created demo user: ${demoUser.username}`);
            }
        } catch (insertErr) {
            // Ignore insert errors - user might already exist with slight variations
            console.log(`Skipping ${demoUser.username}: ${insertErr.message}`);
        }
    }

    // Get the admin user for login
    const result = await pool.query("SELECT * FROM users WHERE username = 'demo_admin'");
    const user = result.rows[0];

    if (!process.env.JWT_SECRET) {
        console.error('[CRITICAL] JWT_SECRET is not defined in environment variables!');
        return res.status(500).json({ message: 'Server misconfiguration: JWT_SECRET missing' });
    }

    const token = jwt.sign(
        { id: user.id, role: user.role, username: user.username, hospital_id: user.hospital_id || 1 },
        process.env.JWT_SECRET,
        {
            expiresIn: '1h',
            issuer: process.env.JWT_ISSUER || 'wolf-hms',
            audience: process.env.JWT_AUDIENCE || 'wolf-hms-api'
        }
    );

    res.json({
        token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        },
        demoUsersCreated: demoUsers.map(u => u.username)
    });
});

const emailService = require('../services/emailService');

// MVP: In-Memory OTP Store (Replace with Redis/DB for Prod)
const otpStore = new Map();

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
        return ResponseHandler.error(res, 'User not found', 404);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins

    otpStore.set(email, { otp, expiresAt });

    await emailService.sendEmail(email, 'Wolf Guard Password Reset', `Your OTP is: ${otp}`);

    ResponseHandler.success(res, { message: 'OTP sent to email' });
});

const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    const stored = otpStore.get(email);

    if (!stored) return ResponseHandler.error(res, 'Invalid Request', 400);
    if (Date.now() > stored.expiresAt) {
        otpStore.delete(email);
        return ResponseHandler.error(res, 'OTP Expired', 400);
    }
    if (stored.otp !== otp) return ResponseHandler.error(res, 'Invalid OTP', 400);

    // Hash & Update
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hashedPassword, email]);

    otpStore.delete(email);
    ResponseHandler.success(res, { message: 'Password Updated' });
});

// --- New Onboarding & Recovery Functions ---

// Public Registration (Self-Sign Up) used by Register.jsx
const registerPublic = asyncHandler(async (req, res) => {
    const { username, full_name, email, password, role, department,
        security_question, security_answer,
        security_question_2, security_answer_2,
        security_question_3, security_answer_3
    } = req.body;

    // Get hospital_id from tenant resolver (based on domain/subdomain)
    const hospitalId = req.hospital_id || 1;

    // Multi-Specialty Logic: If department is array, join it
    const departmentString = Array.isArray(department) ? department.join(', ') : department;

    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (userCheck.rows.length > 0) {
        return ResponseHandler.error(res, 'Username or Email already exists', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Hash all answers (with null-safe defaults)
    const hashedAnswer = security_answer ? await bcrypt.hash(security_answer.toLowerCase().trim(), salt) : null;
    const hashedAnswer2 = security_answer_2 ? await bcrypt.hash(security_answer_2.toLowerCase().trim(), salt) : null;
    const hashedAnswer3 = security_answer_3 ? await bcrypt.hash(security_answer_3.toLowerCase().trim(), salt) : null;

    const query = `
        INSERT INTO users 
        (username, full_name, email, password, role, department, 
        security_question, security_answer,
        security_question_2, security_answer_2,
        security_question_3, security_answer_3,
        hospital_id, approval_status, is_active) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'PENDING', false) 
        RETURNING id, username, full_name, approval_status, hospital_id
    `;

    const newUser = await pool.query(query, [
        username,
        full_name || username, // Default to username if empty
        email,
        hashedPassword,
        role,
        departmentString || null,
        security_question, hashedAnswer,
        security_question_2, hashedAnswer2,
        security_question_3, hashedAnswer3,
        hospitalId
    ]);

    ResponseHandler.success(res, {
        message: 'Registration successful. Waiting for Admin approval.',
        user: newUser.rows[0]
    }, 201);
});

// Admin: Get Pending Users
const getPendingUsers = asyncHandler(async (req, res) => {
    const result = await pool.query(
        "SELECT id, username, email, role, department, created_at FROM users WHERE approval_status = 'PENDING' ORDER BY created_at DESC"
    );
    ResponseHandler.success(res, result.rows);
});

// Admin: Approve/Reject User
const updateApprovalStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
        return ResponseHandler.error(res, 'Invalid status', 400);
    }

    if (status === 'REJECTED') {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        return ResponseHandler.success(res, { message: 'User request rejected and removed' });
    }

    const result = await pool.query(
        "UPDATE users SET approval_status = 'APPROVED', is_active = true WHERE id = $1 RETURNING id, username, approval_status",
        [id]
    );
    ResponseHandler.success(res, result.rows[0]);
});

// Recovery Step 1: Get Security Questions
const initiateRecovery = asyncHandler(async (req, res) => {
    const { username } = req.body;
    const result = await pool.query(
        'SELECT id, security_question, security_question_2, security_question_3 FROM users WHERE username = $1',
        [username]
    );
    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'User not found', 404);
    }
    const user = result.rows[0];

    // Check if all questions are set
    if (!user.security_question || !user.security_question_2 || !user.security_question_3) {
        return ResponseHandler.error(res, 'Incomplete security profile. Contact Admin.', 400);
    }

    ResponseHandler.success(res, {
        questions: [
            user.security_question,
            user.security_question_2,
            user.security_question_3
        ]
    });
});

// Recovery Step 2: Verify Answer & Reset PW
const completeRecovery = asyncHandler(async (req, res) => {
    const { username, answers, newPassword } = req.body; // answers is array [ans1, ans2, ans3]
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return ResponseHandler.error(res, 'User not found', 404);

    const user = result.rows[0];

    // Validate all 3 answers
    const match1 = await bcrypt.compare(answers[0].toLowerCase().trim(), user.security_answer);
    const match2 = await bcrypt.compare(answers[1].toLowerCase().trim(), user.security_answer_2);
    const match3 = await bcrypt.compare(answers[2].toLowerCase().trim(), user.security_answer_3);

    if (!match1 || !match2 || !match3) {
        return ResponseHandler.error(res, 'One or more answers are incorrect', 401);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
    ResponseHandler.success(res, { message: 'Password reset successful. You can now login.' });
});

// New: Setup Security Questions (Post-Login)
const setupSecurityProfile = asyncHandler(async (req, res) => {
    const { username, questions, answers } = req.body;
    // questions = [q1, q2, q3], answers = [a1, a2, a3]

    const salt = await bcrypt.genSalt(10);
    const h1 = await bcrypt.hash(answers[0].toLowerCase().trim(), salt);
    const h2 = await bcrypt.hash(answers[1].toLowerCase().trim(), salt);
    const h3 = await bcrypt.hash(answers[2].toLowerCase().trim(), salt);

    await pool.query(
        `UPDATE users SET 
            security_question = $1, security_answer = $2,
            security_question_2 = $3, security_answer_2 = $4,
            security_question_3 = $5, security_answer_3 = $6
            WHERE username = $7`,
        [questions[0], h1, questions[1], h2, questions[2], h3, username]
    );

    ResponseHandler.success(res, { message: 'Security profile updated successfully.' });
});

// User: Update Own Profile (Name, Email)
const updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id; // From Token
    const { full_name, email } = req.body;

    // Check email uniqueness if changing
    if (email) {
        const conflict = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
        if (conflict.rows.length > 0) {
            return ResponseHandler.error(res, 'Email already in use', 400);
        }
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let idx = 1;

    if (full_name) {
        updates.push(`full_name = $${idx++}`);
        values.push(full_name);
    }
    if (email) {
        updates.push(`email = $${idx++}`);
        values.push(email);
    }

    if (updates.length === 0) return ResponseHandler.success(res, { message: 'No changes made' });

    values.push(userId);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, username, full_name, email, role, department`;

    const result = await pool.query(query, values);

    ResponseHandler.success(res, {
        message: 'Profile updated successfully',
        user: result.rows[0]
    });
});

// Update Security Questions (from Settings - requires password verification)
const updateSecurityQuestions = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const {
        currentPassword,
        securityQuestion1, securityAnswer1,
        securityQuestion2, securityAnswer2,
        securityQuestion3, securityAnswer3
    } = req.body;

    // Verify current password first
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
        return ResponseHandler.error(res, 'User not found', 404);
    }

    const user = userResult.rows[0];
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
        return ResponseHandler.error(res, 'Current password is incorrect', 401);
    }

    // Hash the new answers
    const salt = await bcrypt.genSalt(10);
    const h1 = await bcrypt.hash(securityAnswer1.toLowerCase().trim(), salt);
    const h2 = await bcrypt.hash(securityAnswer2.toLowerCase().trim(), salt);
    const h3 = await bcrypt.hash(securityAnswer3.toLowerCase().trim(), salt);

    // Update security questions
    await pool.query(
        `UPDATE users SET 
            security_question = $1, security_answer = $2,
            security_question_2 = $3, security_answer_2 = $4,
            security_question_3 = $5, security_answer_3 = $6
            WHERE id = $7`,
        [securityQuestion1, h1, securityQuestion2, h2, securityQuestion3, h3, userId]
    );

    ResponseHandler.success(res, { message: 'Security questions updated successfully.' });
});

// --- Admin User Management (Added for Staff Management) ---

// Update User Profile (Admin) - Now includes consultation_fee for doctors
const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { email, role, department, username, consultation_fee } = req.body;

    // Check if email/username taken by other user
    const conflictCheck = await pool.query(
        'SELECT id FROM users WHERE (email = $1 OR username = $2) AND id != $3',
        [email, username, id]
    );

    if (conflictCheck.rows.length > 0) {
        return ResponseHandler.error(res, 'Username or Email already in use', 400);
    }

    const result = await pool.query(
        'UPDATE users SET email = $1, role = $2, department = $3, username = $4, consultation_fee = COALESCE($5, consultation_fee) WHERE id = $6 RETURNING id, username, email, role, department, consultation_fee',
        [email, role, department || null, username, consultation_fee || null, id]
    );

    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'User not found', 404);
    }

    ResponseHandler.success(res, result.rows[0]);
});

// Reset User Password (Admin)
const resetUserPassword = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
        'UPDATE users SET password = $1 WHERE id = $2 RETURNING id',
        [hashedPassword, id]
    );

    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'User not found', 404);
    }

    ResponseHandler.success(res, { message: 'Password reset successful' });
});

// Delete User (Admin)
const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Prevent deleting self (optional check, but good practice)
    if (req.user && req.user.id === parseInt(id)) {
        return ResponseHandler.error(res, 'Cannot delete your own account', 400);
    }

    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return ResponseHandler.error(res, 'User not found', 404);
        }

        ResponseHandler.success(res, { message: 'User deleted successfully' });
    } catch (error) {
        // Handle foreign key constraints (e.g. user has records)
        if (error.code === '23503') {
            return ResponseHandler.error(res, 'Cannot delete user: They have associated records (patients, invoices, etc.). Deactivate them instead.', 400);
        }
        throw error;
    }
});

// [AUTH] Refresh Access Token (Hardened Rotation with SHA-256 Hashes & Family Revocation)
const refreshToken = asyncHandler(async (req, res) => {
    const rawRefreshToken = req.body?.refreshToken || req.cookies?.refreshToken || req.headers['x-refresh-token'];

    if (!rawRefreshToken) {
        return res.status(401).json({ success: false, message: 'Refresh token required' });
    }

    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    // Find token with User details
    const result = await pool.query(
        `SELECT rt.*, u.username, u.email, u.role, u.hospital_id, u.full_name, u.department, u.is_active 
         FROM refresh_tokens rt
         JOIN users u ON rt.user_id = u.id
         WHERE rt.token_hash = $1`,
        [tokenHash]
    );

    if (result.rows.length === 0) {
        console.warn('[Auth] ⚠️ Invalid Refresh Token Attempt');
        return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const currentToken = result.rows[0];

    // Reuse Detection: If token is already revoked, revoke the ENTIRE token family (or user tokens)
    if (currentToken.revoked_at) {
        logger.warn(`[Auth] 🚨 REUSE DETECTED! User ${currentToken.username} (${currentToken.user_id}) using revoked token.`);
        if (currentToken.family_id) {
            await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = $1', [currentToken.family_id]);
        } else {
            await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1', [currentToken.user_id]);
        }
        return res.status(401).json({ success: false, message: 'Token reuse detected. All sessions revoked.' });
    }

    // Expiration Check
    if (new Date() > new Date(currentToken.expires_at)) {
        return res.status(401).json({ success: false, message: 'Refresh token expired' });
    }

    // User Status Check
    if (!currentToken.is_active) {
        return res.status(401).json({ success: false, message: 'User account is inactive' });
    }

    // Rotation: Issue New Token with same family_id
    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newTokenHash = crypto.createHash('sha256').update(newRawRefreshToken).digest('hex');
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Transaction: Revoke Old -> Insert New
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Revoke current
        await client.query(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
            [currentToken.id]
        );

        // Insert new with same family_id
        await client.query(
            `INSERT INTO refresh_tokens (token_hash, user_id, device, family_id, expires_at) VALUES ($1, $2, $3, $4, $5)`,
            [newTokenHash, currentToken.user_id, currentToken.device || 'web', currentToken.family_id, newExpiresAt]
        );

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Auth] 💥 Rotation Failed: ${err.message}`);
        return res.status(500).json({ success: false, message: 'Token rotation failed' });
    } finally {
        client.release();
    }

    // Issue New Access Token
    const isMobileOrGuard = currentToken.role === 'security_guard' || currentToken.device === 'mobile';
    const tokenExpiry = isMobileOrGuard ? '30d' : (process.env.JWT_EXPIRES || '8h');

    if (!process.env.JWT_SECRET) {
        console.error('[CRITICAL] JWT_SECRET is not defined in environment variables!');
        return res.status(500).json({ message: 'Server misconfiguration: JWT_SECRET missing' });
    }

    const newAccessToken = jwt.sign(
        {
            id: currentToken.user_id,
            role: currentToken.role,
            username: currentToken.username,
            email: currentToken.email,
            hospital_id: currentToken.hospital_id || 1
        },
        process.env.JWT_SECRET,
        {
            expiresIn: tokenExpiry,
            issuer: process.env.JWT_ISSUER || 'wolf-hms',
            audience: process.env.JWT_AUDIENCE || 'wolf-hms-api'
        }
    );

    // Send New Cookie if res.cookie is available
    const isProduction = process.env.NODE_ENV === 'production';
    if (res.cookie) {
        res.cookie('refreshToken', newRawRefreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'None' : 'Lax',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });
    }

    return res.status(200).json({
        success: true,
        token: newAccessToken,
        refreshToken: newRawRefreshToken
    });
});

// [AUTH] Logout (Revoke refresh token)
const logout = asyncHandler(async (req, res) => {
    const rawRefreshToken = req.body?.refreshToken || req.cookies?.refreshToken || req.headers['x-refresh-token'];

    if (rawRefreshToken) {
        const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
        await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1', [tokenHash]).catch(() => {});
    }

    const isProduction = process.env.NODE_ENV === 'production';
    if (res.clearCookie) {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'None' : 'Lax'
        });
    }

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
});

module.exports = {
    login,
    getUsers,
    register,
    updateUserStatus,
    demoLogin,
    forgotPassword,
    resetPassword,
    registerPublic,
    getPendingUsers,
    updateApprovalStatus,
    initiateRecovery,
    completeRecovery,
    setupSecurityProfile,
    updateProfile,
    updateSecurityQuestions,
    updateUser,
    resetUserPassword,
    deleteUser,
    refreshToken,
    logout
};
