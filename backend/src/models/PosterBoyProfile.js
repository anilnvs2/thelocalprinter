const mongoose = require("mongoose");

const pendingChangeSchema = new mongoose.Schema(
  {
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const workMediaSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, default: "" },
    resourceType: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },
  },
  { _id: false }
);

const gpsCoordinatesSchema = new mongoose.Schema(
  {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  { _id: false }
);

const posterBoyProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      unique: true,
    },
    aadhaarNumber: {
      type: String,
      trim: true,
      default: "",
    },

    languages: {
      type: [String],
      default: [],
    },

    address: {
      type: String,
      trim: true,
      default: "",
      maxlength: [300, "Address must be at most 300 characters"],
    },

    // Filled by the GPS reverse-geocode. Not exposed as an input in the UI.
    city: {
      type: String,
      trim: true,
      default: "",
    },
    gpsCoordinates: {
      type: gpsCoordinatesSchema,
      default: () => ({}),
    },

    // Fixed skill options plus any custom chips the poster boy added.
    skills: {
      type: [String],
      default: [],
    },
    // Resolved Category references so the public listing can filter by the
    // "Poster Boy" parent category or by an individual skill subcategory.
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    skillIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Category",
      default: [],
    },

    // ─── Work preferences (mandatory) ───
    // How far the worker travels from their address.
    workRadius: {
      type: String,
      trim: true,
      default: "",
    },
    // Single worker or a team.
    strength: {
      type: String,
      trim: true,
      default: "",
    },
    // Order sizes the worker accepts (multi-select).
    orderAccepted: {
      type: [String],
      default: [],
    },
    // Minimum notice the worker needs before a job starts.
    bookingTimeline: {
      type: String,
      trim: true,
      default: "",
    },
    // When the worker can take up jobs.
    workTiming: {
      type: String,
      trim: true,
      default: "",
    },

    // Past work photos / videos (max 10, enforced in the controller).
    workMedia: {
      type: [workMediaSchema],
      default: [],
    },

    // ─── Approval (vendor Business parity) ───
    status: {
      type: String,
      enum: {
        values: ["pending", "approved", "rejected"],
        message: "Status must be pending, approved, or rejected",
      },
      default: "pending",
    },
    // Edits submitted after approval wait here. The approved (live) fields on
    // this document stay untouched until the admin approves them.
    pendingChange: {
      type: pendingChangeSchema,
      default: null,
    },

    profileCompleted: {
      type: Boolean,
      default: false,
    },

    // Number of times a visitor revealed the contact details (lead signal).
    leadCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

posterBoyProfileSchema.index({ status: 1 });
posterBoyProfileSchema.index({ createdAt: -1 });
posterBoyProfileSchema.index({ skills: 1 });
posterBoyProfileSchema.index({ city: 1 });
posterBoyProfileSchema.index({ skillIds: 1 });
posterBoyProfileSchema.index({ categoryId: 1 });

const PosterBoyProfile = mongoose.model("PosterBoyProfile", posterBoyProfileSchema);

module.exports = PosterBoyProfile;
