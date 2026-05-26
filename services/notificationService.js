const Notification = require("../models/Notification");
const nodemailer = require("nodemailer");

// Initialize email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

class NotificationService {
    // Create in-app notification
    static async createNotification(recipientId, type, data) {
        try {
            if (!recipientId) {
                console.warn("⚠️ Warning: recipientId is required");
                return null;
            }

            const notification = await Notification.create({
                recipient: recipientId,
                type,
                title: data.title || "Notification",
                message: data.message || "",
                blog: data.blog || null,
                actor: data.actor || null
            });
            return notification;
        } catch (error) {
            console.error("❌ Error creating notification:", error);
            return null;
        }
    }

    // Send Email Notification
    static async sendEmailNotification(user, type, data) {
        try {
            if (!user || !user.email) {
                console.warn("⚠️ Warning: user or user.email is missing");
                return false;
            }

            if (!user?.notificationSettings) {
                console.warn("⚠️ Warning: User has no notification settings");
                return false;
            }

            const settingsMap = {
                comment: "emailOnComment",
                reply: "emailOnComment",
                like: "emailOnLike",
                follow: "emailOnNewFollower"
            };

            const settingKey = settingsMap[type];
            if (settingKey && !user.notificationSettings[settingKey]) {
                console.info(`ℹ️ User disabled notifications for: ${type}`);
                return false;
            }

            const templates = {
                comment: {
                    subject: `New comment on "${data.blogTitle || 'your blog'}"`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #6366f1;">New Comment</h2>
                            <p><strong>${data.actorName || 'Someone'}</strong> commented on your blog:</p>
                            <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #6366f1;">
                                "${data.comment ? data.comment.substring(0, 150) : 'No content'}..."
                            </blockquote>
                            <a href="${process.env.APP_URL || 'http://localhost:8000'}/blogs/${data.blogId}" 
                               style="background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                View Blog
                            </a>
                        </div>
                    `
                },
                like: {
                    subject: `❤️ Someone liked your blog "${data.blogTitle || 'your blog'}"`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #6366f1;">❤️ New Like</h2>
                            <p><strong>${data.actorName || 'Someone'}</strong> liked your blog.</p>
                            <a href="${process.env.APP_URL || 'http://localhost:8000'}/blogs/${data.blogId}" 
                               style="background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                View Blog
                            </a>
                        </div>
                    `
                },
                follow: {
                    subject: `👤 ${data.actorName || 'Someone'} started following you!`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #6366f1;">New Follower</h2>
                            <p><strong>${data.actorName || 'Someone'}</strong> started following you.</p>
                            <a href="${process.env.APP_URL || 'http://localhost:8000'}/user/profile" 
                               style="background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                View Profile
                            </a>
                        </div>
                    `
                }
            };

            const template = templates[type] || templates.comment;

            const mailOptions = {
                from: `"Blogify" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: template.subject,
                html: template.html
            };

            await transporter.sendMail(mailOptions);
            console.log(`✅ Email notification sent to ${user.email}`);
            return true;
        } catch (error) {
            console.error("❌ Error sending email notification:", error);
            return false;
        }
    }

    // Get notifications with better error handling
    static async getUserNotifications(userId, limit = 10, page = 1) {
        try {
            if (!userId) {
                throw new Error("User ID is required");
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            const notifications = await Notification.find({ recipient: userId })
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .skip(skip)
                .populate("actor", "fullName profileImageURL")
                .populate("blog", "title slug");

            const total = await Notification.countDocuments({ recipient: userId });

            return { 
                notifications, 
                total, 
                pages: Math.ceil(total / limit) 
            };
        } catch (error) {
            console.error("❌ Error getting notifications:", error);
            return { notifications: [], total: 0, pages: 0 };
        }
    }

    // Mark single notification as read
    static async markAsRead(notificationId) {
        try {
            if (!notificationId) {
                throw new Error("Notification ID is required");
            }

            const result = await Notification.findByIdAndUpdate(
                notificationId, 
                { isRead: true },
                { new: true }
            );

            if (!result) {
                throw new Error("Notification not found");
            }

            return result;
        } catch (error) {
            console.error("❌ Error marking notification as read:", error);
            throw error;
        }
    }

    // Mark all notifications as read for a user
    static async markAllAsRead(userId) {
        try {
            if (!userId) {
                throw new Error("User ID is required");
            }

            const result = await Notification.updateMany(
                { recipient: userId, isRead: false },
                { isRead: true }
            );

            return result;
        } catch (error) {
            console.error("❌ Error marking all notifications as read:", error);
            throw error;
        }
    }

    // Get unread count
    static async getUnreadCount(userId) {
        try {
            if (!userId) {
                throw new Error("User ID is required");
            }

            const count = await Notification.countDocuments({ 
                recipient: userId, 
                isRead: false 
            });

            return count;
        } catch (error) {
            console.error("❌ Error getting unread count:", error);
            return 0;
        }
    }

    // Delete old notifications (optional cleanup)
    static async deleteOldNotifications(userId, daysOld = 30) {
        try {
            const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
            
            const result = await Notification.deleteMany({
                recipient: userId,
                createdAt: { $lt: cutoffDate }
            });

            console.log(`✅ Deleted ${result.deletedCount} old notifications`);
            return result;
        } catch (error) {
            console.error("❌ Error deleting old notifications:", error);
            return null;
        }
    }
}

module.exports = NotificationService;