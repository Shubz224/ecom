// ============ GLOBAL ERROR HANDLING MIDDLEWARE ============

/**
 * Handle 404 - Route Not Found
 * This runs when no route matches the request
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Global Error Handler
 * This catches all errors in the application
 */
const errorHandler = (err, req, res, next) => {
  // Default to 500 server error
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // ============ MONGOOSE ERRORS ============
  
  // Mongoose bad ObjectId (Invalid ID format)
  if (err.name === 'CastError') {
    message = 'Invalid ID format';
    statusCode = 400;
  }

  // Mongoose duplicate key error (Email/Phone already exists)
  if (err.code === 11000) {
    statusCode = 400;
    
    // Extract field name from error
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(val => val.message).join(', ');
    statusCode = 400;
  }

  // ============ JWT ERRORS ============
  
  // Invalid JWT token
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token. Please login again.';
    statusCode = 401;
  }

  // Expired JWT token
  if (err.name === 'TokenExpiredError') {
    message = 'Token expired. Please login again.';
    statusCode = 401;
  }

  // ============ MULTER ERRORS (for file uploads later) ============
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    message = 'File size too large';
    statusCode = 400;
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    message = 'Too many files uploaded';
    statusCode = 400;
  }

  // ============ CUSTOM APP ERRORS ============
  
  // Handle custom application errors
  if (err.name === 'AppError') {
    message = err.message;
    statusCode = err.statusCode || 500;
  }

  // ============ LOGGING ============
  
  // Log error details (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.error('🚨 ERROR DETAILS:');
    console.error('📍 URL:', req.originalUrl);
    console.error('🔧 Method:', req.method);
    console.error('💻 IP:', req.ip);
    console.error('📝 Message:', err.message);
    console.error('📚 Stack:', err.stack);
    console.error('─'.repeat(50));
  } else {
    // In production, just log essential info
    console.error(`❌ ${new Date().toISOString()} - ${err.message}`);
  }

  // ============ SEND ERROR RESPONSE ============
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      error: err,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method
    })
  });
};

// ============ ASYNC ERROR HANDLER ============

/**
 * Wrapper for async functions to catch errors
 * Usage: asyncHandler(async (req, res, next) => { ... })
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ============ CUSTOM ERROR CLASS ============

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// ============ COMMON ERROR CREATORS ============

/**
 * Create a 400 Bad Request error
 */
const createBadRequestError = (message = 'Bad Request') => {
  return new AppError(message, 400);
};

/**
 * Create a 401 Unauthorized error
 */
const createUnauthorizedError = (message = 'Unauthorized') => {
  return new AppError(message, 401);
};

/**
 * Create a 403 Forbidden error
 */
const createForbiddenError = (message = 'Forbidden') => {
  return new AppError(message, 403);
};

/**
 * Create a 404 Not Found error
 */
const createNotFoundError = (message = 'Not Found') => {
  return new AppError(message, 404);
};

/**
 * Create a 409 Conflict error
 */
const createConflictError = (message = 'Conflict') => {
  return new AppError(message, 409);
};

/**
 * Create a 500 Internal Server error
 */
const createInternalServerError = (message = 'Internal Server Error') => {
  return new AppError(message, 500);
};

// ============ EXPORTS ============

module.exports = {
  notFound,
  errorHandler,
  asyncHandler,
  AppError,
  createBadRequestError,
  createUnauthorizedError,
  createForbiddenError,
  createNotFoundError,
  createConflictError,
  createInternalServerError
};
