const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser
} = require('../controllers/userController');

// Import validation middleware
const {
  validateRegistration,
  validateLogin,
  validateRefreshToken
} = require('../middlewares/validation');

// Import auth middleware
const { protect } = require('../middlewares/auth');

// ============ AUTHENTICATION ROUTES ============

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', validateRegistration, registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validateLogin, loginUser);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', validateRefreshToken, refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', protect, logoutUser);

module.exports = router;
