const mongoose = require("mongoose");

const pendingChangeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["EDIT", "DELETE"],
      default: "EDIT",
    },
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

const businessSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Vendor ID is required"],
    },

    // ─── Section 1: Business Information ───
    name: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
      maxlength: [200, "Business name must be at most 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [5000, "Description must be at most 5000 characters"],
    },
    establishedYear: {
      type: Number,
      min: [1900, "Year must be 1900 or later"],
      max: [new Date().getFullYear(), "Year cannot be in the future"],
      default: null,
    },
    workingHours: {
      monday:    { open: { type: Boolean, default: true },  openingTime: { type: String, default: "" }, closingTime: { type: String, default: "" } },
      tuesday:   { open: { type: Boolean, default: true },  openingTime: { type: String, default: "" }, closingTime: { type: String, default: "" } },
      wednesday: { open: { type: Boolean, default: true },  openingTime: { type: String, default: "" }, closingTime: { type: String, default: "" } },
      thursday:  { open: { type: Boolean, default: true },  openingTime: { type: String, default: "" }, closingTime: { type: String, default: "" } },
      friday:    { open: { type: Boolean, default: true },  openingTime: { type: String, default: "" }, closingTime: { type: String, default: "" } },
      saturday:  { open: { type: Boolean, default: true },  openingTime: { type: String, default: "" }, closingTime: { type: String, default: "" } },
      sunday:    { open: { type: Boolean, default: false }, openingTime: { type: String, default: "" }, closingTime: { type: String, default: "" } },
    },

    // ─── Section 2: Contact Details ───
    contactName: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    whatsapp: {
      type: String,
      trim: true,
      default: "",
    },
    contactEmail: {
      type: String,
      trim: true,
      default: "",
      lowercase: true,
    },
    website: {
      type: String,
      trim: true,
      default: "",
    },

    // ─── Section 3: Category & Location ───
    category: {
      type: String,
      trim: true,
      default: "",
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    serviceIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Category",
      default: [],
    },
    // Extra categories an admin can attach on top of the primary one (admin
    // edit only — vendors always manage a single primary category). Each
    // entry pairs a category with the services picked under it so public
    // search/filter can match the business under ANY of its categories.
    additionalCategories: {
      type: [
        {
          categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
          serviceIds: { type: [mongoose.Schema.Types.ObjectId], ref: "Category", default: [] },
          // Admin-assigned tags for this category (vendors cannot edit these —
          // only the admin manages multi-category entries and their tags).
          tags: { type: [String], default: [] },
          _id: false,
        },
      ],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    gpsCoordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    googleBusinessProfileLink: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    // ─── Section 4: GST ───
    gstAvailable: {
      type: Boolean,
      default: false,
    },
    gstNumber: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    // ─── Section 5: Order Limits ───
    orderLimits: {
      type: String,
      enum: {
        values: ["single", "minimum", "bulk", "no_limit"],
        message: "Order limit must be single, minimum, bulk, or no_limit",
      },
      default: "no_limit",
    },

    // ─── Section 6: Services / Offering ───
    serviceType: {
      type: String,
      enum: {
        values: ["print_only", "full_with_design", "full_without_design"],
        message: "Invalid service type",
      },
      default: "print_only",
    },

    // ─── Section 7: Customer Type ───
    customerType: {
      type: String,
      enum: {
        values: ["b2b", "b2c", "both"],
        message: "Customer type must be b2b, b2c, or both",
      },
      default: "both",
    },

    // ─── Section 8: Ordering Method ───
    orderingMethod: {
      type: String,
      enum: {
        values: ["on_call", "shop_visit", "both"],
        message: "Ordering method must be on_call, shop_visit, or both",
      },
      default: "both",
    },

    // ─── Section 9: Payment Modes ───
    paymentModes: {
      type: [String],
      default: [],
    },

    // ─── Section 10: Social Media ───
    socialMedia: {
      facebook: { type: String, trim: true, default: "" },
      instagram: { type: String, trim: true, default: "" },
      youtube: { type: String, trim: true, default: "" },
      linkedin: { type: String, trim: true, default: "" },
      twitter: { type: String, trim: true, default: "" },
    },

    // ─── Section 11: Verification Media ───
    // NOTE: No file storage system exists yet.
    // These fields store placeholder paths/URLs.
    // Actual file upload requires: multer + cloudinary/S3 integration.
    verificationMedia: {
      machineryWorkingVideo: { type: String, default: "" },
      completeOutletVideo: { type: String, default: "" },
      outdoorStoreImage: { type: String, default: "" },
      indoorStoreImage: { type: String, default: "" },
      thumbnailImages: { type: [String], default: [] },
    },

    // ─── Section 12: Languages ───
    languages: {
      type: [String],
      default: [],
    },

    // ─── Section 13: Policies & Additional Services ───
    returnReplacementPolicy: {
      type: String,
      trim: true,
      default: "",
    },
    // Client question: "If any mistakes happen from your end, after approval
    // of the customer will you replace them on with no charge?"
    // Stored separately from the free-text policy above. null = not answered
    // (records created before this question was added keep their data).
    replaceMistakesAtNoCharge: {
      type: String,
      enum: ["Yes", "No"],
      default: null,
    },
    inHouseDesignerAvailable: {
      type: Boolean,
      default: false,
    },
    customerLocationVisitAvailable: {
      type: Boolean,
      default: false,
    },
    addonServices: {
      type: [String],
      default: [],
    },

    // ─── Section 14: Sample & File Formats ───
    sampleDisplayAvailable: {
      type: Boolean,
      default: false,
    },
    preferredFileFormats: {
      type: [String],
      default: [],
    },

    // ─── Section 15: Purchase Order ───
    acceptsPurchaseOrder: {
      type: Boolean,
      default: false,
    },

    // ─── Section 16: Fraud / Hotlist (PRIVATE) ───
    // select: false keeps it out of every response unless an admin endpoint
    // explicitly asks for it with .select("+fraudReport").
    fraudReport: {
      type: [
        {
          contactName: { type: String, trim: true, default: "" },
          designation: { type: String, trim: true, default: "" },
          contactNumber: { type: String, trim: true, default: "" },
        },
      ],
      select: false,
      default: [],
    },

    // ─── Brand Recall / Trust Score (ADMIN-managed, optional) ───
    // Manually assigned per-business by an admin. null = no score assigned.
    // Range 0-10, decimals allowed (e.g. 8.5). Validated in the admin controller.
    brandRecallScore: {
      type: Number,
      default: null,
      min: [0, "Trust score must be at least 0"],
      max: [10, "Trust score must be at most 10"],
    },

    // ─── System Fields ───
    status: {
      type: String,
      enum: {
        values: ["pending", "approved", "rejected"],
        message: "Status must be pending, approved, or rejected",
      },
      default: "pending",
    },
    // Vendor submitted changes waiting for admin approval.
    // The approved (live) data on this document stays untouched until approved.
    pendingChange: {
      type: pendingChangeSchema,
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

businessSchema.index({ vendor: 1 });
businessSchema.index({ status: 1 });
businessSchema.index({ createdAt: -1 });
businessSchema.index({ category: 1 });
businessSchema.index({ categoryId: 1 });
businessSchema.index({ "additionalCategories.categoryId": 1 });
businessSchema.index({ city: 1 });
businessSchema.index({ "pendingChange.type": 1 });

const Business = mongoose.model("Business", businessSchema);

module.exports = Business;
