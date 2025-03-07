// services/notificationService.js
const User = require('../models/User');

class NotificationService {
  // We pass in our socket.io instance and the firebase-admin object so we can use them in our functions.
  static init({ io, admin }) {
    this.io = io;
    this.admin = admin;
  }

  // (1) Notify the user who created the report when their report is updated.
  static async notifyReportChange(report) {
    try {
      const user = await User.findById(report.user_id);
      if (!user) return;
      // Assume the user has a deviceToken stored
      const deviceToken = user.deviceToken;
      const payload = {
        notification: {
          title: "Report Update",
          body: "Your report has been updated.",
        },
        data: {
          reportId: report._id.toString(),
        },
      };
      if (deviceToken) {
        await this.admin.messaging().sendToDevice(deviceToken, payload);
        console.log(`Push notification sent to user ${user._id} for report update.`);
      }
    } catch (error) {
      console.error("Error notifying report change:", error);
    }
  }

  // (2) Notify all users in a subcity when an announcement is created.
  static async notifyAnnouncement(announcement) {
    try {
      const users = await User.find({ subcity: announcement.subcity, role: "user" });
      const payload = {
        notification: {
          title: announcement.title,
          body: announcement.text,
        },
        data: {
          announcementId: announcement._id.toString(),
        },
      };
      // Send push notifications (FCM) to mobile users that have a device token.
      const tokens = users.map(u => u.deviceToken).filter(Boolean);
      if (tokens.length > 0) {
        await this.admin.messaging().sendToDevice(tokens, payload);
        console.log(`Push notifications sent for announcement in ${announcement.subcity}`);
      }
      // Also emit a socket event to clients that are connected (if applicable)
      this.io.to(announcement.subcity).emit("announcement", payload);
    } catch (error) {
      console.error("Error notifying announcement:", error);
    }
  }

  // (3) Notify verifiers when a new report is created in their subcity.
  static async notifyNewReportForVerifier(report) {
    try {
      // Find verifiers (users with role "verifier") in the same subcity as the report.
      const verifiers = await User.find({ subcity: report.subcity, role: "verifier" });
      const payload = {
        title: "New Report",
        message: "A new report has been created in your area.",
        reportId: report._id.toString(),
      };
      // Emit a socket event so that connected verifier clients get the new report notification.
      this.io.to(report.subcity).emit("newReport", payload);
      console.log(`Socket notification sent to verifiers in ${report.subcity}`);
    } catch (error) {
      console.error("Error notifying verifiers:", error);
    }
  }
}

module.exports = NotificationService;
