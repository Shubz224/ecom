const { body, param, query } = require('express-validator');

// ============ VALIDATION MIDDLEWARE ============

// User Registration Validation
const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
    
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
  body('phone')
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit Indian mobile number'),
    
  body('address.pincode')
    .optional()
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be 6 digits')
];

// User Login Validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Refresh Token Validation
const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

// Profile Update Validation
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
    
  body('phone')
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit mobile number'),
    
  body('address.pincode')
    .optional()
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be 6 digits')
];

// Password Change Validation
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
    
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Product Creation Validation
const validateProductCreation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Product name must be between 3 and 100 characters'),
    
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
    
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
    
  body('category')
    .isIn(['electronics', 'clothing', 'books', 'home', 'sports', 'beauty'])
    .withMessage('Please select a valid category'),
    
  body('brand')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Brand is required and must not exceed 50 characters'),
    
  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
    
  body('images')
    .isArray({ min: 1 })
    .withMessage('At least one product image is required'),
    
  body('images.*.url')
    .isURL()
    .withMessage('Each image must have a valid URL')
];

// Product Update Validation
const validateProductUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Product name must be between 3 and 100 characters'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
    
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
    
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer')
];

// Cart Item Validation
const validateCartItem = [
  body('productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
    
  body('quantity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantity must be between 1 and 10'),
    
  body('variantId')
    .optional()
    .isMongoId()
    .withMessage('Valid variant ID is required')
];

// Cart Update Validation
const validateCartUpdate = [
  body('quantity')
    .isInt({ min: 0, max: 10 })
    .withMessage('Quantity must be between 0 and 10'),
    
  param('itemId')
    .isMongoId()
    .withMessage('Valid item ID is required')
];

// Order Creation Validation
const validateOrderCreation = [
  body('shippingAddress.name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
    
  body('shippingAddress.phone')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit mobile number'),
    
  body('shippingAddress.address')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Address must be between 10 and 200 characters'),
    
  body('shippingAddress.city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
    
  body('shippingAddress.state')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters'),
    
  body('shippingAddress.pincode')
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be 6 digits'),
    
  body('paymentMethod')
    .isIn(['razorpay', 'cod', 'wallet'])
    .withMessage('Please select a valid payment method')
];

// Order Status Update Validation
const validateOrderStatusUpdate = [
  body('status')
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
    .withMessage('Please provide a valid order status'),
    
  body('note')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Note cannot exceed 200 characters')
];

// Review Creation Validation
const validateReviewCreation = [
  body('productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
    
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
    
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Review title cannot exceed 100 characters'),
    
  body('comment')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1000 characters'),
    
  body('orderId')
    .optional()
    .isMongoId()
    .withMessage('Valid order ID is required')
];

// Review Update Validation
const validateReviewUpdate = [
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
    
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Review title cannot exceed 100 characters'),
    
  body('comment')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1000 characters')
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateRefreshToken,
  validateProfileUpdate,
  validatePasswordChange,
  validateProductCreation,
  validateProductUpdate,
  validateCartItem,
  validateCartUpdate,
  validateOrderCreation,
  validateOrderStatusUpdate,
  validateReviewCreation,
  validateReviewUpdate
};
