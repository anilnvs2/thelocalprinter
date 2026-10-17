const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const { notFound, errorHandler } = require("./middlewares/errorMiddleware");
const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const posterBoyRoutes = require("./routes/posterBoyRoutes");
const userRoutes = require("./routes/userRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const chatRoutes = require("./routes/chatRoutes");
const { adminCouponRoutes, couponRoutes } = require("./routes/couponRoutes");

const app = express();

app.use(helmet());
app.use(morgan("dev"));
app.use(cors({ origin: function (origin, callback) {
  const allowed = (process.env.CLIENT_URL || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!origin || allowed.includes(origin)) {
    callback(null, true);
  } else {
    console.warn(`[CORS] Blocked request from disallowed origin: ${origin}`);
    callback(null, false);
  }
}, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/posterboy", posterBoyRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin/coupons", adminCouponRoutes);
app.use("/api/coupons", couponRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
