const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const AuditService = require('../services/AuditService');

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
        return ResponseHandler.error(res, 'Incorrect username or password. Please try again.', 401);
    }

    // Include hospital_id in JWT for multi-tenancy
    console.log('[Auth] 🔑 Generating JWT...');
    const token = jwt.sign(
        { 
            id: user.id, 
            role: user.role, 
            username: user.username,
            email: user.email, // Required for platform owner check
            hospital_id: user.hospital_id || 1 // Default to 1 for backward compatibility
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' } // Short lived 15m
    );

    // [AUTH] Refresh Token Rotation (HttpOnly Cookie)
    try {
        const refreshToken = crypto.randomBytes(40).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        
        await pool.query(
            `INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)`,
            [refreshToken, user.id, expiresAt]
        );

        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'None' : 'Lax', // None required for cross-site (if frontend/backend on diff domains)
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        console.log(`[Auth] 🍪 Refresh Token set for ${user.username}`);
    } catch (rtErr) {
        console.error(`[Auth] ⚠️ Failed to set Refresh Token: ${rtErr.message}`);
        // Non-fatal, user just won't stay logged in
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

    const responseData = {
        token,
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

    const token = jwt.sign(
        { id: user.id, role: user.role, username: user.username },
        process.env.JWT_SECRET || 'secret_key',
        { expiresIn: '1d' }
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

// [AUTH] Refresh Access Token
const refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
        return ResponseHandler.error(res, 'Refresh Token Required', 401);
    }

    // Find token with User details
    const result = await pool.query(
        `SELECT rt.*, u.username, u.email, u.role, u.hospital_id, u.full_name, u.department, u.is_active 
         FROM refresh_tokens rt
         JOIN users u ON rt.user_id = u.id
         WHERE rt.token = $1`,
        [refreshToken]
    );

    if (result.rows.length === 0) {
        console.warn('[Auth] ⚠️ Invalid Refresh Token Attempt');
        return ResponseHandler.error(res, 'Invalid Refresh Token', 403);
    }

    const currentToken = result.rows[0];

    // Reuse Detection
    if (currentToken.is_revoked) {
        console.warn(`[Auth] 🚨 REUSE DETECTED! User ${currentToken.username} (${currentToken.user_id}) using revoked token.`);
        // Revoke ALL tokens for this user to force re-login
        await pool.query('UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1', [currentToken.user_id]);
        return ResponseHandler.error(res, 'Security Alert: Token Reused. Please login again.', 403);
    }

    // Expiration Check
    if (new Date() > new Date(currentToken.expires_at)) {
        return ResponseHandler.error(res, 'Refresh Token Expired', 403);
    }

    // User Status Check
    if (!currentToken.is_active) {
         return ResponseHandler.error(res, 'User Account is Inactive', 403);
    }

    // Rotation: Issue New Tokens
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Transaction: Revoke Old -> Insert New
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Revoke current
        await client.query(
            'UPDATE refresh_tokens SET is_revoked = true, replaced_by = $1 WHERE id = $2',
            [newRefreshToken, currentToken.id]
        );

        // Insert new
        await client.query(
            `INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)`,
            [newRefreshToken, currentToken.user_id, newExpiresAt]
        );

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Auth] 💥 Rotation Failed: ${err.message}`);
        return ResponseHandler.error(res, 'Token Rotation Failed', 500);
    } finally {
        client.release();
    }

    // Issue New Access Token
    const newAccessToken = jwt.sign(
        { 
            id: currentToken.user_id, 
            role: currentToken.role, 
            username: currentToken.username,
            email: currentToken.email,
            hospital_id: currentToken.hospital_id || 1 
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );

    // Send New Cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'None' : 'Lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    ResponseHandler.success(res, { token: newAccessToken });
});

// [AUTH] Logout
const logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies;
    
    if (refreshToken) {
        // Best effort revoke
        await pool.query('UPDATE refresh_tokens SET is_revoked = true WHERE token = $1', [refreshToken]);
    }

    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'None' : 'Lax'
    });

    ResponseHandler.success(res, { message: 'Logged out successfully' });
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
