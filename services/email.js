const nodemailer = require('nodemailer');

// Email configuration with retry logic
let transporter = null;
let isTransporterReady = false;

const initializeTransporter = () => {
    if (transporter && isTransporterReady) return transporter;

    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        },
        pool: {
            maxConnections: 5,
            maxMessages: 100,
            rateDelta: 4000,
            rateLimit: 14
        }
    });

    // Verify transporter on startup
    transporter.verify((error, success) => {
        if (error) {
            console.error("❌ Gmail Transporter Error:", error.message);
            isTransporterReady = false;
        } else {
            console.log("✅ Gmail Transporter Ready");
            isTransporterReady = true;
        }
    });

    return transporter;
};

// Initialize transporter on module load
initializeTransporter();

/**
 * Send OTP Email for signup verification
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<boolean>}
 */
const sendOTPEmail = async (email, otp) => {
    if (!email || !otp) {
        throw new Error("Email and OTP are required");
    }

    const mailOptions = {
        from: `"🌐 Blogify" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔐 Your Signup OTP - Blogify',
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 0;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #6366f1 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Verify Your Email</h1>
                </div>

                <!-- Body -->
                <div style="background: #f8f9fa; padding: 40px 20px; text-align: center;">
                    <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
                        Use this code to verify your Blogify account
                    </p>

                    <!-- OTP Code -->
                    <div style="background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; display: inline-block;">
                        <p style="font-size: 14px; color: #64748b; margin: 0 0 10px 0; letter-spacing: 2px;">VERIFICATION CODE</p>
                        <h1 style="font-size: 48px; letter-spacing: 8px; color: #6366f1; margin: 0; font-family: 'Courier New', monospace;">${otp}</h1>
                    </div>

                    <p style="color: #999; font-size: 14px; margin: 20px 0 0 0;">
                        ⏱️ This code expires in <strong>5 minutes</strong>
                    </p>
                </div>

                <!-- Footer -->
                <div style="background: white; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
                    <p style="color: #999; font-size: 12px; margin: 0;">
                        If you didn't request this, please ignore this email.
                    </p>
                    <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
                        © 2026 Blogify. All rights reserved.
                    </p>
                </div>
            </div>
        `
    };

    try {
        if (!isTransporterReady) {
            initializeTransporter();
        }

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ OTP Sent Successfully to ${email}`);
        return true;
    } catch (error) {
        console.error("❌ Failed to send OTP email to", email);
        console.error("Error:", error.message);
        throw error;
    }
};

/**
 * Send Notification Email (comments, likes, follows)
 * @param {string} email - Recipient email
 * @param {string} subject - Email subject
 * @param {object} data - Email data with title, message, link
 * @returns {Promise<boolean>}
 */
const sendNotificationEmail = async (email, subject, data) => {
    if (!email || !subject) {
        throw new Error("Email and subject are required");
    }

    const { title, message, actorName, actionType, link, icon } = data;

    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #6366f1 0%, #764ba2 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">${icon || '🔔'} ${title || 'New Notification'}</h1>
            </div>

            <!-- Body -->
            <div style="background: #f8f9fa; padding: 30px 20px;">
                <p style="color: #333; font-size: 16px; margin: 0 0 15px 0; line-height: 1.6;">
                    ${message || ''}
                </p>

                <% if (actorName) { %>
                    <p style="color: #666; font-size: 14px; margin: 15px 0; padding: 10px; background: white; border-left: 4px solid #6366f1; border-radius: 4px;">
                        <strong>${actorName}</strong>
                    </p>
                <% } %>

                <% if (link) { %>
                    <div style="text-align: center; margin: 25px 0;">
                        <a href="${link}" style="background: linear-gradient(135deg, #6366f1 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                            View ${actionType || 'Update'}
                        </a>
                    </div>
                <% } %>
            </div>

            <!-- Footer -->
            <div style="background: white; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                    You received this email because you have notifications enabled.
                </p>
                <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
                    © 2026 Blogify. All rights reserved.
                </p>
            </div>
        </div>
    `;

    const mailOptions = {
        from: `"🌐 Blogify" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: subject,
        html: html
    };

    try {
        if (!isTransporterReady) {
            initializeTransporter();
        }

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Notification Email Sent to ${email}`);
        return true;
    } catch (error) {
        console.error("❌ Failed to send notification email to", email);
        console.error("Error:", error.message);
        return false;
    }
};

/**
 * Send Password Reset Email
 * @param {string} email - Recipient email
 * @param {string} resetLink - Password reset link
 * @returns {Promise<boolean>}
 */
const sendPasswordResetEmail = async (email, resetLink) => {
    if (!email || !resetLink) {
        throw new Error("Email and reset link are required");
    }

    const mailOptions = {
        from: `"🌐 Blogify" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔑 Reset Your Blogify Password',
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 0;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #6366f1 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">🔑 Reset Password</h1>
                </div>

                <!-- Body -->
                <div style="background: #f8f9fa; padding: 40px 20px;">
                    <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
                        We received a request to reset your password. Click the button below to create a new password.
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="background: linear-gradient(135deg, #6366f1 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">
                            Reset Password
                        </a>
                    </div>

                    <p style="color: #666; font-size: 14px; margin: 20px 0 0 0; text-align: center;">
                        Or copy this link: <br>
                        <span style="word-break: break-all; color: #6366f1; font-size: 12px;">${resetLink}</span>
                    </p>

                    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 20px; border-radius: 4px;">
                        <p style="color: #856404; font-size: 14px; margin: 0;">
                            ⏱️ This link expires in <strong>1 hour</strong>. If you didn't request this, please ignore this email.
                        </p>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background: white; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
                    <p style="color: #999; font-size: 12px; margin: 0;">
                        © 2026 Blogify. All rights reserved.
                    </p>
                </div>
            </div>
        `
    };

    try {
        if (!isTransporterReady) {
            initializeTransporter();
        }

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Password Reset Email Sent to ${email}`);
        return true;
    } catch (error) {
        console.error("❌ Failed to send password reset email to", email);
        console.error("Error:", error.message);
        throw error;
    }
};

/**
 * Send Welcome Email
 * @param {string} email - Recipient email
 * @param {string} fullName - User's full name
 * @returns {Promise<boolean>}
 */
const sendWelcomeEmail = async (email, fullName) => {
    if (!email || !fullName) {
        throw new Error("Email and name are required");
    }

    const mailOptions = {
        from: `"🌐 Blogify" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '👋 Welcome to Blogify!',
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #6366f1 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 32px;">👋 Welcome, ${fullName}!</h1>
                </div>

                <!-- Body -->
                <div style="background: #f8f9fa; padding: 40px 20px;">
                    <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
                        We're excited to have you join Blogify! You're now part of a community of amazing writers and readers.
                    </p>

                    <h3 style="color: #333; margin: 30px 0 15px 0;">✨ Get Started:</h3>
                    <ul style="color: #666; font-size: 15px; margin: 0; padding-left: 20px; line-height: 1.8;">
                        <li>Complete your profile with a bio and profile picture</li>
                        <li>Write your first blog post</li>
                        <li>Explore and read other amazing stories</li>
                        <li>Connect with other writers and readers</li>
                    </ul>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.APP_URL || 'https://blogifyer.com'}/" style="background: linear-gradient(135deg, #6366f1 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">
                            Start Blogging
                        </a>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background: white; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
                    <p style="color: #999; font-size: 12px; margin: 0;">
                        © 2026 Blogify. All rights reserved.
                    </p>
                </div>
            </div>
        `
    };

    try {
        if (!isTransporterReady) {
            initializeTransporter();
        }

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Welcome Email Sent to ${email}`);
        return true;
    } catch (error) {
        console.error("❌ Failed to send welcome email to", email);
        console.error("Error:", error.message);
        return false;
    }
};

module.exports = { 
    sendOTPEmail,
    sendNotificationEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail
};
