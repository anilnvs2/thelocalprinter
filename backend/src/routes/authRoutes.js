const express = require("express");
const { body } = require("express-validator");
const { signup, login, getMe } = require("../controllers/authController");
const { sendOtp, verifyOtp, checkOtpVerified } = require("../controllers/otpController");
const { authenticateUser } = require("../middlewares/auth");
const { resellerUpload } = require("../middlewares/upload");

const router = express.Router();

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
router.post("/login", loginValidation, login);
router.get("/me", authenticateUser, getMe);

module.exports = router;
