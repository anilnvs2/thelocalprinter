const crypto = require("crypto");
const https = require("https");
const Settings = require("../models/Settings");
const User = require("../models/User");
const {
  PLAN_DEFS,
  normalizePlanValue,
} = require("../utils/subscriptionPlans");
const { isTrialActive, ensureTrialStarted } = require("../utils/trial");

const DAY_MS = 24 * 60 * 60 * 1000;

const isSubscriptionActive = (subscription) =>
  !!(
    subscription &&
    subscription.status === "active" &&
    subscription.endDate &&
    new Date(subscription.endDate).getTime() > Date.now()
  );

const getPlanMap = async () => {
  const settings = await Settings.find({
    key: { $in: PLAN_DEFS.map((d) => d.key) },
  });
  const map = {};
  settings.forEach((s) => {
    map[s.key] = s.value;
  });
  return map;
};

const buildPlan = (def, value) => {
  const normalized = normalizePlanValue(value, def);
  return {
    id: def.id,
    label: normalized.label || def.label,
    months: def.months,
    durationDays: def.durationDays,
    price: normalized.price,
    benefits: normalized.benefits,
    recommended: def.recommended,
  };
};

const createRazorpayOrder = ({ amount, currency, receipt, notes }) =>
  new Promise((resolve, reject) => {
    const payload = JSON.stringify({ amount, currency, receipt, notes });
    const auth = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString("base64");

    const request = https.request(
      {
        hostname: "api.razorpay.com",
        path: "/v1/orders",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          Authorization: `Basic ${auth}`,
        },
      },
      (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(body || "{}");
          } catch (err) {
            return reject(new Error("Invalid response from payment gateway"));
          }
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(
              new Error(
                parsed?.error?.description ||
                  "Failed to create payment order"
              )
            );
          }
        });
      }
    );

    request.on("error", reject);
    request.write(payload);
    request.end();
  });

const fetchRazorpayOrder = (orderId) =>
  new Promise((resolve, reject) => {
    const auth = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString("base64");

    const request = https.request(
      {
        hostname: "api.razorpay.com",
        path: `/v1/orders/${encodeURIComponent(orderId)}`,
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`,
        },
      },
      (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(body || "{}");
          } catch (err) {
            return reject(new Error("Invalid response from payment gateway"));
          }
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(
              new Error(
                parsed?.error?.description || "Failed to fetch payment order"
              )
            );
          }
        });
      }
    );

    request.on("error", reject);
    request.end();
  });

// GET /api/subscription/plans — public (used by the search gate)
exports.getPlans = async (req, res) => {
  try {
    const map = await getPlanMap();
    const plans = PLAN_DEFS.map((def) => buildPlan(def, map[def.key]));

    res.status(200).json({
      success: true,
      data: {
        plans,
        keyId: process.env.RAZORPAY_KEY_ID || null,
      },
    });
  } catch (error) {
    console.error("getPlans error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching subscription plans",
    });
  }
};

// GET /api/subscription/status — logged-in user
exports.getStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "subscription trialEligible trialStartedAt trialEndsAt"
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // First authenticated use starts the one-day free trial.
    await ensureTrialStarted(user);

    const subscriptionActive = isSubscriptionActive(user.subscription);
    const trialActive = isTrialActive(user);

    res.status(200).json({
      success: true,
      data: {
        active: subscriptionActive || trialActive,
        subscriptionActive,
        trialActive,
        trialEligible: user.trialEligible,
        trialStartedAt: user.trialStartedAt || null,
        trialEndsAt: user.trialEndsAt || null,
        subscription: user.subscription || null,
      },
    });
  } catch (error) {
    console.error("getStatus error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching subscription status",
    });
  }
};

// POST /api/subscription/create-order — logged-in user
exports.createOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    const def = PLAN_DEFS.find((d) => d.id === planId);
    if (!def) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription plan",
      });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Payment gateway is not configured",
      });
    }

    const setting = await Settings.findOne({ key: def.key });
    const plan = buildPlan(def, setting?.value);
    if (!plan.price || plan.price <= 0) {
      return res.status(400).json({
        success: false,
        message: "This plan is not available for purchase",
      });
    }

    const order = await createRazorpayOrder({
      amount: Math.round(plan.price * 100),
      currency: "INR",
      receipt: `sub_${String(req.user.userId).slice(-8)}_${Date.now()}`,
      notes: {
        planId: def.id,
        userId: String(req.user.userId),
      },
    });

    res.status(200).json({
      success: true,
      data: { order, plan },
    });
  } catch (error) {
    console.error("createOrder error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create payment order",
    });
  }
};

// POST /api/subscription/verify — logged-in user
exports.verifyPayment = async (req, res) => {
  try {
    const {
      planId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !planId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification details",
      });
    }

    const def = PLAN_DEFS.find((d) => d.id === planId);
    if (!def) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription plan",
      });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Payment gateway is not configured",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const setting = await Settings.findOne({ key: def.key });
    const plan = buildPlan(def, setting?.value);

    // Bind the paid order to this user and plan so a cheaper order cannot be
    // used to activate an expensive plan.
    let razorpayOrder;
    try {
      razorpayOrder = await fetchRazorpayOrder(razorpay_order_id);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Could not verify payment order",
      });
    }

    if (
      razorpayOrder?.notes?.planId !== def.id ||
      razorpayOrder?.notes?.userId !== String(req.user.userId) ||
      Number(razorpayOrder?.amount) !== Math.round(plan.price * 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment order does not match this subscription plan",
      });
    }

    const now = new Date();
    // Renewing an active plan extends from the current end date.
    const base = isSubscriptionActive(user.subscription)
      ? new Date(user.subscription.endDate)
      : now;
    const endDate = new Date(base.getTime() + def.durationDays * DAY_MS);

    user.subscription = {
      planId: def.id,
      planLabel: plan.label,
      durationDays: def.durationDays,
      amount: plan.price,
      status: "active",
      startDate: now,
      endDate,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      paymentStatus: "paid",
    };
    await user.save();

    res.status(200).json({
      success: true,
      message: "Subscription activated successfully",
      data: {
        active: true,
        subscription: user.subscription,
      },
    });
  } catch (error) {
    console.error("verifyPayment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error verifying payment",
    });
  }
};

exports.isSubscriptionActive = isSubscriptionActive;
