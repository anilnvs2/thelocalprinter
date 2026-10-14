const User = require("../models/User");
const PosterBoyProfile = require("../models/PosterBoyProfile");
const Category = require("../models/Category");
const {
  POSTER_BOY_CATEGORY_SLUG,
  getSkillMap,
  resolveSkillIds,
  deriveCityFromAddress,
} = require("../utils/posterBoyCategory");

const SKILL_MAX = 30;
const SKILL_LENGTH_MAX = 60;
const WORK_MEDIA_MAX = 10;
const ADDRESS_MIN = 5;
const ADDRESS_MAX = 300;

const WORK_RADIUS_OPTIONS = ["10 km to 30 km", "No Limit"];
const STRENGTH_OPTIONS = ["Single Person", "Team"];
const ORDER_ACCEPTED_OPTIONS = ["Small", "Medium", "Bulk", "No Limit"];
const BOOKING_TIMELINE_OPTIONS = ["1 day prior", "2 days prior", "Sameday"];
const WORK_TIMING_OPTIONS = ["Day Only", "Day & Night"];

const PROFILE_FIELDS = [
  "aadhaarNumber",
  "languages",
  "address",
  "city",
  "gpsCoordinates",
  "skills",
  "categoryId",
  "skillIds",
  "workRadius",
  "strength",
  "orderAccepted",
  "bookingTimeline",
  "workTiming",
  "workMedia",
];

const sanitizeProfileData = (body) => ({
  aadhaarNumber: typeof body.aadhaarNumber === "string" ? body.aadhaarNumber.trim() : "",
  languages: Array.isArray(body.languages) ? body.languages : [],
  address: typeof body.address === "string" ? body.address.trim() : "",
  city: typeof body.city === "string" ? body.city.trim() : "",
  gpsCoordinates: {
    lat:
      body.gpsCoordinates && body.gpsCoordinates.lat !== undefined && body.gpsCoordinates.lat !== null && body.gpsCoordinates.lat !== ""
        ? Number(body.gpsCoordinates.lat)
        : null,
    lng:
      body.gpsCoordinates && body.gpsCoordinates.lng !== undefined && body.gpsCoordinates.lng !== null && body.gpsCoordinates.lng !== ""
        ? Number(body.gpsCoordinates.lng)
        : null,
  },
  skills: Array.isArray(body.skills) ? body.skills : [],
  workRadius: typeof body.workRadius === "string" ? body.workRadius.trim() : "",
  strength: typeof body.strength === "string" ? body.strength.trim() : "",
  orderAccepted: Array.isArray(body.orderAccepted)
    ? [...new Set(body.orderAccepted.filter((o) => typeof o === "string" && o.trim()).map((o) => o.trim()))]
    : [],
  bookingTimeline: typeof body.bookingTimeline === "string" ? body.bookingTimeline.trim() : "",
  workTiming: typeof body.workTiming === "string" ? body.workTiming.trim() : "",
  workMedia: Array.isArray(body.workMedia) ? body.workMedia : [],
});

const validateProfile = (data) => {
  const errors = {};

  if (!/^\d{12}$/.test(data.aadhaarNumber)) {
    errors.aadhaarNumber = "Aadhaar number must be exactly 12 digits";
  }

  const languages = data.languages
    .filter((l) => typeof l === "string" && l.trim())
    .map((l) => l.trim());
  if (languages.length < 1) {
    errors.languages = "Please select at least one language";
  } else if (languages.some((l) => l.toLowerCase() === "other")) {
    // "Other" is only a UI affordance — the real value is typed by the worker.
    errors.languages = 'Please type your language instead of saving "Other"';
  }

  if (data.address.length < ADDRESS_MIN) {
    errors.address = `Address must be at least ${ADDRESS_MIN} characters`;
  } else if (data.address.length > ADDRESS_MAX) {
    errors.address = `Address must be at most ${ADDRESS_MAX} characters`;
  }

  const skills = [...new Set(data.skills.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim()))];
  if (skills.length < 1) {
    errors.skills = "Please select at least one skill";
  } else if (skills.length > SKILL_MAX) {
    errors.skills = `You can add at most ${SKILL_MAX} skills`;
  } else if (skills.some((s) => s.length > SKILL_LENGTH_MAX)) {
    errors.skills = `Each skill must be at most ${SKILL_LENGTH_MAX} characters`;
  } else if (skills.some((s) => s.toLowerCase() === "others")) {
    // "Others" is only a UI affordance — the real value lives in the custom chips.
    errors.skills = 'Please type your custom skill instead of saving "Others"';
  }

  const workMedia = data.workMedia.filter((m) => m && typeof m.url === "string" && m.url.trim());
  if (workMedia.length < 1) {
    errors.workMedia = "At least one work photo or video is required";
  } else if (workMedia.length > WORK_MEDIA_MAX) {
    errors.workMedia = `You can upload at most ${WORK_MEDIA_MAX} work images or videos`;
  } else if (workMedia.some((m) => !/^https?:\/\//.test(m.url.trim()))) {
    errors.workMedia = "Work media URLs must be valid http(s) links";
  } else if (workMedia.some((m) => !["image", "video"].includes(m.resourceType))) {
    errors.workMedia = "Work media type must be image or video";
  }

  if (!WORK_RADIUS_OPTIONS.includes(data.workRadius)) {
    errors.workRadius = "Please select your work radius (10 km to 30 km, or No Limit)";
  }
  if (!STRENGTH_OPTIONS.includes(data.strength)) {
    errors.strength = "Please select Single Person or Team";
  }
  if (data.orderAccepted.length < 1) {
    errors.orderAccepted = "Please select at least one order size";
  } else if (data.orderAccepted.some((o) => !ORDER_ACCEPTED_OPTIONS.includes(o))) {
    errors.orderAccepted = "Order size must be Small, Medium, Bulk, or No Limit";
  }
  if (!BOOKING_TIMELINE_OPTIONS.includes(data.bookingTimeline)) {
    errors.bookingTimeline = "Please select your booking timeline";
  }
  if (!WORK_TIMING_OPTIONS.includes(data.workTiming)) {
    errors.workTiming = "Please select Day Only or Day & Night";
  }

  return { errors, skills, languages, workMedia };
};

const buildPayload = (data, skills, languages, workMedia) => ({
  aadhaarNumber: data.aadhaarNumber,
  languages,
  address: data.address,
  city: data.city,
  gpsCoordinates: data.gpsCoordinates,
  skills,
  workRadius: data.workRadius,
  strength: data.strength,
  orderAccepted: data.orderAccepted,
  bookingTimeline: data.bookingTimeline,
  workTiming: data.workTiming,
  workMedia: workMedia.map((m) => ({ url: m.url.trim(), resourceType: m.resourceType })),
});

/**
 * Resolves the "Poster Boy" parent category id and the skill-name -> subcategory-id
 * map so the public listing can filter by category or by an individual skill.
 * Custom ("Others") skills resolve to no id and stay searchable as free text.
 */
const getPosterBoyCategoryRefs = async () => {
  const parent = await Category.findOne({ slug: POSTER_BOY_CATEGORY_SLUG });
  if (!parent) return { categoryId: null, skillMap: new Map() };
  return { categoryId: parent._id, skillMap: await getSkillMap(parent._id) };
};

const readApprovedUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return { error: { status: 404, message: "User not found" } };
  if (user.role !== "POSTER_BOY") {
    return { error: { status: 403, message: "Access denied. Insufficient permissions." } };
  }
  // Form-before-approval flow: a pending account MAY read and submit the
  // profile form — that submission is what the admin reviews. Only rejected
  // accounts are locked out.
  if (user.approvalStatus === "rejected") {
    return {
      error: {
        status: 403,
        message: "Account has been rejected. Please contact support.",
      },
    };
  }
  return { user };
};

const publicUser = (user) => ({
  fullName: user.fullName,
  email: user.email,
  phone: user.phone || null,
  whatsappNumber: user.whatsappNumber || null,
  approvalStatus: user.approvalStatus,
  publicId: user.publicId || null,
});

const shapeProfile = (profile) => {
  if (!profile) return null;
  return {
    _id: profile._id,
    aadhaarNumber: profile.aadhaarNumber,
    languages: profile.languages,
    address: profile.address,
    city: profile.city,
    gpsCoordinates: profile.gpsCoordinates,
    skills: profile.skills,
    categoryId: profile.categoryId || null,
    skillIds: profile.skillIds || [],
    workRadius: profile.workRadius || "",
    strength: profile.strength || "",
    orderAccepted: profile.orderAccepted || [],
    bookingTimeline: profile.bookingTimeline || "",
    workTiming: profile.workTiming || "",
    workMedia: profile.workMedia,
    status: profile.status,
    profileCompleted: profile.profileCompleted,
    hasPendingChange: !!(profile.pendingChange && profile.pendingChange.data),
    pendingChangeAt: (profile.pendingChange && profile.pendingChange.submittedAt) || null,
    pendingChangeData: (profile.pendingChange && profile.pendingChange.data) || null,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
};

// GET /api/posterboy/profile
exports.getProfile = async (req, res) => {
  try {
    const { error, user } = await readApprovedUser(req.user.userId);
    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        ...(error.pendingApproval ? { pendingApproval: true } : {}),
      });
    }

    const profile = await PosterBoyProfile.findOne({ user: user._id });

    return res.status(200).json({
      success: true,
      data: {
        user: publicUser(user),
        profile: shapeProfile(profile),
      },
    });
  } catch (error) {
    console.error("Get poster boy profile error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT /api/posterboy/profile
exports.updateProfile = async (req, res) => {
  try {
    const { error, user } = await readApprovedUser(req.user.userId);
    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        ...(error.pendingApproval ? { pendingApproval: true } : {}),
      });
    }

    const data = sanitizeProfileData(req.body);
    const { errors, skills, languages, workMedia } = validateProfile(data);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.entries(errors).map(([field, message]) => ({ field, message })),
      });
    }

    const payload = buildPayload(data, skills, languages, workMedia);
    // City drives the location filter. It is normally filled by the GPS
    // reverse-geocode; when the poster boy typed the address by hand we fall
    // back to parsing it so the profile is not invisible to city search.
    payload.city = data.city || deriveCityFromAddress(data.address);
    const { categoryId, skillMap } = await getPosterBoyCategoryRefs();
    payload.categoryId = categoryId;
    payload.skillIds = resolveSkillIds(skills, skillMap);

    let profile = await PosterBoyProfile.findOne({ user: user._id });

    if (!profile) {
      profile = new PosterBoyProfile({
        user: user._id,
        ...payload,
        status: "pending",
        profileCompleted: true,
      });
      await profile.save();
      return res.status(200).json({
        success: true,
        message: "Profile submitted for admin approval",
        data: { profile: shapeProfile(profile) },
      });
    }

    if (profile.status !== "approved") {
      // First submission still under review (or rejected) → resubmit in place.
      PROFILE_FIELDS.forEach((field) => {
        profile[field] = payload[field];
      });
      profile.status = "pending";
      profile.profileCompleted = true;
      await profile.save();
      return res.status(200).json({
        success: true,
        message: "Profile submitted for admin approval",
        data: { profile: shapeProfile(profile) },
      });
    }

    // Already approved → stage the edits, live fields stay untouched.
    profile.pendingChange = { data: payload, submittedAt: new Date() };
    await profile.save();
    return res.status(200).json({
      success: true,
      message: "Profile changes submitted for admin approval",
      data: { profile: shapeProfile(profile) },
    });
  } catch (error) {
    if (error && error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map((e) => e.message).join(", "),
      });
    }
    console.error("Update poster boy profile error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// PATCH /api/admin/poster-boys/:id/profile-status   (ADMIN)
exports.adminUpdateProfileStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be approved or rejected" });
    }

    const profile = await PosterBoyProfile.findById(id);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Poster boy profile not found" });
    }

    const hasPendingChange = !!(profile.pendingChange && profile.pendingChange.data);

    if (hasPendingChange && status === "approved") {
      const merged = profile.pendingChange.data || {};
      PROFILE_FIELDS.forEach((field) => {
        if (merged[field] !== undefined) profile[field] = merged[field];
      });
      profile.pendingChange = null;
      profile.status = "approved";
    } else if (hasPendingChange && status === "rejected") {
      profile.pendingChange = null;
      profile.status = "approved";
    } else {
      profile.status = status;
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      message: `Poster boy profile ${status}`,
      data: { profile: shapeProfile(profile) },
    });
  } catch (error) {
    console.error("Update poster boy profile status error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/admin/poster-boys   (ADMIN)
exports.getPosterBoys = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = (req.query.search || "").trim();
    const accountStatus = (req.query.accountStatus || "").trim();

    const filter = { role: "POSTER_BOY" };
    if (accountStatus === "pending" || accountStatus === "approved" || accountStatus === "rejected") {
      filter.approvalStatus = accountStatus;
    }
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { whatsappNumber: { $regex: search, $options: "i" } },
        { publicId: { $regex: search, $options: "i" } },
      ];
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("fullName email whatsappNumber phone publicId approvalStatus isActive createdAt"),
    ]);

    const profiles = await PosterBoyProfile.find({ user: { $in: users.map((u) => u._id) } });
    const byUser = new Map(profiles.map((p) => [String(p.user), p]));

    const items = users.map((u) => {
      const profile = byUser.get(String(u._id));
      return {
        _id: u._id,
        fullName: u.fullName,
        email: u.email,
        whatsappNumber: u.whatsappNumber,
        phone: u.phone,
        publicId: u.publicId,
        approvalStatus: u.approvalStatus,
        isActive: u.isActive,
        createdAt: u.createdAt,
        profile: profile
          ? {
              _id: profile._id,
              status: profile.status,
              skills: profile.skills,
              languages: profile.languages,
              address: profile.address,
              city: profile.city || "",
              aadhaarNumber: profile.aadhaarNumber,
              workRadius: profile.workRadius || "",
              strength: profile.strength || "",
              orderAccepted: profile.orderAccepted || [],
              bookingTimeline: profile.bookingTimeline || "",
              workTiming: profile.workTiming || "",
              workMedia: profile.workMedia,
              profileCompleted: profile.profileCompleted,
              hasPendingChange: !!(profile.pendingChange && profile.pendingChange.data),
              pendingChangeAt: (profile.pendingChange && profile.pendingChange.submittedAt) || null,
              // The worker's submitted edits — needed for the admin
              // before/after review. Null when nothing is pending.
              pendingChangeData: (profile.pendingChange && profile.pendingChange.data) || null,
              submittedAt: profile.updatedAt,
            }
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        items,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      },
    });
  } catch (error) {
    console.error("Get poster boys error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
