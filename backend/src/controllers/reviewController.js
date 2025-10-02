const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { validationResult } = require('express-validator');

// ============ REVIEW CONTROLLER ============

/**
 * @desc    Create product review
 * @route   POST /api/reviews
 * @access  Private
 */
const createReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { productId, rating, title, comment, orderId } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      user: req.user._id,
      product: productId
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Verify purchase if orderId provided
    let verifiedPurchase = false;
    if (orderId) {
      const order = await Order.findOne({
        _id: orderId,
        user: req.user._id,
        orderStatus: 'delivered',
        'items.product': productId
      });

      if (order) {
        verifiedPurchase = true;
      }
    }

    // Create review
    const review = new Review({
      user: req.user._id,
      product: productId,
      order: orderId,
      rating,
      title,
      comment,
      isVerified: verifiedPurchase
    });

    await review.save();

    // Populate user details
    await review.populate('user', 'name');

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: {
        review
      }
    });

  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get reviews for a product
 * @route   GET /api/reviews/product/:productId
 * @access  Public
 */
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build sort option
    let sortOption = { createdAt: -1 };
    if (req.query.sort === 'rating-high') {
      sortOption = { rating: -1, createdAt: -1 };
    } else if (req.query.sort === 'rating-low') {
      sortOption = { rating: 1, createdAt: -1 };
    } else if (req.query.sort === 'helpful') {
      sortOption = { helpfulVotes: -1, createdAt: -1 };
    }

    // Filter by rating
    let query = {
      product: productId,
      isActive: true,
      isApproved: true
    };

    if (req.query.rating) {
      query.rating = parseInt(req.query.rating);
    }

    const reviews = await Review.find(query)
      .populate('user', 'name')
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const totalReviews = await Review.countDocuments(query);

    // Get rating statistics
    const ratingStats = await Review.getAverageRating(productId);

    res.status(200).json({
      success: true,
      message: 'Product reviews retrieved successfully',
      data: {
        reviews,
        ratingStats,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalReviews / limit),
          totalReviews,
          hasNextPage: page < Math.ceil(totalReviews / limit),
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get user's reviews
 * @route   GET /api/reviews/my-reviews
 * @access  Private
 */
const getUserReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Review.findByUser(req.user._id)
      .skip(skip)
      .limit(limit);

    const totalReviews = await Review.countDocuments({
      user: req.user._id,
      isActive: true
    });

    res.status(200).json({
      success: true,
      message: 'User reviews retrieved successfully',
      data: {
        reviews,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalReviews / limit),
          totalReviews
        }
      }
    });

  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Update review
 * @route   PUT /api/reviews/:id
 * @access  Private
 */
const updateReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns this review
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { rating, title, comment } = req.body;

    review.rating = rating || review.rating;
    review.title = title || review.title;
    review.comment = comment || review.comment;

    await review.save();

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: {
        review
      }
    });

  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Delete review
 * @route   DELETE /api/reviews/:id
 * @access  Private
 */
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns this review or is admin
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await review.remove();

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Mark review as helpful
 * @route   PUT /api/reviews/:id/helpful
 * @access  Private
 */
const markReviewHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    await review.markHelpful();

    res.status(200).json({
      success: true,
      message: 'Review marked as helpful',
      data: {
        review
      }
    });

  } catch (error) {
    console.error('Mark review helpful error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  createReview,
  getProductReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  markReviewHelpful
};
