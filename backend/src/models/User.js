const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ROLE_ENUM } = require("../utils/constants");

const pendingProfileChangeSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: null },
    phone: { type: String, default: null },
    whatsappNumber: { type: String, default: null },
    submittedAt: { type: Date, default: null },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Full name must be at least 2 characters"],
      maxlength: [100, "Full name must be at most 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    passwordHash: {
      type: String,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
      match: [/^[\d+\-\s()]*$/, "Please provide a valid phone number"],
    },
    role: {
      type: String,
      enum: {
        values: ROLE_ENUM,
        message: "Role must be ADMIN, VENDOR, USER, or POSTER_BOY",
      },
      default: "USER",
    },
    whatsappNumber: {
      type: String,
      trim: true,
      default: null,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    registrationType: {
      type: String,
      enum: ["PERSONAL_USE", "BUSINESS_PURPOSE", "RESELLER"],
      default: null,
    },
    businessPurposeDetails: {
      companyName: { type: String, trim: true, default: "" },
      location: { type: String, trim: true, default: "" },
      businessCategory: { type: String, trim: true, default: "" },
      contactNumber: { type: String, trim: true, default: "" },
      officialEmail: { type: String, trim: true, default: "" },
      gstNumber: { type: String, trim: true, default: "" },
      paymentRule: {
        // Multiple payment rules can be selected (Cash & Carry + PO Based).
        // "" is kept in the enum so legacy single-value records still validate.
        type: [String],
        enum: ["Cash & Carry", "PO Based", ""],
        default: [],
      },
    },
    resellerApprovalStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: null,
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: null,
    },
    // Vendor profile edits waiting for admin approval.
    // Live profile fields stay untouched until approved.
    pendingProfileChange: {
      type: pendingProfileChangeSchema,
      default: null,
    },
    publicId: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.virtual("password").set(function (plainPassword) {
  this._plainPassword = plainPassword;
});

userSchema.pre("validate", function () {
  if (!this._plainPassword && !this.passwordHash) {
    this.invalidate("password", "Password is required");
  }
});

userSchema.pre("save", async function () {
  if (this._plainPassword) {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this._plainPassword, salt);
    this._plainPassword = undefined;
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
