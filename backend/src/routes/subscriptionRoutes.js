const express = require("express");
const {
  authenticateUser,
  authorizeRole,
} = require("../middlewares/auth");
const {
  getPlans,
  getStatus,
  createOrder,
  verifyPayment,
} = require("../controllers/subscriptionController");

const router = express.Router();

router.get("/plans", getPlans);
router.get("/status", authenticateUser, getStatus);

router.post(
  "/create-order",
  authenticateUser,
  authorizeRole("USER", "VENDOR", "POSTER_BOY"),
  createOrder
);
router.post(
  "/verify",
  authenticateUser,
  authorizeRole("USER", "VENDOR", "POSTER_BOY"),
  verifyPayment
);

module.exports = router;
