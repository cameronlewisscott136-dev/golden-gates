const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../src/models/User');

dotenv.config({ path: path.join(__dirname, '../.env') });

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Create admin user
        const adminEmail = 'admin@goldengates.com';
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log('ℹ️ Admin already exists:', adminEmail);
            process.exit(0);
        }

        const admin = new User({
            email: adminEmail,
            phone: '0700000000',
            password: 'Admin@123456',
            firstName: 'Admin',
            lastName: 'User',
            isVerified: true,
            isActive: true,
            isAdmin: true,
            balance: 0,
            referralCode: 'ADMIN1234'
        });

        await admin.save();
        console.log('✅ Admin user created successfully!');
        console.log(`📧 Email: ${adminEmail}`);
        console.log(`🔑 Password: Admin@123456`);
        console.log('⚠️ Please change password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();