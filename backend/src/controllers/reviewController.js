const Review = require("../models/Review");
const Business = require("../models/Business");
const Wishlist = require("../models/Wishlist");

// ─── User Review Endpoints ───

exports.createReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { businessId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({
        success: false,
        message: "Rating and comment are required",
      });
    }

    const business = await Business.findOne({ _id: businessId, status: "approved", isActive: true });
    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found or not available",
      });
    }

    const existing = await Review.findOne({ user: userId, business: businessId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this business",
      });
    }

    const review = await Review.create({
      user: userId,
      business: businessId,
      rating,
      comment: comment.trim(),
    });

    res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: { review },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this business",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error creating review",
    });
  }
};

const buildBusinessReviewsPayload = async (businessId, page, limit) => {
  const skip = (page - 1) * limit;
  const query = { business: businessId, isVisible: true };

  const [reviews, total, allRatings] = await Promise.all([
    Review.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "fullName"),
    Review.countDocuments(query),
    Review.find({ business: businessId, isVisible: true }).select("rating").lean(),
  ]);

  const summary = { averageRating: 0, reviewCount: total, ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  if (allRatings.length > 0) {
    const sum = allRatings.reduce((acc, r) => acc + r.rating, 0);
    summary.averageRating = Math.round((sum / allRatings.length) * 10) / 10;
    allRatings.forEach((r) => {
      summary.ratingBreakdown[r.rating] = (summary.ratingBreakdown[r.rating] || 0) + 1;
    });
  }

  return {
    reviews,
    summary,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

const sendBusinessReviews = async (req, res) => {
  try {
    const { businessId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const payload = await buildBusinessReviewsPayload(businessId, page, limit);

    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching reviews",
    });
  }
};

exports.getBusinessReviews = sendBusinessReviews;

// Unauthenticated: lets public visitors read a business's reviews + summary.
exports.getPublicBusinessReviews = sendBusinessReviews;

exports.getMyReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { businessId } = req.params;

    const review = await Review.findOne({ user: userId, business: businessId });

    res.status(200).json({
      success: true,
      data: { review },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching review",
    });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (review.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own reviews",
      });
    }

    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment.trim();

    await review.save();

    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: { review },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error updating review",
    });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (review.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own reviews",
      });
    }

    await Review.findByIdAndDelete(reviewId);

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error deleting review",
    });
  }
};

// ─── Vendor Review Endpoints ───

exports.getVendorReviews = async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const businessFilter = req.query.businessId || "";
    const ratingFilter = req.query.rating || "";
    const search = req.query.search || "";

    const vendorBusinesses = await Business.find({ vendor: vendorId }).select("_id name");
    const businessIds = vendorBusinesses.map((b) => b._id);

    const query = { business: { $in: businessIds }, isVisible: true };
    if (businessFilter && businessIds.some((id) => id.toString() === businessFilter)) {
      query.business = businessFilter;
    }
    if (ratingFilter) query.rating = parseInt(ratingFilter);
    if (search) {
      const matchingUsers = await require("../models/User").find({
        fullName: { $regex: search, $options: "i" },
      }).select("_id");
      query.user = { $in: matchingUsers.map((u) => u._id) };
    }

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "fullName publicId")
        .populate("business", "name"),
      Review.countDocuments(query),
    ]);

    const reviewIds = reviews.map((r) => r._id);
    const userIds = [...new Set(reviews.map((r) => r.user?._id?.toString()).filter(Boolean))];
    const businessIdSet = [...new Set(reviews.map((r) => r.business?._id?.toString()).filter(Boolean))];

    const wishlists = await Wishlist.find({
      user: { $in: userIds },
      business: { $in: businessIdSet },
    }).select("user business");
    const wishlistSet = new Set(wishlists.map((w) => `${w.user.toString()}-${w.business.toString()}`));

    const reviewsWithWishlist = reviews.map((r) => {
      const obj = r.toObject();
      obj.isWishlisted = wishlistSet.has(`${r.user?._id?.toString()}-${r.business?._id?.toString()}`);
      return obj;
    });

    res.status(200).json({
      success: true,
      data: {
        reviews: reviewsWithWishlist,
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
      message: "Server error fetching vendor reviews",
    });
  }
};

exports.getVendorReviewSummary = async (req, res) => {
  try {
    const vendorId = req.user.userId;

    const vendorBusinesses = await Business.find({ vendor: vendorId }).select("_id name");
    const businessIds = vendorBusinesses.map((b) => b._id);

    const [totalReviews, averageRating, ratingDistribution] = await Promise.all([
      Review.countDocuments({ business: { $in: businessIds }, isVisible: true }),
      Review.aggregate([
        { $match: { business: { $in: businessIds }, isVisible: true } },
        { $group: { _id: null, avg: { $avg: "$rating" } } },
      ]),
      Review.aggregate([
        { $match: { business: { $in: businessIds }, isVisible: true } },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach((r) => {
      distribution[r._id] = r.count;
    });

    res.status(200).json({
      success: true,
      data: {
        totalReviews,
        averageRating: averageRating.length > 0 ? Math.round(averageRating[0].avg * 10) / 10 : 0,
        ratingDistribution: distribution,
        businesses: vendorBusinesses.map((b) => ({ _id: b._id, name: b.name })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching review summary",
    });
  }
};

// ─── Admin Review Endpoints ───

exports.getAdminReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const businessId = req.query.businessId || "";
    const ratingFilter = req.query.rating || "";

    const query = {};
    if (businessId) query.business = businessId;
    if (ratingFilter) query.rating = parseInt(ratingFilter);
    if (search) {
      const [matchingUsers, matchingBusinesses] = await Promise.all([
        require("../models/User").find({
          fullName: { $regex: search, $options: "i" },
        }).select("_id"),
        Business.find({
          name: { $regex: search, $options: "i" },
        }).select("_id"),
      ]);
      query.$or = [
        { user: { $in: matchingUsers.map((u) => u._id) } },
        { business: { $in: matchingBusinesses.map((b) => b._id) } },
      ];
    }

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "fullName email publicId")
        .populate("business", "name"),
      Review.countDocuments(query),
    ]);

    const userIds = [...new Set(reviews.map((r) => r.user?._id?.toString()).filter(Boolean))];
    const businessIdSet = [...new Set(reviews.map((r) => r.business?._id?.toString()).filter(Boolean))];

    const wishlists = await Wishlist.find({
      user: { $in: userIds },
      business: { $in: businessIdSet },
    }).select("user business");
    const wishlistSet = new Set(wishlists.map((w) => `${w.user.toString()}-${w.business.toString()}`));

    const reviewsWithWishlist = reviews.map((r) => {
      const obj = r.toObject();
      obj.isWishlisted = wishlistSet.has(`${r.user?._id?.toString()}-${r.business?._id?.toString()}`);
      return obj;
    });

    res.status(200).json({
      success: true,
      data: {
        reviews: reviewsWithWishlist,
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
      message: "Server error fetching reviews",
    });
  }
};

exports.toggleReviewVisibility = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    review.isVisible = !review.isVisible;
    await review.save();

    res.status(200).json({
      success: true,
      message: `Review ${review.isVisible ? "shown" : "hidden"}`,
      data: { review },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error toggling review visibility",
    });
  }
};
