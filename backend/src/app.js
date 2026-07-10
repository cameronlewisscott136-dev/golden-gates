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

// ============================================
// CRITICAL: CORS MUST BE THE FIRST MIDDLEWARE
// ============================================

// 1. First - Handle OPTIONS requests for ALL routes
app.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(204).end();
});

// 2. Second - CORS middleware for all requests
app.use((req, res, next) => {
    // Allow all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Log CORS requests for debugging
    if (req.method === 'OPTIONS') {
        console.log('📡 OPTIONS request:', req.url);
        return res.status(204).end();
    }

    next();
});

// 3. Third - Use cors package as backup
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// 4. Now add other middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
}));

app.use(compression());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests' },
    validate: { trustProxy: false, xForwardedForHeader: false },
    // Skip rate limiting for OPTIONS requests
    skip: (req) => req.method === 'OPTIONS',
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many auth attempts' },
    validate: { trustProxy: false, xForwardedForHeader: false },
    skip: (req) => req.method === 'OPTIONS',
});

app.use('/api', limiter);
app.use('/api/auth', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({
        success: true,
        message: 'Golden Gates API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        cors: 'enabled',
        headers: req.headers
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    const status = err.statusCode || 500;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(status).json({
        success: false,
        message: err.message || 'Server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

module.exports = app;