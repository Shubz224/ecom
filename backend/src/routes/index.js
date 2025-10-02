const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const cartRoutes = require('./cartRoutes');
const orderRoutes = require('./orderRoutes');
const reviewRoutes = require('./reviewRoules');
const categoryRoutes = require('./categoryRoutes');

// ============ API ROUTES ============

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running successfully',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mount routes
router.use('/auth', authRoutes);        // /api/auth/*
router.use('/users', userRoutes);       // /api/users/*
router.use('/products', productRoutes); // /api/products/*
router.use('/cart', cartRoutes);        // /api/cart/*
router.use('/orders', orderRoutes);     // /api/orders/*
router.use('/reviews', reviewRoutes);   // /api/reviews/*
router.use('/categories', categoryRoutes); // /api/categories/*

// 404 handler for undefined routes
router.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /api/health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/products',
      'GET /api/categories'
    ]
  });
});

module.exports = router;
