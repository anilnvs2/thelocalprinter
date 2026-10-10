const Business = require("../models/Business");
const User = require("../models/User");
const Wishlist = require("../models/Wishlist");
const Category = require("../models/Category");
const Review = require("../models/Review");
const Settings = require("../models/Settings");
const PosterBoyProfile = require("../models/PosterBoyProfile");
const { escapeRegex, distanceKm, applyGeoBounds, cityToken } = require("../utils/geo");
const { POSTER_BOY_CATEGORY_SLUG } = require("../utils/posterBoyCategory");

// Rate limit for the public "reveal contact" endpoint (per IP, per profile).
const contactHits = new Map();
const CONTACT_WINDOW_MS = 60 * 1000;
const CONTACT_MAX_HITS = 10;

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    const [totalBusinesses, wishlistCount, categories] = await Promise.all([
      Business.countDocuments({ status: "approved", isActive: true }),
      Wishlist.countDocuments({ user: userId }),
      Business.distinct("category", { status: "approved", isActive: true, category: { $ne: "" } }),
    ]);

    const recentBusinesses = await Business.find({ status: "approved", isActive: true })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("vendor", "publicId")
      .select("name category city description workingHours serviceType tags vendor contactName verificationMedia.outdoorStoreImage verificationMedia.indoorStoreImage");

    const popularCategories = categories.slice(0, 8);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalBusinesses,
          wishlistCount,
          totalCategories: categories.length,
        },
        recentBusinesses,
        popularCategories,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching dashboard",
    });
  }
};

exports.getPublicBusinesses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const category = req.query.category || "";
    const categoryId = req.query.categoryId || "";
    const serviceId = req.query.serviceId || "";
    const city = req.query.city || "";
    const serviceType = req.query.serviceType || "";
    const customerType = req.query.customerType || "";
    const orderingMethod = req.query.orderingMethod || "";
    const orderLimits = req.query.orderLimits || "";
    const minRating = parseFloat(req.query.minRating) || 0;
    const lat = parseFloat(req.query.lat) || null;
    const lng = parseFloat(req.query.lng) || null;
    const radius = parseFloat(req.query.radius) || 0;

    const query = { status: "approved", isActive: true };

    if (search) {
      const safeSearch = escapeRegex(search);
      const orConditions = [
        { name: { $regex: safeSearch, $options: "i" } },
        { city: { $regex: safeSearch, $options: "i" } },
        { address: { $regex: safeSearch, $options: "i" } },
        { category: { $regex: safeSearch, $options: "i" } },
      ];
      // Header search sends category/subcategory display names as free text
      // (e.g. "3D Printing"). Resolve them to category references so
      // businesses filed under that category/subcategory also match.
      // Staffing categories (e.g. "Poster Boy") never match businesses.
      const matchedCats = await Category.find({
        name: { $regex: safeSearch, $options: "i" },
        isActive: true,
        kind: { $ne: "staffing" },
      }).select("_id");
      if (matchedCats.length > 0) {
        const catIds = matchedCats.map((c) => c._id);
        orConditions.push({ categoryId: { $in: catIds } });
        orConditions.push({ serviceIds: { $in: catIds } });
      }
      if (/^VND-/i.test(search)) {
        const vendor = await User.findOne({ publicId: { $regex: safeSearch, $options: "i" } }).select("_id");
        if (vendor) orConditions.push({ vendor: vendor._id });
      }
      query.$or = orConditions;
    }
    if (serviceId) {
      query.serviceIds = { $in: [serviceId] };
    } else if (categoryId) {
      query.categoryId = categoryId;
    } else if (category) {
      query.category = { $regex: category, $options: "i" };
    }
    // The location field carries a display string like "Mandirbazar, West Bengal"
    // while businesses store only the city ("Mandirbazar"). Match on the city
    // token (text before the first comma) so display strings still match.
    if (city) {
      query.city = { $regex: escapeRegex(cityToken(city)), $options: "i" };
    }
    if (serviceType) query.serviceType = serviceType;
    if (customerType) query.customerType = customerType;
    if (orderingMethod) query.orderingMethod = orderingMethod;
    if (orderLimits) query.orderLimits = orderLimits;

    const useGeo = applyGeoBounds(
      query,
      lat,
      lng,
      radius,
      "gpsCoordinates.lat",
      "gpsCoordinates.lng"
    );

    let allBusinesses;
    if (minRating > 0 || useGeo) {
      allBusinesses = await Business.find(query)
        .populate("categoryId", "name slug image")
        .populate("serviceIds", "name slug")
        .populate("vendor", "publicId")
        .select(
          "name description category categoryId serviceIds city address serviceType customerType orderingMethod orderLimits tags workingHours languages verificationMedia.thumbnailImages verificationMedia.outdoorStoreImage verificationMedia.indoorStoreImage contactName vendor gpsCoordinates brandRecallScore"
        );
    } else {
      const [businesses, total] = await Promise.all([
        Business.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("categoryId", "name slug image")
          .populate("serviceIds", "name slug")
          .populate("vendor", "publicId")
          .select(
            "name description category categoryId serviceIds city address serviceType customerType orderingMethod orderLimits tags workingHours languages verificationMedia.thumbnailImages verificationMedia.outdoorStoreImage verificationMedia.indoorStoreImage contactName vendor gpsCoordinates brandRecallScore"
          ),
        Business.countDocuments(query),
      ]);
      allBusinesses = null;

      const businessIds = businesses.map((b) => b._id);
      const [ratings, wishlists] = await Promise.all([
        Review.aggregate([
          { $match: { business: { $in: businessIds }, isVisible: true } },
          { $group: { _id: "$business", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
        ]),
        req.user?.userId
          ? Wishlist.find({ user: req.user.userId, business: { $in: businessIds } }).select("business")
          : Promise.resolve([]),
      ]);
      const ratingMap = {};
      ratings.forEach((r) => { ratingMap[r._id.toString()] = { averageRating: Math.round(r.avg * 10) / 10, reviewCount: r.count }; });
      const wishlistSet = new Set(wishlists.map((w) => w.business.toString()));

      const businessesWithRatings = businesses.map((b) => {
        const obj = b.toObject();
        obj.ratingSummary = ratingMap[b._id.toString()] || { averageRating: 0, reviewCount: 0 };
        obj.isWishlisted = wishlistSet.has(b._id.toString());
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
      return;
    }

    const allIds = allBusinesses.map((b) => b._id);
    const [allRatings, allWishlists] = await Promise.all([
      Review.aggregate([
        { $match: { business: { $in: allIds }, isVisible: true } },
        { $group: { _id: "$business", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]),
      req.user?.userId
        ? Wishlist.find({ user: req.user.userId, business: { $in: allIds } }).select("business")
        : Promise.resolve([]),
    ]);
    const allRatingMap = {};
    allRatings.forEach((r) => { allRatingMap[r._id.toString()] = { averageRating: Math.round(r.avg * 10) / 10, reviewCount: r.count }; });
    const allWishlistSet = new Set(allWishlists.map((w) => w.business.toString()));

    let enriched = allBusinesses.map((b) => {
      const obj = b.toObject();
      obj.ratingSummary = allRatingMap[b._id.toString()] || { averageRating: 0, reviewCount: 0 };
      obj.isWishlisted = allWishlistSet.has(b._id.toString());
      if (useGeo && obj.gpsCoordinates?.lat && obj.gpsCoordinates?.lng) {
        obj.distance = distanceKm(lat, lng, obj.gpsCoordinates.lat, obj.gpsCoordinates.lng);
      }
      return obj;
    });

    if (useGeo) {
      enriched = enriched.filter((b) => b.distance !== undefined && b.distance <= radius);
      enriched.sort((a, b) => a.distance - b.distance);
    }

    if (minRating > 0) {
      enriched = enriched.filter((b) => (b.ratingSummary?.averageRating || 0) >= minRating);
    }

    const total = enriched.length;
    const paginated = enriched.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      data: {
        businesses: paginated,
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
    const { id } = req.params;

    const business = await Business.findOne({ _id: id, status: "approved", isActive: true })
      .populate("categoryId", "name slug image")
      .populate("serviceIds", "name slug")
      .populate("vendor", "publicId fullName")
      .select(
        "-googleBusinessProfileLink -gstNumber -fraudReport"
      );

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    let isWishlisted = false;
    if (req.user && req.user.userId) {
      const w = await Wishlist.findOne({ user: req.user.userId, business: id });
      isWishlisted = !!w;
    }

    const agg = await Review.aggregate([
      { $match: { business: business._id, isVisible: true } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    const ratingSummary = agg.length > 0
      ? { averageRating: Math.round(agg[0].avg * 10) / 10, reviewCount: agg[0].count }
      : { averageRating: 0, reviewCount: 0 };

    res.status(200).json({
      success: true,
      data: { business, isWishlisted, ratingSummary },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching business",
    });
  }
};

// GET /api/user/public/locations/autocomplete?q=&limit=
// Server-side proxy to OpenStreetMap Nominatim search so no key/secret
// is exposed in client code and suggestions are NOT limited to DB cities.
//
// Sources merged per request:
//   1. DB cities (Business.distinct city) — substring match, preserved as-is.
//   2. Nominatim free-form search (countrycodes=in) with locality-aware labels.
// Results are normalized, deduplicated (exact-label only) and ranked by
// application-level relevance, then sliced to `limit` (max 8).
// Any upstream/DB failure degrades gracefully — never throws.
const locationCache = new Map(); // key -> { expires, data }
const dbCityCache = { expires: 0, cities: [] };
const NOMINATIM_TIMEOUT_MS = 5000;
const DB_CITY_CACHE_MS = 5 * 60 * 1000;

const nominatimFetch = async (query, limit) => {
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2` +
    `&q=${encodeURIComponent(query)}` +
    `&countrycodes=in&limit=${limit}&addressdetails=1&accept-language=en`;
  const upstream = await fetch(url, {
    headers: {
      "User-Agent": "thelocalprinter/1.0 (location-autocomplete)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
  });
  // 429 = Nominatim asking us to slow down: report it so callers can
  // skip the retry (which would only add pressure) and avoid caching.
  if (upstream.status === 429) return { results: [], rateLimited: true };
  if (!upstream.ok) return { results: [], rateLimited: false };
  const raw = await upstream.json();
  return { results: Array.isArray(raw) ? raw : [], rateLimited: false };
};

const getDbCities = async () => {
  if (dbCityCache.expires > Date.now()) return dbCityCache.cities;
  const cities = await Business.distinct("city", {
    status: "approved",
    isActive: true,
    city: { $ne: "" },
  });
  dbCityCache.cities = (cities || []).filter(Boolean);
  dbCityCache.expires = Date.now() + DB_CITY_CACHE_MS;
  return dbCityCache.cities;
};

// Build "Locality, City, State" style labels from Nominatim address parts.
const buildNominatimLabel = (item, fallbackQuery) => {
  const addr = item.address || {};
  const norm = (v) => (typeof v === "string" ? v.trim() : "");
  const locality = norm(addr.neighbourhood || addr.suburb || addr.quarter);
  const cityPart = norm(
    addr.city || addr.town || addr.municipality || addr.village ||
    addr.county || addr.state_district || ""
  );
  const state = norm(addr.state);
  const parts = [];
  if (locality && locality.toLowerCase() !== cityPart.toLowerCase()) parts.push(locality);
  if (cityPart) parts.push(cityPart);
  if (state && state.toLowerCase() !== (parts[parts.length - 1] || "").toLowerCase()) parts.push(state);
  if (parts.length > 0) {
    return {
      displayName: parts.join(", "),
      locality: locality || "",
      city: cityPart,
      state,
      country: norm(addr.country),
    };
  }
  const fallbackParts = (item.display_name || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const displayName = fallbackParts.join(", ") || item.display_name || fallbackQuery;
  return {
    displayName,
    locality: "",
    city: cityPart || fallbackParts[0] || "",
    state: state || fallbackParts[1] || "",
    country: norm(addr.country),
  };
};

// Application-level relevance score for a candidate against query tokens.
const scoreLocation = (candidate, queryLower, tokens, isDb) => {
  const name = (candidate.displayName || "").toLowerCase();
  let score = 0;
  if (name === queryLower) score += 100;
  else if (name.startsWith(queryLower)) score += 50;
  if (tokens.length > 0) {
    const matched = tokens.filter((t) => name.includes(t)).length;
    score += (matched / tokens.length) * 40;
  }
  const localityLower = (candidate.locality || "").toLowerCase();
  if (localityLower && tokens.some((t) => localityLower.includes(t) || t.includes(localityLower))) score += 25;
  const cityLower = (candidate.city || "").toLowerCase();
  if (cityLower && tokens.some((t) => cityLower === t || cityLower.includes(t) || t.includes(cityLower))) score += 20;
  // Penalize vague results with no city/locality detail.
  if (!cityLower && !localityLower) {
    if ((candidate.state || "").trim()) score -= 20;
    else score -= 50;
  }
  if (isDb) score += 5; // keep existing DB suggestions prominent
  return score;
};

exports.getLocationAutocomplete = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    let limit = parseInt(req.query.limit, 10) || 5;
    if (limit < 1) limit = 1;
    if (limit > 8) limit = 8;
    if (!q) {
      return res.status(200).json({ success: true, data: { locations: [] } });
    }

    const cacheKey = `${q.toLowerCase()}|${limit}`;
    const cached = locationCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return res.status(200).json({ success: true, data: { locations: cached.data } });
    }

    const queryLower = q.toLowerCase();
    const tokens = queryLower.split(/[\s,]+/).filter(Boolean);

    // 1. DB cities — same substring semantics as the client-side fallback.
    let dbMatches = [];
    try {
      const cities = await getDbCities();
      dbMatches = cities
        .filter((city) => city.toLowerCase().includes(queryLower))
        .slice(0, limit)
        .map((city) => ({
          placeId: `db-${city}`,
          displayName: city,
          locality: "",
          city,
          state: "",
          country: "",
          lat: null,
          lon: null,
          source: "db",
        }));
    } catch (dbErr) {
      dbMatches = [];
    }

    // 2. Nominatim free-form search; one controlled retry (drop last token)
    // only when the first attempt succeeds but yields nothing useful.
    // Never retry on rate-limiting — that would only add pressure.
    let raw = [];
    try {
      const first = await nominatimFetch(q, 8);
      raw = first.results;
      if (!first.rateLimited && raw.length === 0 && tokens.length >= 2) {
        const retryQuery = tokens.slice(0, -1).join(" ");
        if (retryQuery) raw = (await nominatimFetch(retryQuery, 8)).results;
      }
    } catch (nominatimErr) {
      raw = [];
    }

    const osmMatches = raw.map((item) => {
      const label = buildNominatimLabel(item, q);
      return {
        placeId: String(item.place_id ?? item.osm_id ?? label.displayName),
        displayName: label.displayName,
        locality: label.locality,
        city: label.city,
        state: label.state,
        country: label.country,
        lat: item.lat !== undefined ? parseFloat(item.lat) : null,
        lon: item.lon !== undefined ? parseFloat(item.lon) : null,
        source: "osm",
      };
    });

    // 3. Merge: keep every DB row; drop only exact-label duplicates.
    const seen = new Set();
    const merged = [];
    for (const loc of [...dbMatches, ...osmMatches]) {
      const key = (loc.displayName || "").toLowerCase().replace(/\s+/g, " ").trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(loc);
    }

    // 4. Rank by relevance (stable: DB first on ties), slice to limit.
    merged.sort(
      (a, b) =>
        scoreLocation(b, queryLower, tokens, b.source === "db") -
        scoreLocation(a, queryLower, tokens, a.source === "db")
    );
    const locations = merged.slice(0, limit);

    // Cache hits long-term; cache empty results only briefly so a
    // transient upstream failure (e.g. rate-limit) recovers quickly.
    const ttl = locations.length > 0 ? 10 * 60 * 1000 : 30 * 1000;
    locationCache.set(cacheKey, { expires: Date.now() + ttl, data: locations });
    if (locationCache.size > 200) {
      const firstKey = locationCache.keys().next().value;
      locationCache.delete(firstKey);
    }

    return res.status(200).json({ success: true, data: { locations } });
  } catch (error) {
    return res.status(200).json({ success: true, data: { locations: [] } });
  }
};

exports.getFilterOptions = async (req, res) => {  try {
    const [activeParentCategories, cities] = await Promise.all([
      // Business filters only: staffing categories (e.g. "Poster Boy") are
      // browsed through their own pages, never chosen as a business category.
      Category.find({ isActive: true, type: "parent", kind: { $ne: "staffing" } })
        .sort({ name: 1 })
        .select("name slug image"),
      Business.distinct("city", { status: "approved", isActive: true, city: { $ne: "" } }),
    ]);

    const parentIds = activeParentCategories.map((c) => c._id);
    const activeSubcategories = await Category.find({
      isActive: true,
      type: "subcategory",
      parentId: { $in: parentIds },
    })
      .sort({ name: 1 })
      .select("name slug parentId");

    const subMap = {};
    activeSubcategories.forEach((sub) => {
      const pid = sub.parentId.toString();
      if (!subMap[pid]) subMap[pid] = [];
      subMap[pid].push({ id: sub._id, name: sub.name, slug: sub.slug });
    });

    const categories = activeParentCategories.map((c) => ({
      id: c._id,
      name: c.name,
      slug: c.slug,
      image: c.image,
      services: subMap[c._id.toString()] || [],
    }));

    res.status(200).json({
      success: true,
      data: {
        categories,
        cities: cities.sort(),
        serviceTypes: [
          { value: "print_only", label: "Print Only" },
          { value: "full_with_design", label: "Full with Design" },
          { value: "full_without_design", label: "Full without Design" },
        ],
        customerTypes: [
          { value: "b2b", label: "B2B" },
          { value: "b2c", label: "B2C" },
          { value: "both", label: "Both" },
        ],
        orderingMethods: [
          { value: "on_call", label: "On Call" },
          { value: "shop_visit", label: "Shop Visit" },
          { value: "both", label: "Both" },
        ],
        orderLimits: [
          { value: "single", label: "Single" },
          { value: "minimum", label: "Minimum" },
          { value: "bulk", label: "Bulk" },
          { value: "no_limit", label: "No Limit" },
        ],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching filter options",
    });
  }
};

exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Wishlist.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "business",
          select: "name category city description serviceType isActive status verificationMedia.thumbnailImages verificationMedia.outdoorStoreImage verificationMedia.indoorStoreImage contactName vendor",
          match: { isActive: true },
          populate: { path: "vendor", select: "publicId" },
        }),
      Wishlist.countDocuments({ user: userId }),
    ]);

    const filtered = items.filter((item) => item.business !== null);

    res.status(200).json({
      success: true,
      data: {
        wishlist: filtered,
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
      message: "Server error fetching wishlist",
    });
  }
};

exports.addToWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { businessId } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business ID is required",
      });
    }

    const business = await Business.findOne({ _id: businessId, status: "approved", isActive: true });
    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found or not available",
      });
    }

    const existing = await Wishlist.findOne({ user: userId, business: businessId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Business already in wishlist",
      });
    }

    const item = await Wishlist.create({ user: userId, business: businessId });

    res.status(201).json({
      success: true,
      message: "Added to wishlist",
      data: { wishlist: item },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Business already in wishlist",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error adding to wishlist",
    });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { businessId } = req.params;

    const item = await Wishlist.findOneAndDelete({ user: userId, business: businessId });
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Wishlist item not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Removed from wishlist",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error removing from wishlist",
    });
  }
};

exports.checkWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { businessId } = req.params;

    const item = await Wishlist.findOne({ user: userId, business: businessId });

    res.status(200).json({
      success: true,
      data: { isWishlisted: !!item },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error checking wishlist",
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

exports.getPackage = async (req, res) => {
  try {
    const keys = [
      "user_subscription_fee",
      "user_subscription_duration_days",
      "user_trial_period_days",
      "user_package_benefits",
    ];
    const settings = await Settings.find({ key: { $in: keys } });
    const map = {};
    settings.forEach((s) => { map[s.key] = s.value; });

    res.status(200).json({
      success: true,
      data: {
        fee: map.user_subscription_fee ?? 0,
        durationDays: map.user_subscription_duration_days ?? 30,
        trialDays: map.user_trial_period_days ?? 0,
        benefits: Array.isArray(map.user_package_benefits) ? map.user_package_benefits : [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching user package",
    });
  }
};

// ───────────────────────────────────────────────────────────── Poster Boys (public)

/** One predicate for "may appear publicly" — reused by list + contact. */
const isListablePosterBoy = (user) =>
  !!user &&
  user.role === "POSTER_BOY" &&
  user.isActive === true &&
  user.approvalStatus === "approved";

const maskContact = (value) => {
  const s = String(value || "").replace(/\D/g, "");
  if (s.length < 5) return value ? "•••••" : "";
  return `${s.slice(0, 5)}•••${s.slice(-2)}`;
};

/**
 * Public allowlist only. Never include aadhaar, email, phone or pendingChange —
 * build the object explicitly instead of serialising the document.
 */
const toPublicPosterBoy = (profile, user, distance) => {
  const workMedia = (profile.workMedia || [])
    .filter((m) => m && m.url)
    .map((m) => ({ url: m.url, resourceType: m.resourceType }));
  const cover = workMedia.find((m) => m.resourceType === "image") || null;
  return {
    _id: profile._id,
    publicId: user.publicId || null,
    fullName: user.fullName,
    city: profile.city || "",
    address: profile.address || "",
    languages: profile.languages || [],
    skills: profile.skills || [],
    skillIds: profile.skillIds || [],
    categoryId: profile.categoryId || null,
    workRadius: profile.workRadius || "",
    strength: profile.strength || "",
    orderAccepted: profile.orderAccepted || [],
    bookingTimeline: profile.bookingTimeline || "",
    workMedia,
    coverImage: cover ? cover.url : "",
    gpsCoordinates: profile.gpsCoordinates || { lat: null, lng: null },
    ...(distance !== undefined ? { distance } : {}),
    contactHint: maskContact(user.whatsappNumber || user.phone),
    profileCompleted: profile.profileCompleted,
    submittedAt: profile.updatedAt,
  };
};

// GET /api/user/public/poster-boys
exports.getPublicPosterBoys = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(48, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const skip = (page - 1) * limit;
    const search = (req.query.search || "").trim();
    const serviceId = req.query.serviceId || "";
    const categoryId = req.query.categoryId || "";
    const city = req.query.city || "";
    const lat = parseFloat(req.query.lat) || null;
    const lng = parseFloat(req.query.lng) || null;
    const radius = parseFloat(req.query.radius) || 0;

    const query = { status: "approved", profileCompleted: true };

    if (serviceId) {
      query.skillIds = { $in: [serviceId] };
    } else if (categoryId) {
      query.categoryId = categoryId;
    }
    if (city) {
      query.city = { $regex: escapeRegex(cityToken(city)), $options: "i" };
    }
    if (search) {
      const safe = escapeRegex(search);
      // Free text matches skills / city / address, plus the worker's name
      // (the name lives on the User document, not the profile).
      const nameUsers = await User.find({
        role: "POSTER_BOY",
        fullName: { $regex: safe, $options: "i" },
      }).select("_id");
      query.$or = [
        { skills: { $regex: safe, $options: "i" } },
        { city: { $regex: safe, $options: "i" } },
        { address: { $regex: safe, $options: "i" } },
        ...(nameUsers.length ? [{ user: { $in: nameUsers.map((u) => u._id) } }] : []),
      ];
    }

    const useGeo = applyGeoBounds(
      query,
      lat,
      lng,
      radius,
      "gpsCoordinates.lat",
      "gpsCoordinates.lng"
    );

    const profiles = await PosterBoyProfile.find(query);
    const userIds = [...new Set(profiles.map((p) => String(p.user)))];

    const users = userIds.length
      ? await User.find({
          _id: { $in: userIds },
          role: "POSTER_BOY",
          isActive: true,
          approvalStatus: "approved",
        }).select("fullName publicId phone whatsappNumber")
      : [];
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    let items = profiles
      .filter((p) => userMap.has(String(p.user)))
      .map((p) => {
        const user = userMap.get(String(p.user));
        const hasPoint = p.gpsCoordinates?.lat && p.gpsCoordinates?.lng;
        const distance =
          useGeo && hasPoint ? distanceKm(lat, lng, p.gpsCoordinates.lat, p.gpsCoordinates.lng) : undefined;
        return toPublicPosterBoy(p, user, distance);
      });

    if (useGeo) {
      items = items
        .filter((i) => i.distance !== undefined && i.distance <= radius)
        .sort((a, b) => a.distance - b.distance);
    } else {
      items.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    }

    const total = items.length;
    const paginated = items.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      data: {
        posterBoys: paginated,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      },
    });
  } catch (error) {
    console.error("Get public poster boys error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/user/public/poster-boys/:id
exports.getPublicPosterBoyById = async (req, res) => {
  try {
    const profile = await PosterBoyProfile.findById(req.params.id);
    if (!profile || profile.status !== "approved" || !profile.profileCompleted) {
      return res.status(404).json({ success: false, message: "Poster boy not found" });
    }
    const user = await User.findById(profile.user).select(
      "fullName publicId phone whatsappNumber role isActive approvalStatus"
    );
    if (!isListablePosterBoy(user)) {
      return res.status(404).json({ success: false, message: "Poster boy not found" });
    }
    return res.status(200).json({
      success: true,
      data: { posterBoy: toPublicPosterBoy(profile, user) },
    });
  } catch (error) {
    console.error("Get public poster boy error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/user/public/poster-boys/:id/contact  (rate limited)
exports.revealPosterBoyContact = async (req, res) => {
  try {
    const ip =
      (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      req.socket.remoteAddress ||
      "unknown";
    const key = `${ip}`;
    const now = Date.now();
    const hit = contactHits.get(key);
    if (!hit || now - hit.start > CONTACT_WINDOW_MS) {
      contactHits.set(key, { start: now, count: 1 });
    } else {
      hit.count += 1;
      if (hit.count > CONTACT_MAX_HITS) {
        return res
          .status(429)
          .json({ success: false, message: "Too many requests. Please try again later." });
      }
    }
    if (contactHits.size > 5000) {
      contactHits.forEach((v, k) => {
        if (now - v.start > CONTACT_WINDOW_MS) contactHits.delete(k);
      });
    }

    const profile = await PosterBoyProfile.findById(req.params.id);
    if (!profile || profile.status !== "approved" || !profile.profileCompleted) {
      return res.status(404).json({ success: false, message: "Poster boy not found" });
    }

    const user = await User.findById(profile.user);
    if (!isListablePosterBoy(user)) {
      return res.status(404).json({ success: false, message: "Poster boy not found" });
    }

    profile.leadCount = (profile.leadCount || 0) + 1;
    await profile.save();

    return res.status(200).json({
      success: true,
      data: {
        whatsappNumber: user.whatsappNumber || null,
        phone: user.phone || null,
        leadCount: profile.leadCount,
      },
    });
  } catch (error) {
    console.error("Reveal poster boy contact error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

