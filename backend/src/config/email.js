const nodemailer = require('nodemailer');

// Create transporter - Force IPv4
const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        family: 4,
        tls: {
            rejectUnauthorized: false,
        },
    });
};

// Send verification email
const sendVerificationEmail = async (email, code) => {
    try {
        console.log(`📧 Sending verification email to ${email}`);

        const transporter = createTransporter();

        // Verify connection
        await transporter.verify();
        console.log('✅ SMTP connection verified');

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@goldengates.com',
            to: email,
            subject: '🔐 Golden Gates - Email Verification',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #facc15, #eab308); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: #1a1a1a; margin: 0;">✨ Golden Gates</h1>
            <p style="color: #4a4a4a; margin: 5px 0 0;">Trading Platform</p>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #1a1a1a;">Verify Your Email</h2>
            <p>Thank you for signing up! Use the code below to verify your email:</p>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; border: 2px dashed #eab308;">
              <span style="font-size: 36px; font-weight: bold; color: #ca8a04; letter-spacing: 5px;">${code}</span>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes.</p>
            <p style="color: #6b7280; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          </div>
        </div>
      `,
            text: `
        Golden Gates Trading Platform
        ---------------------------
        
        Verify Your Email Address
        
        Your verification code is: ${code}
        
        This code will expire in 10 minutes.
        
        If you didn't request this, please ignore this email.
        
        © 2024 Golden Gates Trading Platform
      `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
        return info;

    } catch (error) {
        console.error('❌ Email error:', error.message);
        throw new Error(`Failed to send verification email: ${error.message}`);
    }
};

// Send welcome email
const sendWelcomeEmail = async (email, firstName) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@goldengates.com',
            to: email,
            subject: '🎉 Welcome to Golden Gates!',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #facc15, #eab308); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: #1a1a1a; margin: 0;">🌟 Golden Gates</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #1a1a1a;">Welcome, ${firstName}! 🎉</h2>
            <p>Your account has been successfully activated. You're now ready to start your trading journey with Golden Gates!</p>
            <p><strong>What's next?</strong></p>
            <ul>
              <li>Explore the dashboard</li>
              <li>Make your first trade</li>
              <li>Invite friends and earn rewards</li>
            </ul>
            <div style="text-align: center; margin-top: 20px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #facc15, #eab308); color: #1a1a1a; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Go to Dashboard →
              </a>
            </div>
          </div>
        </div>
      `,
            text: `
        Welcome to Golden Gates, ${firstName}!
        
        Your account has been successfully activated. You're now ready to start your trading journey!
        
        What's next?
        - Explore the dashboard
        - Make your first trade
        - Invite friends and earn rewards
        
        Visit your dashboard: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard
        
        © 2024 Golden Gates Trading Platform
      `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Welcome email sent:', info.messageId);
        return info;

    } catch (error) {
        console.error('❌ Welcome email error:', error.message);
        return null;
    }
};

module.exports = {
    sendVerificationEmail,
    sendWelcomeEmail
};