const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import database connection
const connectDB = require('./src/config/database');

// Import routes directly
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const productRoutes = require('./src/routes/productRoutes');
const cartRoutes = require('./src/routes/cartRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');

// Import error handlers
const { errorHandler, notFound } = require('./src/middlewares/errorHandler');

// ============ CREATE EXPRESS APP ============
const app = express();

// ============ CONNECT TO DATABASE ============
connectDB();

// ============ MIDDLEWARE ============

// Security headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});
app.use('/api', limiter);

// ============ ROUTES ============

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 MERN E-commerce API is running!',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy! ✅',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);

// ============ ERROR HANDLING ============
app.use(notFound);
app.use(errorHandler);

// ============ START SERVER ============
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('');
  console.log('🎉 ================================');
  console.log('🚀 SERVER STARTED SUCCESSFULLY!');
  console.log('🎉 ================================');
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔗 Base URL: http://localhost:${PORT}`);
  console.log(`💊 Health: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('📚 Available Endpoints:');
  console.log('   • POST /api/auth/register');
  console.log('   • POST /api/auth/login');
  console.log('   • GET  /api/products');
  console.log('   • POST /api/cart/add');
  console.log('   • POST /api/orders');
  console.log('');
  console.log('🛑 Press CTRL+C to stop');
  console.log('================================');
});

// ============ GRACEFUL SHUTDOWN ============

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('❌ Unhandled Promise Rejection:', err.message);
  console.log('🛑 Shutting down server...');
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received');
  console.log('🛑 Shutting down gracefully');
  server.close(() => {
    console.log('💀 Process terminated');
  });
});

module.exports = app;
