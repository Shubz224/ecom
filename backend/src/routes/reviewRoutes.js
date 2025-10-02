const express = require('express');
const router = express.Router();
const {
  createReview,
  getProductReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  markReviewHelpful
} = require('../controllers/reviewController');

// Import middlewares
const { protect } = require('../middlewares/auth');
const {
  validateReviewCreation,
  validateReviewUpdate
} = require('../middlewares/validation');

// ============ REVIEW ROUTES ============

/**
 * @route   GET /api/reviews/product/:productId
 * @desc    Get reviews for a product
 * @access  Public
 */
router.get('/product/:productId', getProductReviews);

/**
 * @route   GET /api/reviews/my-reviews
 * @desc    Get user's reviews
 * @access  Private
 */
router.get('/my-reviews', protect, getUserReviews);

/**
 * @route   POST /api/reviews
 * @desc    Create product review
 * @access  Private
 */
router.post('/', protect, validateReviewCreation, createReview);

/**
 * @route   PUT /api/reviews/:id
 * @desc    Update review
 * @access  Private
 */
router.put('/:id', protect, validateReviewUpdate, updateReview);

/**
 * @route   DELETE /api/reviews/:id
 * @desc    Delete review
 * @access  Private
 */
router.delete('/:id', protect, deleteReview);

/**
 * @route   PUT /api/reviews/:id/helpful
 * @desc    Mark review as helpful
 * @access  Private
 */
router.put('/:id/helpful', protect, markReviewHelpful);

module.exports = router;
