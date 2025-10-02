const express = require('express');
const router = express.Router();
const {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  getAllOrders,
  updatePaymentStatus,
  getOrderStats
} = require('../controllers/orderController');

// Import middlewares
const { protect, adminOnly } = require('../middlewares/auth');
const {
  validateOrderCreation,
  validateOrderStatusUpdate
} = require('../middlewares/validation');

// ============ USER ORDER ROUTES ============

/**
 * @route   GET /api/orders
 * @desc    Get user's orders
 * @access  Private
 */
router.get('/', protect, getUserOrders);

/**
 * @route   POST /api/orders
 * @desc    Create new order
 * @access  Private
 */
router.post('/', protect, validateOrderCreation, createOrder);

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order
 * @access  Private
 */
router.get('/:id', protect, getOrderById);

/**
 * @route   PUT /api/orders/:id/cancel
 * @desc    Cancel order
 * @access  Private
 */
router.put('/:id/cancel', protect, cancelOrder);

// ============ ADMIN ORDER ROUTES ============

/**
 * @route   GET /api/orders/admin/all
 * @desc    Get all orders (Admin only)
 * @access  Private/Admin
 */
router.get('/admin/all', protect, adminOnly, getAllOrders);

/**
 * @route   GET /api/orders/admin/stats
 * @desc    Get order statistics (Admin only)
 * @access  Private/Admin
 */
router.get('/admin/stats', protect, adminOnly, getOrderStats);

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (Admin only)
 * @access  Private/Admin
 */
router.put('/:id/status', protect, adminOnly, validateOrderStatusUpdate, updateOrderStatus);

/**
 * @route   PUT /api/orders/:id/payment
 * @desc    Update payment status (Admin/Payment Gateway)
 * @access  Private/Admin
 */
router.put('/:id/payment', protect, adminOnly, updatePaymentStatus);

module.exports = router;
