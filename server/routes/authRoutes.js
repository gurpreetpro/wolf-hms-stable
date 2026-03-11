const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
    login, getUsers, register, updateUserStatus, demoLogin,
    registerPublic, getPendingUsers, updateApprovalStatus, initiateRecovery, completeRecovery, setupSecurityProfile,
    updateSecurityQuestions, updateUser, resetUserPassword, deleteUser, updateProfile, forgotPassword, resetPassword,
    refreshToken, logout
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validate, sanitize } = require('../middleware/validationMiddleware');

// Rate limiter for auth endpoints (max 10 attempts per 15 min per IP)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many attempts. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Public Routes (rate-limited)
router.post('/register-public', authLimiter, sanitize, validate('register'), registerPublic);
router.post('/recover-init', authLimiter, sanitize, initiateRecovery);
router.post('/recover-verify', authLimiter, sanitize, completeRecovery);
router.post('/forgot-password', authLimiter, sanitize, forgotPassword);
router.post('/reset-password', authLimiter, sanitize, resetPassword);

// Protected Routes
router.post('/login', authLimiter, sanitize, validate('login'), login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.post('/demo-login', demoLogin);
// router.get('/profile', protect, getProfile); // Added get profile route
router.post('/setup-security', protect, setupSecurityProfile); // User setting up their own questions
router.post('/update-security', protect, updateSecurityQuestions); // User updating questions from settings
router.put('/profile', protect, sanitize, updateProfile); // User updating own profile
router.get('/users', protect, getUsers);
router.post('/register', protect, sanitize, register); // Admin internal create
router.put('/users/:id/status', protect, sanitize, updateUserStatus);
router.put('/users/:id', protect, sanitize, updateUser);
router.put('/users/:id/reset-password', protect, sanitize, resetUserPassword);
router.delete('/users/:id', protect, deleteUser);

// Admin Approval Routes
router.get('/users/pending', protect, getPendingUsers);
router.put('/users/:id/approval', protect, updateApprovalStatus);

module.exports = router;
