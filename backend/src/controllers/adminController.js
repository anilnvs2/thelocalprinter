const mongoose = require("mongoose");
const User = require("../models/User");
const Business = require("../models/Business");
const Category = require("../models/Category");
const PosterBoyProfile = require("../models/PosterBoyProfile");
const Settings = require("../models/Settings");
const ResellerApplication = require("../models/ResellerApplication");
const { ROLES } = require("../utils/constants");
const { applyBusinessPatch } = require("../utils/businessPatch");
const { validatePrintShopSelection } = require("../utils/businessValidation");

// ─── Dashboard ───

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalVendors,
      totalBusinesses,
      pendingBusinesses,
      activeBusinesses,
      inactiveBusinesses,
      recentUsers,
      recentVendors,
      recentBusinesses,
    ] = await Promise.all([
      User.countDocuments({ role: ROLES.USER }),
      User.countDocuments({ role: ROLES.VENDOR }),
      Business.countDocuments(),
      Business.countDocuments({ status: "pending" }),
      Business.countDocuments({ status: "approved", isActive: true }),
      Business.countDocuments({ status: "rejected" }),
      User.find({ role: ROLES.USER })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("fullName email role isActive createdAt"),
      User.find({ role: ROLES.VENDOR })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("fullName email role isActive createdAt"),
      Business.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("vendor", "fullName email")
        .select("name status isActive createdAt vendor"),
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalVendors,
          totalBusinesses,
          pendingBusinesses,
          activeBusinesses,
          inactiveBusinesses,
        },
        recentUsers,
        recentVendors,
        recentBusinesses,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching dashboard stats",
    });
  }
};

// ─── Users ───

exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const query = { role: ROLES.USER };
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { publicId: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("fullName email phone role publicId isActive createdAt registrationType approvalStatus resellerApprovalStatus whatsappNumber"),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
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
      message: "Server error fetching users",
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role === ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: "Cannot delete admin users",
      });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error deleting user",
    });
  }
};

// ─── Vendors ───

exports.getVendors = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const query = { role: ROLES.VENDOR };
    if (search) {
      const matchingBusinesses = await Business.find({
        name: { $regex: search, $options: "i" },
      })
        .select("vendor")
        .lean();
      const matchedVendorIds = matchingBusinesses.map((b) => b.vendor);
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { publicId: { $regex: search, $options: "i" } },
        { _id: { $in: matchedVendorIds } },
      ];
    }

    const [vendors, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("fullName email phone role publicId isActive createdAt approvalStatus"),
      User.countDocuments(query),
    ]);

    const vendorIds = vendors.map((v) => v._id);
    const businessStats = await Business.aggregate([
      { $match: { vendor: { $in: vendorIds } } },
      {
        $group: {
          _id: "$vendor",
          count: { $sum: 1 },
          names: { $push: "$name" },
        },
      },
    ]);

    const statMap = {};
    businessStats.forEach((b) => {
      statMap[b._id.toString()] = b;
    });

    const vendorsWithCount = vendors.map((v) => {
      const stat = statMap[v._id.toString()];
      return {
        ...v.toObject(),
        businessCount: stat ? stat.count : 0,
        businessNames: stat ? stat.names : [],
      };
    });

    res.status(200).json({
      success: true,
      data: {
        vendors: vendorsWithCount,
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
      message: "Server error fetching vendors",
    });
  }
};

exports.toggleVendorStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await User.findById(id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    if (vendor.role !== ROLES.VENDOR) {
      return res.status(400).json({
        success: false,
        message: "User is not a vendor",
      });
    }

    vendor.isActive = !vendor.isActive;
    await vendor.save();

    res.status(200).json({
      success: true,
      message: `Vendor ${vendor.isActive ? "activated" : "deactivated"}`,
      data: { vendor },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error toggling vendor status",
    });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await User.findById(id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    if (vendor.role !== ROLES.VENDOR) {
      return res.status(400).json({
        success: false,
        message: "User is not a vendor",
      });
    }

    await Business.deleteMany({ vendor: id });
    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Vendor and associated businesses deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error deleting vendor",
    });
  }
};

// ─── Businesses ───

exports.getBusinesses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const vendor = req.query.vendor || "";

    // Business-centric query: each row = one business
    const query = {};
    if (status) {
      query.status = status;
    }

    // Filter by owning vendor (used by the vendor business count drill-down)
    if (vendor) {
      if (!mongoose.isValidObjectId(vendor)) {
        return res.status(400).json({
          success: false,
          message: "Invalid vendor id",
        });
      }
      query.vendor = vendor;
    }

    // Search by business name, vendor name, vendor email, or vendor publicId
    if (search) {
      const vendorIds = await User.find({
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { publicId: { $regex: search, $options: "i" } },
        ],
      }).select("_id").lean();
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { vendor: { $in: vendorIds.map((u) => u._id) } },
      ];
    }

    const [businesses, total] = await Promise.all([
      Business.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("vendor", "fullName email publicId role isActive")
        .populate("categoryId", "name image")
        .populate("serviceIds", "name")
        .select("-__v")
        .lean(),
      Business.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        businesses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("getBusinesses error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching businesses",
    });
  }
};

exports.deleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;

    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    await Business.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Business deleted successfully",
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
    const { id } = req.params;
    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }
    business.isActive = !business.isActive;
    await business.save();
    res.status(200).json({
      success: true,
      message: `Business ${business.isActive ? "activated" : "deactivated"}`,
      data: { business },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error toggling business status" });
  }
};

// ─── Brand Recall / Trust Score (ADMIN-managed, optional, per business) ───
// PATCH /api/admin/businesses/:id/trust-score
// body: { brandRecallScore: 8.5 | null }   (null / "" removes the score)
// Authorisation is enforced by the router-level authenticateUser + authorizeRole("ADMIN").
// Only this single field is written, so no other business property can be reset.
exports.updateBusinessTrustScore = async (req, res) => {
  try {
    const { id } = req.params;
    const raw = req.body ? req.body.brandRecallScore : undefined;

    let score;
    if (raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "")) {
      score = null; // blank means "no score assigned"
    } else {
      score = typeof raw === "number" ? raw : Number(String(raw).trim());
      if (!Number.isFinite(score)) {
        return res.status(400).json({
          success: false,
          message: "Trust score must be a number between 0 and 10",
        });
      }
      if (score < 0 || score > 10) {
        return res.status(400).json({
          success: false,
          message: "Trust score must be between 0 and 10",
        });
      }
    }

    const business = await Business.findById(id).select("_id name brandRecallScore");
    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    // $set on a single key: unrelated business fields are never touched.
    await Business.updateOne({ _id: business._id }, { $set: { brandRecallScore: score } });
    business.brandRecallScore = score;

    res.status(200).json({
      success: true,
      message: score === null
        ? "Trust score removed"
        : `Trust score ${score}/10 saved`,
      data: { businessId: business._id, name: business.name, brandRecallScore: score },
    });
  } catch (error) {
    console.error("updateBusinessTrustScore error:", error);
    res.status(500).json({ success: false, message: "Server error saving trust score" });
  }
};

// ─── Get Business by ID (Admin - full details) ───

exports.getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;

    // First try as a Business document ID
    let business = await Business.findById(id)
      .select("+googleBusinessProfileLink +gstNumber +fraudReport")
      .populate("vendor", "fullName email phone role publicId")
      .populate("categoryId", "name image")
      .populate("serviceIds", "name")
      .populate("additionalCategories.categoryId", "name image")
      .populate("additionalCategories.serviceIds", "name");

    // If not found, try as a User ID → find their business
    if (!business) {
      const user = await User.findById(id).select("fullName email phone role publicId registrationType approvalStatus resellerApprovalStatus whatsappNumber isActive createdAt");
      if (user) {
        business = await Business.findOne({ vendor: user._id })
          .select("+googleBusinessProfileLink +gstNumber +fraudReport")
          .populate("categoryId", "name image")
          .populate("serviceIds", "name")
          .populate("additionalCategories.categoryId", "name image")
          .populate("additionalCategories.serviceIds", "name");

        if (business) {
          // Attach the vendor user data manually since we looked up by user ID
          business = business.toObject();
          business.vendor = user;
        }
      }
    }

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
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

// ─── Update Business by ID (Admin) ───

exports.adminUpdateBusiness = async (req, res) => {
  try {
    const { id } = req.params;

    let business = await Business.findById(id);

    // If not found as a Business ID, try as a User ID → find their business
    if (!business) {
      const user = await User.findById(id);
      if (user) {
        business = await Business.findOne({ vendor: user._id });
      }
    }

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    const data = req.body;

    const printShopErrors = await validatePrintShopSelection(data, business);
    if (printShopErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: printShopErrors.join(" "),
        errors: printShopErrors,
      });
    }

    if (data.name !== undefined) business.name = data.name.trim();
    if (data.description !== undefined) business.description = data.description;
    if (data.establishedYear !== undefined) business.establishedYear = data.establishedYear;
    if (data.workingHours !== undefined) business.workingHours = data.workingHours;

    if (data.contactName !== undefined) business.contactName = data.contactName;
    if (data.phone !== undefined) business.phone = data.phone;
    if (data.whatsapp !== undefined) business.whatsapp = data.whatsapp;
    if (data.contactEmail !== undefined) business.contactEmail = data.contactEmail;
    if (data.website !== undefined) business.website = data.website;

    if (data.category !== undefined) business.category = data.category;
    if (data.categoryId !== undefined) business.categoryId = data.categoryId;
    if (data.serviceIds !== undefined) business.serviceIds = data.serviceIds;
    // Admin-only multi-category support: each entry pairs a category with the
    // services selected under it, plus admin-assigned tags for it. Entries
    // without a categoryId are dropped. Tags are trimmed, de-duplicated and
    // capped so a bad payload cannot bloat the document.
    const cleanTags = (tags) => {
      if (!Array.isArray(tags)) return [];
      const seen = new Set();
      const out = [];
      for (const t of tags) {
        const v = typeof t === "string" ? t.trim() : "";
        if (!v) continue;
        const key = v.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(v.slice(0, 60));
        if (out.length >= 30) break;
      }
      return out;
    };
    if (data.additionalCategories !== undefined) {
      business.additionalCategories = (Array.isArray(data.additionalCategories) ? data.additionalCategories : [])
        .map((entry) => ({
          categoryId: entry?.categoryId || null,
          serviceIds: Array.isArray(entry?.serviceIds)
            ? entry.serviceIds.filter((s) => s)
            : [],
          tags: cleanTags(entry?.tags),
        }))
        .filter((entry) => entry.categoryId);
    }
    if (data.tags !== undefined) business.tags = cleanTags(data.tags);
    if (data.address !== undefined) business.address = data.address;
    if (data.city !== undefined) business.city = data.city;
    if (data.gpsCoordinates !== undefined) business.gpsCoordinates = data.gpsCoordinates;
    if (data.googleBusinessProfileLink !== undefined) business.googleBusinessProfileLink = data.googleBusinessProfileLink;

    if (data.gstAvailable !== undefined) business.gstAvailable = data.gstAvailable;
    if (data.gstNumber !== undefined) business.gstNumber = data.gstNumber;

    if (data.orderLimits !== undefined) business.orderLimits = data.orderLimits;
    if (data.serviceType !== undefined) business.serviceType = data.serviceType;
    if (data.customerType !== undefined) business.customerType = data.customerType;
    if (data.orderingMethod !== undefined) business.orderingMethod = data.orderingMethod;
    if (data.paymentModes !== undefined) business.paymentModes = data.paymentModes;

    if (data.socialMedia !== undefined) business.socialMedia = data.socialMedia;
    if (data.verificationMedia !== undefined) business.verificationMedia = data.verificationMedia;

    if (data.languages !== undefined) business.languages = data.languages;

    if (data.returnReplacementPolicy !== undefined) business.returnReplacementPolicy = data.returnReplacementPolicy;
    if (data.inHouseDesignerAvailable !== undefined) business.inHouseDesignerAvailable = data.inHouseDesignerAvailable;
    if (data.customerLocationVisitAvailable !== undefined) business.customerLocationVisitAvailable = data.customerLocationVisitAvailable;
    if (data.addonServices !== undefined) business.addonServices = data.addonServices;

    if (data.sampleDisplayAvailable !== undefined) business.sampleDisplayAvailable = data.sampleDisplayAvailable;
    if (data.preferredFileFormats !== undefined) business.preferredFileFormats = data.preferredFileFormats;

    if (data.acceptsPurchaseOrder !== undefined) business.acceptsPurchaseOrder = data.acceptsPurchaseOrder;
    if (data.fraudReport !== undefined) {
      // Blank rows are dropped so admin edits do not create empty hotlist entries.
      business.fraudReport = (Array.isArray(data.fraudReport) ? data.fraudReport : [])
        .map((entry) => ({
          contactName: String(entry?.contactName || "").trim(),
          designation: String(entry?.designation || "").trim(),
          contactNumber: String(entry?.contactNumber || "").trim(),
        }))
        .filter((entry) => entry.contactName || entry.designation || entry.contactNumber);
    }

    if (data.status !== undefined) business.status = data.status;
    if (data.isActive !== undefined) business.isActive = data.isActive;

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

// ─── Approvals ───

exports.getPendingApprovals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // New business registrations + vendor changes awaiting review
    const query = {
      $or: [
        { status: "pending" },
        { "pendingChange.type": { $in: ["EDIT", "DELETE"] } },
      ],
    };

    const [businesses, total, profileChanges] = await Promise.all([
      Business.find(query)
        .sort({ "pendingChange.submittedAt": -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("vendor", "fullName email")
        .select(
          "name description city status isActive createdAt vendor pendingChange"
        ),
      Business.countDocuments(query),
      User.find({ role: ROLES.VENDOR, pendingProfileChange: { $ne: null } })
        .sort({ "pendingProfileChange.submittedAt": -1 })
        .limit(50)
        .select(
          "fullName email publicId pendingProfileChange createdAt updatedAt"
        ),
    ]);

    res.status(200).json({
      success: true,
      data: {
        businesses,
        profileChanges: profileChanges || [],
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
      message: "Server error fetching pending approvals",
    });
  }
};

exports.updateBusinessStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected",
      });
    }

    let business = await Business.findById(id);

    // If not found as a Business ID, try as a User ID → find their business
    if (!business) {
      const user = await User.findById(id);
      if (user) {
        business = await Business.findOne({ vendor: user._id });
      }
    }

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    const pendingChange = business.pendingChange;
    const hasPendingChange =
      !!pendingChange && (pendingChange.type === "EDIT" || pendingChange.type === "DELETE");
    const wasApproved = business.status === "approved";
    let message = `Business ${status}`;

    if (status === "approved") {
      if (hasPendingChange && pendingChange.type === "DELETE") {
        await Business.findByIdAndDelete(business._id);
        return res.status(200).json({
          success: true,
          message: "Business delete request approved. Business deleted.",
          data: { business: null, deleted: true },
        });
      }

      if (hasPendingChange) {
        applyBusinessPatch(business, pendingChange.data || {});
        if (pendingChange.data && pendingChange.data.isActive !== undefined) {
          business.isActive = pendingChange.data.isActive;
        }
        business.pendingChange = null;
        message = "Business changes approved and published";
      }

      if (business.status !== "approved") {
        business.status = "approved";
        if (!hasPendingChange) message = "Business approved";
      }
    } else {
      // rejected
      business.pendingChange = null;
      if (!wasApproved) {
        business.status = "rejected";
        message = "Business rejected";
      } else {
        message = "Changes rejected. The published listing stays unchanged.";
      }
    }

    await business.save();
    await business.populate("vendor", "fullName email");

    res.status(200).json({
      success: true,
      message,
      data: { business },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error updating business status",
    });
  }
};

// ─── User Status Toggle ───

exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role === ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: "Cannot toggle admin status",
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"}`,
      data: { user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error toggling user status",
    });
  }
};

// ─── Update User (Admin) ───

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("fullName email phone role publicId isActive createdAt updatedAt registrationType approvalStatus resellerApprovalStatus whatsappNumber");

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
      message: "Server error fetching user",
    });
  }
};

exports.adminUpdateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const existingUser = await User.findById(id).select("_id role");
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const data = req.body;
    const update = {};

    if (data.fullName !== undefined) update.fullName = data.fullName.trim();
    if (data.email !== undefined) update.email = data.email.trim().toLowerCase();
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.whatsappNumber !== undefined) update.whatsappNumber = data.whatsappNumber;
    if (data.role !== undefined && existingUser.role !== ROLES.ADMIN) {
      update.role = data.role;
    }
    if (data.registrationType !== undefined) update.registrationType = data.registrationType;
    if (data.isActive !== undefined && existingUser.role !== ROLES.ADMIN) {
      update.isActive = data.isActive;
    }

    // Admin edits win over any vendor submitted profile change.
    update.pendingProfileChange = null;

    const user = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true });

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: { user },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error updating user",
    });
  }
};

// ─── Categories ───

exports.getCategories = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const query = { type: "parent" };
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const [parentCategories, total] = await Promise.all([
      Category.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Category.countDocuments(query),
    ]);

    const parentIds = parentCategories.map((c) => c._id);
    const subcategories = await Category.find({
      type: "subcategory",
      parentId: { $in: parentIds },
    }).sort({ name: 1 });

    const subMap = {};
    subcategories.forEach((sub) => {
      const pid = sub.parentId.toString();
      if (!subMap[pid]) subMap[pid] = [];
      subMap[pid].push(sub);
    });

    const categoriesWithSubs = parentCategories.map((cat) => ({
      ...cat.toObject(),
      services: subMap[cat._id.toString()] || [],
    }));

    res.status(200).json({
      success: true,
      data: {
        categories: categoriesWithSubs,
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
      message: "Server error fetching categories",
    });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description, type, parentId, image, kind } = req.body;
    const categoryType = type || "parent";

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    if (categoryType === "subcategory" && !parentId) {
      return res.status(400).json({
        success: false,
        message: "Parent category is required for subcategory",
      });
    }

    if (categoryType === "subcategory") {
      const parent = await Category.findById(parentId);
      if (!parent || parent.type !== "parent") {
        return res.status(400).json({
          success: false,
          message: "Invalid parent category",
        });
      }
    }

    const existing = await Category.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    const category = await Category.create({
      name: name.trim(),
      description: description || "",
      type: categoryType,
      parentId: categoryType === "subcategory" ? parentId : null,
      image: image || "",
      // Staffing categories list people (Poster Boy), never businesses.
      kind: categoryType === "parent" && kind === "staffing" ? "staffing" : "business",
    });

    res.status(201).json({
      success: true,
      message: categoryType === "subcategory" ? "Subcategory created successfully" : "Category created successfully",
      data: { category },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error creating category",
    });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, parentId, image, kind } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (category.type === "subcategory" && parentId) {
      const parent = await Category.findById(parentId);
      if (!parent || parent.type !== "parent") {
        return res.status(400).json({
          success: false,
          message: "Invalid parent category",
        });
      }
      category.parentId = parentId;
    }

    if (name && name.trim() !== category.name) {
      const existing = await Category.findOne({
        name: { $regex: `^${name.trim()}$`, $options: "i" },
        _id: { $ne: id },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Category with this name already exists",
        });
      }
      category.name = name.trim();
    }

    if (description !== undefined) {
      category.description = description;
    }

    if (category.type === "parent" && image !== undefined) {
      category.image = image || "";
    }

    if (category.type === "subcategory" && image !== undefined) {
      category.image = image || "";
    }

    if (category.type === "parent" && kind !== undefined) {
      category.kind = kind === "staffing" ? "staffing" : "business";
    }

    await category.save();

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: { category },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error updating category",
    });
  }
};

exports.toggleCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.isActive = !category.isActive;
    await category.save();

    if (category.type === "parent") {
      await Category.updateMany(
        { parentId: category._id },
        { isActive: category.isActive }
      );
    }

    res.status(200).json({
      success: true,
      message: `Category ${category.isActive ? "activated" : "deactivated"}`,
      data: { category },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error toggling category status",
    });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    let subIds = [];
    if (category.type === "parent") {
      const subs = await Category.find({ parentId: id }).select("_id");
      subIds = subs.map((s) => s._id);
      if (subIds.length > 0) {
        await Category.deleteMany({ parentId: id });
      }
    }

    // Unlink the category (and its subcategories) from businesses and
    // poster-boy profiles so no dangling ObjectIds are left behind.
    const PosterBoyProfile = require("../models/PosterBoyProfile");
    const removedIds = [category._id, ...subIds];
    await Promise.all([
      Business.updateMany({ categoryId: category._id }, { $set: { categoryId: null } }),
      PosterBoyProfile.updateMany({ categoryId: category._id }, { $set: { categoryId: null } }),
      Business.updateMany({ serviceIds: { $in: removedIds } }, { $pull: { serviceIds: { $in: removedIds } } }),
      PosterBoyProfile.updateMany({ skillIds: { $in: removedIds } }, { $pull: { skillIds: { $in: removedIds } } }),
    ]);

    await Category.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error deleting category",
    });
  }
};

exports.createSubcategory = async (req, res) => {
  try {
    const { name, parentId, description, image } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subcategory name is required",
      });
    }

    if (!parentId) {
      return res.status(400).json({
        success: false,
        message: "Parent category is required",
      });
    }

    const parent = await Category.findById(parentId);
    if (!parent || parent.type !== "parent") {
      return res.status(400).json({
        success: false,
        message: "Invalid parent category",
      });
    }

    const existing = await Category.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Subcategory with this name already exists",
      });
    }

    const subcategory = await Category.create({
      name: name.trim(),
      description: description || "",
      image: image || "",
      type: "subcategory",
      parentId,
    });

    res.status(201).json({
      success: true,
      message: "Subcategory created successfully",
      data: { category: subcategory },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Subcategory with this name already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error creating subcategory",
    });
  }
};

exports.updateSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parentId, description, image, isActive } = req.body;

    const subcategory = await Category.findById(id);
    if (!subcategory || subcategory.type !== "subcategory") {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    if (parentId) {
      const parent = await Category.findById(parentId);
      if (!parent || parent.type !== "parent") {
        return res.status(400).json({
          success: false,
          message: "Invalid parent category",
        });
      }
      subcategory.parentId = parentId;
    }

    if (name && name.trim() !== subcategory.name) {
      const existing = await Category.findOne({
        name: { $regex: `^${name.trim()}$`, $options: "i" },
        _id: { $ne: id },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Subcategory with this name already exists",
        });
      }
      subcategory.name = name.trim();
    }

    if (description !== undefined) {
      subcategory.description = description;
    }

    if (image !== undefined) {
      subcategory.image = image || "";
    }

    if (isActive !== undefined) {
      subcategory.isActive = !!isActive;
    }

    await subcategory.save();

    res.status(200).json({
      success: true,
      message: "Subcategory updated successfully",
      data: { category: subcategory },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Subcategory with this name already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error updating subcategory",
    });
  }
};

exports.deleteSubcategory = async (req, res) => {
  try {
    const { id } = req.params;

    const subcategory = await Category.findById(id);
    if (!subcategory || subcategory.type !== "subcategory") {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    // Unlink from businesses (serviceIds) and poster-boy profiles (skillIds)
    const PosterBoyProfile = require("../models/PosterBoyProfile");
    const parentId = subcategory.parentId;
    const slug = subcategory.slug;
    await Promise.all([
      Business.updateMany({ serviceIds: id }, { $pull: { serviceIds: id } }),
      PosterBoyProfile.updateMany({ skillIds: id }, { $pull: { skillIds: id } }),
    ]);

    await Category.findByIdAndDelete(id);

    // Tombstone the slug on the parent: if a builtin static default shares
    // this slug, the client merge keeps suppressing it so a hard delete can
    // never resurrect the chip. $addToSet avoids duplicates; harmless when
    // no static twin exists.
    if (parentId && slug) {
      await Category.updateOne({ _id: parentId }, { $addToSet: { hiddenSubs: slug } });
    }

    res.status(200).json({
      success: true,
      message: "Subcategory deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error deleting subcategory",
    });
  }
};

// ─── Business tags (admin tag picker suggestions) ───

// Every distinct tag currently used on businesses — global `tags` plus the
// admin-assigned per-category (`additionalCategories.tags`) tags — so the
// admin can pick existing tags or type new ones.
exports.getAllTags = async (req, res) => {
  try {
    const [globalTags, categoryTags] = await Promise.all([
      Business.distinct("tags"),
      Business.distinct("additionalCategories.tags"),
    ]);
    const seen = new Set();
    const tags = [];
    for (const t of [...(globalTags || []), ...(categoryTags || [])]) {
      const v = typeof t === "string" ? t.trim() : "";
      if (!v) continue;
      const key = v.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      tags.push(v);
    }
    tags.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    res.status(200).json({ success: true, data: { tags } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching tags",
    });
  }
};

// ─── Settings ───

const DEFAULT_SETTINGS = [
  { key: "platform_name", value: "Local Printer", category: "general", description: "Platform display name" },
  { key: "platform_email", value: "admin@localprinter.com", category: "general", description: "Platform contact email" },
  { key: "platform_phone", value: "", category: "general", description: "Platform contact phone" },
  { key: "platform_description", value: "Find local printing businesses near you", category: "general", description: "Platform tagline" },
  { key: "vendor_subscription_fee", value: 0, category: "subscription", description: "Vendor subscription fee (0 = free)" },
  { key: "vendor_subscription_duration_days", value: 30, category: "subscription", description: "Vendor subscription duration in days" },
  { key: "vendor_trial_period_days", value: 0, category: "subscription", description: "Vendor free trial period in days (0 = no trial)" },
  { key: "vendor_package_benefits", value: [], category: "subscription", description: "List of vendor package benefit points" },
  { key: "user_subscription_fee", value: 0, category: "subscription", description: "User subscription fee (0 = free)" },
  { key: "user_subscription_duration_days", value: 30, category: "subscription", description: "User subscription duration in days" },
  { key: "user_trial_period_days", value: 0, category: "subscription", description: "User free trial period in days (0 = no trial)" },
  { key: "user_package_benefits", value: [], category: "subscription", description: "List of user package benefit points" },
  { key: "business_approval_required", value: true, category: "platform", description: "Require admin approval for new businesses" },
  { key: "vendor_approval_required", value: false, category: "platform", description: "Require admin approval for new vendors" },
  { key: "user_registration_enabled", value: true, category: "platform", description: "Allow new user registrations" },
  { key: "maintenance_mode", value: false, category: "platform", description: "Enable maintenance mode" },
];

exports.getSettings = async (req, res) => {
  try {
    const category = req.query.category || "";

    const query = {};
    if (category) {
      query.category = category;
    }

    let settings = await Settings.find(query).sort({ category: 1, key: 1 });

    if (settings.length === 0) {
      await Settings.insertMany(DEFAULT_SETTINGS);
      settings = await Settings.find(query).sort({ category: 1, key: 1 });
    }

    const grouped = { general: [], subscription: [], platform: [] };
    settings.forEach((s) => {
      if (grouped[s.category]) {
        grouped[s.category].push(s);
      }
    });

    res.status(200).json({
      success: true,
      data: { settings: grouped },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching settings",
    });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({
        success: false,
        message: "Settings array is required",
      });
    }

    const operations = settings.map((s) => {
      const updateDoc = { value: s.value };
      if (s.category) updateDoc.category = s.category;
      if (s.description) updateDoc.description = s.description;

      return {
        updateOne: {
          filter: { key: s.key },
          update: { $set: updateDoc },
          upsert: true,
        },
      };
    });

    await Settings.bulkWrite(operations);

    res.status(200).json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error updating settings",
    });
  }
};

// ─── Reseller Applications ───

exports.getResellerApplications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status || "";
    const search = req.query.search || "";

    const query = {};
    if (status) query.status = status;
    if (search) {
      const matchingUsers = await User.find({
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");
      query.user = { $in: matchingUsers.map((u) => u._id) };
    }

    const [applications, total] = await Promise.all([
      ResellerApplication.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "fullName email phone whatsappNumber publicId"),
      ResellerApplication.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        applications,
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
      message: "Server error fetching reseller applications",
    });
  }
};

exports.getResellerApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await ResellerApplication.findById(id).populate(
      "user",
      "fullName email phone whatsappNumber publicId role registrationType"
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Reseller application not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { application },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching reseller application",
    });
  }
};

exports.deleteResellerApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await ResellerApplication.findById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Reseller application not found",
      });
    }

    await ResellerApplication.findByIdAndDelete(id);

    if (application.user) {
      await User.findByIdAndUpdate(application.user, {
        resellerApprovalStatus: null,
      });
    }

    res.status(200).json({
      success: true,
      message: "Reseller application deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error deleting reseller application",
    });
  }
};

// Manual approval of a reseller application (Admin Dashboard -> Businesses).
// The existing user account is updated in place: no second account is created.
exports.approveResellerApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await ResellerApplication.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Reseller application not found",
      });
    }

    if (application.status === "APPROVED") {
      return res.status(400).json({
        success: false,
        message: "Reseller application is already approved",
      });
    }

    application.status = "APPROVED";
    await application.save();

    let user = null;
    if (application.user) {
      user = await User.findByIdAndUpdate(
        application.user,
        {
          registrationType: "RESELLER",
          resellerApprovalStatus: "APPROVED",
        },
        { new: true }
      ).select(
        "fullName email publicId role registrationType approvalStatus resellerApprovalStatus isActive"
      );
    }

    res.status(200).json({
      success: true,
      message: "Reseller application approved",
      data: { application, user },
    });
  } catch (error) {
    console.error("approveResellerApplication error:", error);
    res.status(500).json({
      success: false,
      message: "Server error approving reseller application",
    });
  }
};

exports.updateUserApprovalStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Account approval only applies to roles whose sign-up is gated by the
    // admin: vendors (legacy) and poster boys. Regular users are never held.
    if (![ROLES.VENDOR, ROLES.POSTER_BOY].includes(user.role)) {
      return res.status(400).json({
        success: false,
        message: "Approval is only available for vendor or poster boy accounts",
      });
    }

    const updateData = { approvalStatus: status };

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select("fullName email role publicId approvalStatus resellerApprovalStatus registrationType isActive");

    // Worker boys submit their profile form BEFORE account approval, so this
    // single review also settles the submitted profile (one approval step).
    if (user.role === ROLES.POSTER_BOY) {
      const PosterBoyProfile = require("../models/PosterBoyProfile");
      await PosterBoyProfile.updateOne(
        { user: user._id },
        { $set: { status: status === "approved" ? "approved" : "rejected" } }
      );
    }

    res.status(200).json({
      success: true,
      message: `${user.role === ROLES.POSTER_BOY ? "Poster boy" : "Vendor"} account ${status}`,
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error("updateUserApprovalStatus error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating user approval status",
    });
  }
};

// ─── Vendor Profile Change Approval ───

exports.updateProfileChangeStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected",
      });
    }

    const user = await User.findById(id);
    if (!user || user.role !== ROLES.VENDOR) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    if (!user.pendingProfileChange) {
      return res.status(404).json({
        success: false,
        message: "No pending profile change for this vendor",
      });
    }

    if (status === "approved") {
      const change = user.pendingProfileChange;
      const update = { pendingProfileChange: null };

      if (change.fullName) update.fullName = change.fullName;
      if (change.phone !== undefined && change.phone !== null) update.phone = change.phone;
      if (change.whatsappNumber !== undefined && change.whatsappNumber !== null) {
        update.whatsappNumber = change.whatsappNumber;
      }

      const updatedUser = await User.findByIdAndUpdate(id, update, { new: true }).select(
        "fullName email phone whatsappNumber role publicId pendingProfileChange"
      );

      return res.status(200).json({
        success: true,
        message: "Profile change approved and applied",
        data: { user: updatedUser },
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { pendingProfileChange: null },
      { new: true }
    ).select(
      "fullName email phone whatsappNumber role publicId pendingProfileChange"
    );

    res.status(200).json({
      success: true,
      message: "Profile change rejected",
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error("updateProfileChangeStatus error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating profile change status",
    });
  }
};

exports.getDashboardGrowth = async (req, res) => {
  try {
    const period = req.query.period || "30d";
    const now = new Date();
    let startDate;
    let groupFormat;
    let dateFormat;

    switch (period) {
      case "7d":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        groupFormat = "%Y-%m-%d";
        dateFormat = "daily";
        break;
      case "6m":
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 6);
        groupFormat = "%Y-%m";
        dateFormat = "monthly";
        break;
      case "1y":
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        groupFormat = "%Y-%m";
        dateFormat = "monthly";
        break;
      case "30d":
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        groupFormat = "%Y-%m-%d";
        dateFormat = "daily";
        break;
    }

    const [usersBefore, vendorsBefore, businessesBefore] = await Promise.all([
      User.countDocuments({ createdAt: { $lt: startDate }, role: ROLES.USER }),
      User.countDocuments({ createdAt: { $lt: startDate }, role: ROLES.VENDOR }),
      Business.countDocuments({ createdAt: { $lt: startDate } }),
    ]);

    const matchStage = { createdAt: { $gte: startDate } };

    const [userGrowth, vendorGrowth, businessGrowth] = await Promise.all([
      User.aggregate([
        { $match: { ...matchStage, role: ROLES.USER } },
        { $group: { _id: { $dateToString: { format: groupFormat, date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        { $match: { ...matchStage, role: ROLES.VENDOR } },
        { $group: { _id: { $dateToString: { format: groupFormat, date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Business.aggregate([
        { $match: matchStage },
        { $group: { _id: { $dateToString: { format: groupFormat, date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const buildMap = (data) => {
      const map = {};
      data.forEach((d) => { map[d._id] = d.count; });
      return map;
    };

    const userMap = buildMap(userGrowth);
    const vendorMap = buildMap(vendorGrowth);
    const businessMap = buildMap(businessGrowth);

    const allDates = [];
    const cursor = new Date(startDate);
    const end = new Date(now);

    if (dateFormat === "daily") {
      while (cursor <= end) {
        allDates.push(cursor.toISOString().split("T")[0]);
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      cursor.setDate(1);
      while (cursor <= end) {
        allDates.push(
          `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`
        );
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    let cumUsers = usersBefore;
    let cumVendors = vendorsBefore;
    let cumBusinesses = businessesBefore;

    const result = allDates.map((date) => {
      cumUsers += userMap[date] || 0;
      cumVendors += vendorMap[date] || 0;
      cumBusinesses += businessMap[date] || 0;
      return {
        date,
        users: cumUsers,
        vendors: cumVendors,
        businesses: cumBusinesses,
      };
    });

    res.status(200).json({ success: true, data: { growth: result, period } });
  } catch (error) {
    console.error("getDashboardGrowth error:", error);
    res.status(500).json({ success: false, message: "Server error fetching growth data" });
  }
};

exports.getBusinessStatusCounts = async (req, res) => {
  try {
    const [approved, pending, rejected, active] = await Promise.all([
      Business.countDocuments({ status: "approved" }),
      Business.countDocuments({ status: "pending" }),
      Business.countDocuments({ status: "rejected" }),
      Business.countDocuments({ status: "approved", isActive: true }),
    ]);

    res.status(200).json({
      success: true,
      data: { approved, pending, rejected, active },
    });
  } catch (error) {
    console.error("getBusinessStatusCounts error:", error);
    res.status(500).json({ success: false, message: "Server error fetching business status" });
  }
};

exports.getPendingApprovalsCount = async (req, res) => {
  try {
    const [pendingBusinesses, pendingChanges, profileChanges, posterBoyChanges] =
      await Promise.all([
        Business.countDocuments({ status: "pending" }),
        Business.countDocuments({
          "pendingChange.type": { $in: ["EDIT", "DELETE"] },
        }),
        User.countDocuments({
          role: ROLES.VENDOR,
          pendingProfileChange: { $ne: null },
        }),
        // Worker-boy profile edits staged by approved poster boys.
        PosterBoyProfile.countDocuments({ "pendingChange.data": { $ne: null } }),
      ]);

    const total = pendingBusinesses + pendingChanges + profileChanges;

    res.status(200).json({
      success: true,
      data: {
        total,
        businesses: pendingBusinesses,
        changes: pendingChanges,
        profileChanges,
        // Reviewed under the Poster Boys tab, not Approvals — kept out of
        // `total` so the Approvals badge stays exact.
        posterBoyChanges,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching pending approvals count",
    });
  }
};
