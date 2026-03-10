const express = require('express');
const router = express.Router();
const { login, getUsers, register } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validate, sanitize } = require('../middleware/validationMiddleware');

// Legacy/RESTful routes for /api/users

// POST /api/users/login
router.post('/login', sanitize, validate('login'), login);

// GET /api/users (List users)
router.get('/', protect, getUsers);

// POST /api/users (Create user)
router.post('/', protect, sanitize, register);

module.exports = router;
