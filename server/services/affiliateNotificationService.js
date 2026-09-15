const Notification = require("../models/Notification");
const logger = require("../utils/logger");

async function sendAffiliateNotification(userId, title, message, data = {}) {
  if (!userId) return null;

  try {
    return await Notification.create({
      user: userId,
      type: "system",
      title,
      message,
      data: {
        module: "affiliate",
        ...data,
      },
    });
  } catch (error) {
    logger.error("Affiliate notification failed", {
      user: userId.toString(),
      title,
      error: error.message,
    });
    return null;
  }
}

module.exports = {
  sendAffiliateNotification,
};
