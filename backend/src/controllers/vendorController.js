const Business = require("../models/Business");
const User = require("../models/User");
const Review = require("../models/Review");
const Category = require("../models/Category");
const Settings = require("../models/Settings");
const { applyBusinessPatch } = require("../utils/businessPatch");
const { validateBusinessPayload } = require("../utils/businessValidation");

const hasDeleteRequest = (business) =>
  !!business.pendingChange && business.pendingChange.type === "DELETE";

exports.getOnboardingStatus = async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const firstBusiness = await Business.findOne({ vendor: vendorId })
      .sort({ createdAt: 1 })
      .select("name status isActive");

    if (!firstBusiness) {
      return res.status(200).json({
        success: true,
        data: {
          hasBusiness: false,
          firstBusinessStatus: null,
          businessName: null,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        hasBusiness: true,
        firstBusinessStatus: firstBusiness.status,
        firstBusinessActive: firstBusiness.isActive,
        businessName: firstBusiness.name,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching onboarding status",
    });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const vendorId = req.user.userId;

    const [totalBusinesses, activeBusinesses, pendingBusinesses, approvedBusinesses, rejectedBusinesses, recentBusinesses] =
      await Promise.all([
        Business.countDocuments({ vendor: vendorId }),
        Business.countDocuments({ vendor: vendorId, isActive: true, status: "approved" }),
        Business.countDocuments({ vendor: vendorId, status: "pending" }),
        Business.countDocuments({ vendor: vendorId, status: "approved" }),
        Business.countDocuments({ vendor: vendorId, status: "rejected" }),
        Business.find({ vendor: vendorId })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("categoryId", "name image")
          .populate("serviceIds", "name")
          .select("name category categoryId serviceIds city status isActive createdAt"),
      ]);

    const vendorBusinessIds = await Business.find({ vendor: vendorId }).distinct("_id");

    const [reviewAgg, breakdownRaw, recentReviews] = await Promise.all([
      Review.aggregate([
        { $match: { business: { $in: vendorBusinessIds }, isVisible: true } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]),
      Review.aggregate([
        { $match: { business: { $in: vendorBusinessIds }, isVisible: true } },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
      ]),
      Review.find({ business: { $in: vendorBusinessIds }, isVisible: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user", "fullName")
        .populate("business", "name"),
    ]);

    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    breakdownRaw.forEach((b) => { ratingBreakdown[b._id] = b.count; });

    const reviewStats = {
      averageRating: reviewAgg.length > 0 ? Math.round(reviewAgg[0].avg * 10) / 10 : 0,
      totalReviews: reviewAgg.length > 0 ? reviewAgg[0].count : 0,
      ratingBreakdown,
    };

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalBusinesses,
          activeBusinesses,
          pendingBusinesses,
          approvedBusinesses,
          rejectedBusinesses,
        },
        reviewStats,
        recentBusinesses,
        recentReviews,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching vendor dashboard",
    });
  }
};

exports.getMyBusinesses = async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status || "";

    const query = { vendor: vendorId };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }
    if (status) {
      query.status = status;
    }

    const [businesses, total] = await Promise.all([
      Business.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("categoryId", "name image")
        .populate("serviceIds", "name")
        .select("name description category categoryId serviceIds phone address city status isActive pendingChange createdAt"),
      Business.countDocuments(query),
    ]);

    const businessIds = businesses.map((b) => b._id);
    const ratings = await Review.aggregate([
      { $match: { business: { $in: businessIds }, isVisible: true } },
      { $group: { _id: "$business", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    const ratingMap = {};
    ratings.forEach((r) => { ratingMap[r._id.toString()] = { averageRating: Math.round(r.avg * 10) / 10, reviewCount: r.count }; });

    const businessesWithRatings = businesses.map((b) => {
      const obj = b.toObject();
      obj.ratingSummary = ratingMap[b._id.toString()] || { averageRating: 0, reviewCount: 0 };
      return obj;
    });

    res.status(200).json({
      success: true,
      data: {
        businesses: businessesWithRatings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching businesses",
    });
  }
};

exports.getBusinessById = async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const { id } = req.params;

    // Only the owner may read this (checked below), so a vendor always sees
    // their own fraud / hotlist report — nobody else's.
    const business = await Business.findById(id)
      .select("+googleBusinessProfileLink +gstNumber +fraudReport")
      .populate("categoryId", "name image")
      .populate("serviceIds", "name");

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    if (business.vendor.toString() !== vendorId) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own businesses",
      });
    }

    res.status(200).json({
      success: true,
      data: { business },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching business",
    });
  }
};

exports.createBusiness = async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const data = req.body;

    if (!data.name || !data.name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Business name is required",
      });
    }

    const validationErrors = await validateBusinessPayload(data, { mode: "create" });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors.join(" "),
        errors: validationErrors,
      });
    }

    const businessData = {
      vendor: vendorId,
      name: data.name.trim(),
      status: "pending",

      // Section 1
      description: data.description || "",
      establishedYear: data.establishedYear || null,
      workingHours: data.workingHours || {},

      // Section 2
      contactName: data.contactName || "",
      phone: data.phone || "",
      whatsapp: data.whatsapp || "",
      contactEmail: data.contactEmail || "",
      website: data.website || "",

      // Section 3
      category: data.category || "",
      categoryId: data.categoryId || null,
      serviceIds: data.serviceIds || [],
      tags: data.tags || [],
      address: data.address || "",
      city: data.city || "",
      gpsCoordinates: data.gpsCoordinates || { lat: null, lng: null },
      googleBusinessProfileLink: data.googleBusinessProfileLink || "",

      // Section 4
      gstAvailable: data.gstAvailable || false,
      gstNumber: data.gstNumber || "",

      // Section 5
      orderLimits: data.orderLimits || "no_limit",

      // Section 6
      serviceType: data.serviceType || "print_only",

      // Section 7
      customerType: data.customerType || "both",

      // Section 8
      orderingMethod: data.orderingMethod || "both",

      // Section 9
      paymentModes: data.paymentModes || [],

      // Section 10
      socialMedia: data.socialMedia || {},

      // Section 11
      verificationMedia: data.verificationMedia || {},

      // Section 12
      languages: data.languages || [],

      // Section 13
      returnReplacementPolicy: data.returnReplacementPolicy || "",
      replaceMistakesAtNoCharge: data.replaceMistakesAtNoCharge === "Yes" || data.replaceMistakesAtNoCharge === "No" ? data.replaceMistakesAtNoCharge : null,
      inHouseDesignerAvailable: data.inHouseDesignerAvailable || false,
      customerLocationVisitAvailable: data.customerLocationVisitAvailable || false,
      addonServices: data.addonServices || [],

      // Section 14
      sampleDisplayAvailable: data.sampleDisplayAvailable || false,
      preferredFileFormats: data.preferredFileFormats || [],

      // Section 15
      acceptsPurchaseOrder: data.acceptsPurchaseOrder || false,

      // Section 16 — only non-empty entries are kept; the report is never
      // returned to the vendor again (admin-only from here on).
      fraudReport: (Array.isArray(data.fraudReport) ? data.fraudReport : [])
        .map((entry) => ({
          contactName: String(entry?.contactName || "").trim(),
          designation: String(entry?.designation || "").trim(),
          contactNumber: String(entry?.contactNumber || "").trim(),
        }))
        .filter((entry) => entry.contactName || entry.designation || entry.contactNumber),
    };

    const business = await Business.create(businessData);

    // Do not echo the fraud / hotlist report back to the vendor.
    const businessView = business.toObject();
    delete businessView.fraudReport;

    res.status(201).json({
      success: true,
      message: "Business created successfully. Pending admin approval.",
      data: { business: businessView },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error creating business",
    });
  }
};

exports.updateBusiness = async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const { id } = req.params;

    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    if (business.vendor.toString() !== vendorId) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own businesses",
      });
    }

    const data = { ...req.body };
    // Vendors may edit their own fraud / hotlist report, but only non-empty
    // entries are stored (blank rows from the form are dropped).
    if (data.fraudReport !== undefined) {
      data.fraudReport = (Array.isArray(data.fraudReport) ? data.fraudReport : [])
        .map((entry) => ({
          contactName: String(entry?.contactName || "").trim(),
          designation: String(entry?.designation || "").trim(),
          contactNumber: String(entry?.contactNumber || "").trim(),
        }))
        .filter((entry) => entry.contactName || entry.designation || entry.contactNumber);
    }

    if (data.name !== undefined && (!data.name || !String(data.name).trim())) {
      return res.status(400).json({
        success: false,
        message: "Business name is required",
      });
    }

    if (hasDeleteRequest(business)) {
      return res.status(409).json({
        success: false,
        message:
          "A delete request for this business is already waiting for admin approval. It must be reviewed first.",
      });
    }

    const validationErrors = await validateBusinessPayload(data, {
      mode: "update",
      existing: business,
    });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors.join(" "),
        errors: validationErrors,
      });
    }

    // Approved businesses stay live with the current data.
    // Submitted changes are stored separately until an admin approves them.
    if (business.status === "approved") {
      const patch = applyBusinessPatch({}, data);
      const existingData =
        business.pendingChange && business.pendingChange.type === "EDIT"
          ? business.pendingChange.data || {}
          : {};

      business.pendingChange = {
        type: "EDIT",
        data: { ...existingData, ...patch },
        submittedAt: new Date(),
      };
      await business.save();

      return res.status(200).json({
        success: true,
        message:
          "Changes submitted for admin approval. Your current listing stays live until approved.",
        data: { business },
      });
    }

    // Business is not public yet (pending or rejected) → apply directly.
    applyBusinessPatch(business, data);

    if (business.status === "rejected") {
      business.status = "pending";
    }

    await business.save();

    res.status(200).json({
      success: true,
      message: "Business updated successfully",
      data: { business },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error updating business",
    });
  }
};

exports.deleteBusiness = async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const { id } = req.params;

    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    if (business.vendor.toString() !== vendorId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own businesses",
      });
    }

    if (hasDeleteRequest(business)) {
      return res.status(409).json({
        success: false,
        message: "A delete request for this business is already waiting for admin approval.",
      });
    }

    // Deletion always requires admin approval.
    business.pendingChange = {
      type: "DELETE",
      data: null,
      submittedAt: new Date(),
    };
    await business.save();

    res.status(200).json({
      success: true,
      message: "Delete request submitted. The business will be removed after admin approval.",
      data: { business },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error deleting business",
    });
  }
};

exports.toggleBusinessStatus = async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const { id } = req.params;

    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    if (business.vendor.toString() !== vendorId) {
      return res.status(403).json({
        success: false,
        message: "You can only modify your own businesses",
      });
    }

    if (hasDeleteRequest(business)) {
      return res.status(409).json({
        success: false,
        message:
          "A delete request for this business is already waiting for admin approval.",
      });
    }

    const nextActiveState = !business.isActive;

    // Approved businesses only change their visibility after admin approval.
    if (business.status === "approved") {
      const existingData =
        business.pendingChange && business.pendingChange.type === "EDIT"
          ? business.pendingChange.data || {}
          : {};

      business.pendingChange = {
        type: "EDIT",
        data: { ...existingData, isActive: nextActiveState },
        submittedAt: new Date(),
      };
      await business.save();

      return res.status(200).json({
        success: true,
        message: `Request to ${nextActiveState ? "activate" : "deactivate"} this business submitted for admin approval.`,
        data: { business },
      });
    }

    business.isActive = nextActiveState;
    await business.save();

    res.status(200).json({
      success: true,
      message: `Business ${business.isActive ? "activated" : "deactivated"}`,
      data: { business },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error toggling business status",
    });
  }
};

exports.getProfile = async (req, res) => {
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
      message: "Server error fetching profile",
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { fullName, phone, whatsappNumber } = req.body;

    const trimmedName = typeof fullName === "string" ? fullName.trim() : "";
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Full name must be between 2 and 100 characters",
      });
    }

    const normalizedPhone = phone === undefined || phone === null ? null : String(phone).trim();
    if (normalizedPhone && !/^[\d+\-\s()]*$/.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid phone number",
      });
    }

    const normalizedWhats =
      whatsappNumber === undefined || whatsappNumber === null
        ? null
        : String(whatsappNumber).trim();

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        pendingProfileChange: {
          fullName: trimmedName,
          phone: normalizedPhone || "",
          whatsappNumber: normalizedWhats || "",
          submittedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile change submitted for admin approval. Your current profile stays live until approved.",
      data: { user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error updating profile",
    });
  }
};

exports.getPackage = async (req, res) => {
  try {
    const keys = [
      "vendor_subscription_fee",
      "vendor_subscription_duration_days",
      "vendor_trial_period_days",
      "vendor_package_benefits",
    ];
    const settings = await Settings.find({ key: { $in: keys } });
    const map = {};
    settings.forEach((s) => { map[s.key] = s.value; });

    res.status(200).json({
      success: true,
      data: {
        fee: map.vendor_subscription_fee ?? 0,
        durationDays: map.vendor_subscription_duration_days ?? 30,
        trialDays: map.vendor_trial_period_days ?? 0,
        benefits: Array.isArray(map.vendor_package_benefits) ? map.vendor_package_benefits : [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching vendor package",
    });
  }
};
