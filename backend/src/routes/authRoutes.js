const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { body } = require("express-validator");
const { signup, login, getMe } = require("../controllers/authController");
const { sendOtp, verifyOtp, checkOtpVerified } = require("../controllers/otpController");
const { authenticateUser } = require("../middlewares/auth");
const { resellerUpload } = require("../middlewares/upload");

const router = express.Router();

// TEMP DIAGNOSTIC — captures what the browser actually sends to /login.
// Delete this block and the router hook below once the login issue is resolved.
const loginDebug = (req, res, next) => {
  const startedAt = new Date().toISOString();
  res.on("finish", () => {
    try {
      const pw = typeof req.body?.password === "string" ? req.body.password : "";
      const rawEmail = typeof req.body?.email === "string" ? req.body.email : null;
      fs.appendFileSync(
        path.join(os.tmpdir(), "lp-login-debug.log"),
        JSON.stringify({
          t: startedAt,
          status: res.statusCode,
          origin: req.headers.origin || null,
          referer: req.headers.referer || null,
          emailRaw: rawEmail,
          emailHex: rawEmail ? Buffer.from(rawEmail, "utf8").toString("hex") : null,
          pwLen: pw.length,
          pwEdgeWS: pw !== pw.trim(),
          pwSha: crypto.createHash("sha256").update(pw, "utf8").digest("hex").slice(0, 16),
          pwTrimSha: crypto.createHash("sha256").update(pw.trim(), "utf8").digest("hex").slice(0, 16),
        }) + "\n"
      );
    } catch (e) {
      // never break login because of logging
    }
  });
  next();
};

const sendOtpValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
];

const verifyOtpValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("otp")
    .trim()
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .isNumeric()
    .withMessage("OTP must contain only numbers"),
];

// WhatsApp number is mandatory for USER registrations (Personal Use, Business
// Purpose and Reseller) and for Vendor registrations. Poster boy sign-ups keep
// it optional.
const whatsappValidation = body("whatsappNumber").custom((value, { req }) => {
  if (req.body.role !== "USER" && req.body.role !== "VENDOR") return true;

  const whatsapp = (value === undefined || value === null ? "" : String(value)).trim();
  if (!whatsapp) {
    throw new Error("WhatsApp number is required");
  }
  if (!/^\+?[\d\s\-()]+$/.test(whatsapp)) {
    throw new Error("Please provide a valid WhatsApp number");
  }
  const digits = whatsapp.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    throw new Error("Please provide a valid WhatsApp number");
  }
  return true;
});

const signupValidation = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be 2-100 characters"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("role")
    .notEmpty()
    .withMessage("Account type is required")
    .isIn(["USER", "VENDOR", "POSTER_BOY"])
    .withMessage("Account type must be USER, VENDOR or POSTER_BOY"),
  whatsappValidation,
];

const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

router.post("/send-otp", sendOtpValidation, sendOtp);
router.post("/verify-otp", verifyOtpValidation, verifyOtp);
router.get("/check-otp", checkOtpVerified);

const normalizeSignupEmail = (req, res, next) => {
  if (req.body && req.body.email) {
    req.body.email = req.body.email.toLowerCase().trim();
  }
  next();
};

router.post("/signup", resellerUpload, normalizeSignupEmail, [whatsappValidation], signup);
router.post("/signup-json", signupValidation, signup);
router.post("/login", loginDebug, loginValidation, login);
router.get("/me", authenticateUser, getMe);

module.exports = router;
