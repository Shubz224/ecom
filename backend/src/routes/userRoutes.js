const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  changePassword,
  getAllUsers,
  updateUserStatus
} = require('../controllers/userController');

// Import middlewares
const { protect, adminOnly } = require('../middlewares/auth');
const {
  validateProfileUpdate,
  validatePasswordChange
} = require('../middlewares/validation');

// ============ USER ROUTES ============

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', protect, getUserProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', protect, validateProfileUpdate, updateUserProfile);

/**
 * @route   PUT /api/users/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', protect, validatePasswordChange, changePassword);

// ============ ADMIN ROUTES ============

/**
 * @route   GET /api/users
 * @desc    Get all users (Admin only)
 * @access  Private/Admin
 */
router.get('/', protect, adminOnly, getAllUsers);

/**
 * @route   PUT /api/users/:id/status
 * @desc    Update user status (Admin only)
 * @access  Private/Admin
 */
router.put('/:id/status', protect, adminOnly, updateUserStatus);

module.exports = router;
