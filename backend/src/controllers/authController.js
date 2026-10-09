const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const OtpVerification = require("../models/OtpVerification");
const Business = require("../models/Business");
const { ROLES } = require("../utils/constants");

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const filterUser = (user) => {
  const obj = user.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

const PAYMENT_RULES = ["Cash & Carry", "PO Based"];

// Accepts the legacy single value or the current multi-select array and
// returns every valid selected rule.
const normalizePaymentRule = (value) => {
  const values = Array.isArray(value) ? value : [value];
  return values
    .filter((rule) => typeof rule === "string" && PAYMENT_RULES.includes(rule.trim()))
    .map((rule) => rule.trim());
};

exports.signup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const {
      fullName,
      email,
      password,
      role,
      whatsappNumber,
      registrationType,
      businessPurposeDetails,
      resellerDetails,
    } = req.body;

    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Account type must be USER, VENDOR or POSTER_BOY.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const otpVerified = await OtpVerification.findOne({
      email: normalizedEmail,
      verified: true,
      expiresAt: { $gt: new Date() },
    });

    if (!otpVerified) {
      return res.status(400).json({
        success: false,
        message: "Email verification required. Please verify your email with OTP first.",
      });
    }

    const userData = {
      fullName,
      email: normalizedEmail,
      role,
      whatsappNumber: whatsappNumber || null,
      emailVerified: true,
      registrationType: registrationType || null,
      // USER/VENDOR accounts are never held for approval: a vendor signs up,
      // fills the business registration form, and only that business goes to
      // admin approval. Poster boys, however, are approved by the admin before
      // they can access their dashboard.
      approvalStatus: role === ROLES.POSTER_BOY ? "pending" : "approved",
    };

    const { generatePublicId } = require("../utils/publicId");
    userData.publicId = await generatePublicId(role);

    if (registrationType === "BUSINESS_PURPOSE" && businessPurposeDetails) {
      userData.businessPurposeDetails = {
        companyName: businessPurposeDetails.companyName || "",
        location: businessPurposeDetails.location || "",
        businessCategory: businessPurposeDetails.businessCategory || "",
        contactNumber: businessPurposeDetails.contactNumber || "",
        officialEmail: businessPurposeDetails.officialEmail || "",
        gstNumber: businessPurposeDetails.gstNumber || "",
        paymentRule: normalizePaymentRule(businessPurposeDetails.paymentRule),
      };
    }

    const user = new User(userData);
    user.password = password;
    await user.save();

    if (registrationType === "RESELLER" && resellerDetails) {
      const ResellerApplication = require("../models/ResellerApplication");

      let parsedDetails = resellerDetails;
      if (typeof resellerDetails === "string") {
        try {
          parsedDetails = JSON.parse(resellerDetails);
        } catch (e) {
          parsedDetails = {};
        }
      }

      let isAlreadyListed = false;
      if (parsedDetails.companyName) {
        const existingBusiness = await Business.findOne({
          name: { $regex: new RegExp(parsedDetails.companyName, "i") },
          status: "approved",
        });
        isAlreadyListed = !!existingBusiness;
      }

      let locationVideoPath = null;
      let businessCardPath = null;
      if (req.files) {
        if (req.files.locationVideo && req.files.locationVideo[0]) {
          locationVideoPath = `uploads/reseller/${req.files.locationVideo[0].filename}`;
        }
        if (req.files.businessCard && req.files.businessCard[0]) {
          businessCardPath = `uploads/reseller/${req.files.businessCard[0].filename}`;
        }
      }

      const resellerApp = new ResellerApplication({
        user: user._id,
        companyName: parsedDetails.companyName || "",
        address: parsedDetails.address || "",
        businessCategory: parsedDetails.businessCategory || "",
        contactNumber: parsedDetails.contactNumber || "",
        gstNumber: parsedDetails.gstNumber || "",
        yearlyTurnover: parsedDetails.yearlyTurnover || "",
        locationVideoPath,
        businessCardPath,
        isAlreadyListed,
        status: "PENDING",
      });
      await resellerApp.save();

      // Resellers are never auto-approved: the application waits for the admin
      // (Admin Dashboard -> Businesses) to approve it manually.
      user.resellerApprovalStatus = "PENDING";
      await user.save();
    }

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        user: filterUser(user),
        token,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during signup",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+passwordHash"
    );
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.emailVerified && user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Email not verified. Please verify your email with OTP first.",
        emailNotVerified: true,
      });
    }

    if (user.role === "VENDOR" && user.approvalStatus === "pending") {
      return res.status(403).json({
        success: false,
        message: "Your account is pending admin approval. Please wait for approval before logging in.",
        pendingApproval: true,
      });
    }

    if (user.role === "VENDOR" && user.approvalStatus === "rejected") {
      return res.status(403).json({
        success: false,
        message: "Your account has been rejected. Please contact support.",
        rejected: true,
      });
    }

    // Poster boys with a pending account ARE allowed to log in — they need to
    // reach the "pending approval" screen. Only rejected accounts are blocked.
    if (user.role === ROLES.POSTER_BOY && user.approvalStatus === "rejected") {
      return res.status(403).json({
        success: false,
        message: "Your account has been rejected. Please contact support.",
        rejected: true,
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: filterUser(user),
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
