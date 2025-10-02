const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyDiscount,
  validateCart,
  getCartSummary
} = require('../controllers/cartController');

// Import middlewares
const { protect } = require('../middlewares/auth');
const {
  validateCartItem,
  validateCartUpdate
} = require('../middlewares/validation');

// ============ CART ROUTES ============
// All cart routes require authentication

/**
 * @route   GET /api/cart
 * @desc    Get user's cart
 * @access  Private
 */
router.get('/', protect, getCart);

/**
 * @route   GET /api/cart/summary
 * @desc    Get cart summary
 * @access  Private
 */
router.get('/summary', protect, getCartSummary);

/**
 * @route   GET /api/cart/validate
 * @desc    Validate cart before checkout
 * @access  Private
 */
router.get('/validate', protect, validateCart);

/**
 * @route   POST /api/cart/add
 * @desc    Add item to cart
 * @access  Private
 */
router.post('/add', protect, validateCartItem, addToCart);

/**
 * @route   PUT /api/cart/update/:itemId
 * @desc    Update cart item quantity
 * @access  Private
 */
router.put('/update/:itemId', protect, validateCartUpdate, updateCartItem);

/**
 * @route   DELETE /api/cart/remove/:itemId
 * @desc    Remove item from cart
 * @access  Private
 */
router.delete('/remove/:itemId', protect, removeFromCart);

/**
 * @route   DELETE /api/cart/clear
 * @desc    Clear entire cart
 * @access  Private
 */
router.delete('/clear', protect, clearCart);

/**
 * @route   POST /api/cart/discount
 * @desc    Apply discount to cart
 * @access  Private
 */
router.post('/discount', protect, applyDiscount);

module.exports = router;
