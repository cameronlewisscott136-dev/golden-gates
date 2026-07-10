const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const tradeRoutes = require('./routes/tradeRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const referralRoutes = require('./routes/referralRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// Trust proxy for production
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// Compression
app.use(compression());

// Security headers (relaxed for CORS)
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
}));

// ============================================
// CORS - COMPLETE CONFIGURATION
// ============================================

// Option 1: Allow all origins (Simplest, works everywhere)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['*'],
    exposedHeaders: ['*'],
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Handle preflight requests explicitly
app.options('*', cors());

// ============================================
// OR Option 2: Dynamic CORS with logging
// ============================================
// const allowedOrigins = [
//   'https://golden-gates-7xw983mw8-cameronlewisscott136-devs-projects.vercel.app',
//   'https://golden-gates-1dqw.onrender.com',
//   'http://localhost:3000',
//   'http://localhost:5173',
//   process.env.FRONTEND_URL || '',
//   ...(process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
// ].filter(Boolean);

// app.use(cors({
//   origin: function (origin, callback) {
//     // Allow requests with no origin (like mobile apps or curl)
//     if (!origin) {
//       console.log('✅ No origin, allowing');
//       return callback(null, true);
//     }

//     console.log(`🔍 CORS request from: ${origin}`);

//     // Check if origin is allowed
//     if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
//       console.log(`✅ CORS allowed: ${origin}`);
//       callback(null, true);
//     } else {
//       console.warn(`❌ CORS blocked: ${origin}`);
//       console.warn(`📋 Allowed origins: ${allowedOrigins.join(', ')}`);
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
//   exposedHeaders: ['Content-Range', 'X-Content-Range'],
//   maxAge: 86400
// }));

// ============================================
// Additional CORS middleware for all routes
// ============================================
app.use((req, res, next) => {
    // Set CORS headers for all responses
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Forwarded-For');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Expose-Headers', 'Content-Length, X-Kuma-Revision');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        console.log('📡 Preflight request handled:', req.url);
        return res.status(204).end();
    }

    next();
});

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// Rate limiting (disabled validation for proxies)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests' },
    validate: { trustProxy: false, xForwardedForHeader: false }
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many auth attempts' },
    validate: { trustProxy: false, xForwardedForHeader: false }
});

app.use('/api', limiter);
app.use('/api/auth', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/payments', paymentRoutes);

// Health check with explicit CORS headers
app.get('/api/health', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.json({
        success: true,
        message: 'Golden Gates API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        cors: 'enabled for all origins'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    const status = err.statusCode || 500;
    res.status(status).json({
        success: false,
        message: err.message || 'Server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

module.exports = app;