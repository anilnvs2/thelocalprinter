const express = require("express");
const { authenticateUser, authorizeRole } = require("../middlewares/auth");
const {
  getDashboard,
  getPublicBusinesses,
  getBusinessById,
  getFilterOptions,
  getLocationAutocomplete,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  getProfile,
  getPackage,
  getPublicPosterBoys,
  getPublicPosterBoyById,
  revealPosterBoyContact,
} = require("../controllers/userController");
const {
  createReview,
  getBusinessReviews,
  getPublicBusinessReviews,
  getMyReview,
  updateReview,
  deleteReview,
} = require("../controllers/reviewController");

const router = express.Router();

router.get("/dashboard", authenticateUser, authorizeRole("USER"), getDashboard);
router.get("/businesses", authenticateUser, authorizeRole("USER"), getPublicBusinesses);
router.get("/businesses/filters", authenticateUser, authorizeRole("USER"), getFilterOptions);
router.get("/businesses/:id", authenticateUser, authorizeRole("USER"), getBusinessById);

router.get("/wishlist", authenticateUser, authorizeRole("USER"), getWishlist);
router.post("/wishlist", authenticateUser, authorizeRole("USER"), addToWishlist);
router.delete("/wishlist/:businessId", authenticateUser, authorizeRole("USER"), removeFromWishlist);
router.get("/wishlist/check/:businessId", authenticateUser, authorizeRole("USER"), checkWishlist);

router.post("/businesses/:businessId/reviews", authenticateUser, authorizeRole("USER"), createReview);
router.get("/businesses/:businessId/reviews", authenticateUser, authorizeRole("USER"), getBusinessReviews);
router.get("/businesses/:businessId/my-review", authenticateUser, authorizeRole("USER"), getMyReview);
router.put("/reviews/:reviewId", authenticateUser, authorizeRole("USER"), updateReview);
router.delete("/reviews/:reviewId", authenticateUser, authorizeRole("USER"), deleteReview);

router.get("/profile", authenticateUser, authorizeRole("USER"), getProfile);
router.get("/package", authenticateUser, authorizeRole("USER"), getPackage);

const Category = require("../models/Category");

router.get("/public/locations/autocomplete", getLocationAutocomplete);
router.get("/public/businesses", getPublicBusinesses);
router.get("/public/businesses/filters", getFilterOptions);
router.get("/public/businesses/:id", getBusinessById);
router.get("/public/businesses/:businessId/reviews", getPublicBusinessReviews);

router.get("/public/poster-boys", getPublicPosterBoys);
router.get("/public/poster-boys/:id", getPublicPosterBoyById);
router.post("/public/poster-boys/:id/contact", revealPosterBoyContact);

router.get("/public/categories", async (req, res) => {
  try {
    const parentCategories = await Category.find({ isActive: true, type: "parent" })
      .sort({ name: 1 })
      .select("name slug description image kind");

    const parentIds = parentCategories.map((c) => c._id);
    const subcategories = await Category.find({
      isActive: true,
      type: "subcategory",
      parentId: { $in: parentIds },
    })
      .sort({ name: 1 })
      .select("name slug image parentId");

    // Slugs of deactivated DB subcategories — the client merge uses these to
    // suppress same-named static defaults so a "deleted" subcategory stays
    // hidden instead of reappearing from the builtin list.
    const inactiveSubs = await Category.find({
      isActive: false,
      type: "subcategory",
      parentId: { $in: parentIds },
    }).select("slug parentId");

    const subMap = {};
    subcategories.forEach((sub) => {
      const pid = sub.parentId.toString();
      if (!subMap[pid]) subMap[pid] = [];
      subMap[pid].push(sub);
    });

    const hiddenMap = {};
    inactiveSubs.forEach((sub) => {
      const pid = sub.parentId.toString();
      if (!hiddenMap[pid]) hiddenMap[pid] = [];
      if (sub.slug) hiddenMap[pid].push(sub.slug);
    });

    const result = parentCategories.map((cat) => ({
      ...cat.toObject(),
      services: subMap[cat._id.toString()] || [],
      inactiveSubSlugs: hiddenMap[cat._id.toString()] || [],
      hiddenSubSlugs: cat.hiddenSubs || [],
    }));

    res.status(200).json({ success: true, data: { categories: result } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
