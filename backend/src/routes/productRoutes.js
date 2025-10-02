const express = require('express');
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getProductsByCategory,
  searchProducts
} = require('../controllers/productController');

// Import middlewares
const { protect, adminOnly, optionalAuth } = require('../middlewares/auth');
const {
  validateProductCreation,
  validateProductUpdate
} = require('../middlewares/validation');

// ============ PUBLIC PRODUCT ROUTES ============

/**
 * @route   GET /api/products
 * @desc    Get all products with filters
 * @access  Public
 */
router.get('/', optionalAuth, getAllProducts);

/**
 * @route   GET /api/products/search
 * @desc    Search products
 * @access  Public
 */
router.get('/search', searchProducts);

/**
 * @route   GET /api/products/featured
 * @desc    Get featured products
 * @access  Public
 */
router.get('/featured', getFeaturedProducts);

/**
 * @route   GET /api/products/category/:category
 * @desc    Get products by category
 * @access  Public
 */
router.get('/category/:category', getProductsByCategory);

/**
 * @route   GET /api/products/:id
 * @desc    Get single product
 * @access  Public
 */
router.get('/:id', optionalAuth, getProductById);

// ============ ADMIN PRODUCT ROUTES ============

/**
 * @route   POST /api/products
 * @desc    Create new product (Admin only)
 * @access  Private/Admin
 */
router.post('/', protect, adminOnly, validateProductCreation, createProduct);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product (Admin only)
 * @access  Private/Admin
 */
router.put('/:id', protect, adminOnly, validateProductUpdate, updateProduct);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product (Admin only)
 * @access  Private/Admin
 */
router.delete('/:id', protect, adminOnly, deleteProduct);

module.exports = router;
