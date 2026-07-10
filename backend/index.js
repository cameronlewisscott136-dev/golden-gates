const dotenv = require('dotenv');
const path = require('path');
const dns = require('dns');

// FORCE IPv4 - Must be at the VERY TOP
dns.setDefaultResultOrder('ipv4first');

// Load environment variables
if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: path.join(__dirname, '.env.production') });
} else {
    dotenv.config();
}

const mongoose = require('mongoose');
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name}`);
    } catch (error) {
        console.error(`❌ MongoDB Error: ${error.message}`);
        process.exit(1);
    }
};

// Start server
const startServer = async () => {
    await connectDB();

    const server = app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🔗 API: http://localhost:${PORT}/api`);
        console.log(`📊 Environment: ${process.env.NODE_ENV}`);
        console.log(`🌐 DNS Resolution Order: ${dns.getDefaultResultOrder()}`);
        console.log(`🔒 Trust Proxy: Enabled (1)`);
    });

    // Graceful shutdown
    const shutdown = () => {
        console.log('🔄 Shutting down...');
        server.close(() => {
            mongoose.connection.close();
            process.exit(0);
        });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('unhandledRejection', (err) => {
        console.error('Unhandled Rejection:', err);
        shutdown();
    });
};

startServer();