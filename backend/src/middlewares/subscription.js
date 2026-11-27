const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { ensureTrialStarted, isTrialActive } = require("../utils/trial");
const { isSubscriptionActive } = require("../controllers/subscriptionController");

// Business/poster-boy listing endpoints are shared with the public marketing
// pages (category pages browse them without an account), so browsing stays
// open. Keyword search is the paid feature: it needs an account and an active
// subscription or trial.
const hasKeywordSearch = (req) => {
  const value = req.query ? req.query.search : undefined;
  return typeof value === "string" && value.trim().length > 0;
};

// Public routes have no auth middleware, so a token may still be attached.
// Reads it when present so a logged-in user gets 402 instead of being logged
// out by the 401 handler.
const resolveRequester = (req) => {
  if (req.user) return req.user;

  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;

  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    return { userId: decoded.userId, role: decoded.role };
  } catch (error) {
    return null;
  }
};

const requireActiveSubscription = async (req, res, next) => {
  try {
    if (!hasKeywordSearch(req)) return next();

    const requester = resolveRequester(req);
    if (!requester) {
      return res.status(401).json({
        success: false,
        code: "LOGIN_REQUIRED",
        message: "Please login to search businesses and poster boys.",
      });
    }

    if (requester.role === "ADMIN") return next();

    const user = await User.findById(requester.userId).select(
      "role subscription trialEligible trialStartedAt trialEndsAt"
    );
    if (!user) {
      return res.status(401).json({
        success: false,
        code: "LOGIN_REQUIRED",
        message: "Please login to search businesses and poster boys.",
      });
    }
    if (user.role === "ADMIN") return next();

    // First authenticated use starts the one-day free trial.
    await ensureTrialStarted(user);

    if (isSubscriptionActive(user.subscription) || isTrialActive(user)) {
      return next();
    }

    return res.status(402).json({
      success: false,
      code: "SUBSCRIPTION_REQUIRED",
      message: "An active subscription is required to search.",
    });
  } catch (error) {
    console.error("requireActiveSubscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error checking subscription status",
    });
  }
};

module.exports = { requireActiveSubscription };
