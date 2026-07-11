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
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// ============================================
// CORS - WORKING CONFIGURATION
// ============================================

// Allow all origins with credentials
app.use((req, res, next) => {
    const origin = req.headers.origin;

    // Always set the specific origin (not '*') when credentials are used
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    next();
});

// Also use cors package as backup with dynamic origin
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin
        if (!origin) {
            return callback(null, true);
        }
        // Allow all origins
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests' },
    validate: { trustProxy: false, xForwardedForHeader: false },
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
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.json({
        success: true,
        message: 'Golden Gates API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        cors: 'enabled'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    const status = err.statusCode || 500;
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.status(status).json({
        success: false,
        message: err.message || 'Server error'
    });
});

// 404 handler
app.use((req, res) => {
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

module.exports = app;