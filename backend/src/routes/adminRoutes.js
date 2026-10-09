const express = require("express");
const { authenticateUser, authorizeRole } = require("../middlewares/auth");
const {
  getDashboardStats,
  getDashboardGrowth,
  getBusinessStatusCounts,
  getUsers,
  getVendors,
  getBusinesses,
  getPendingApprovals,
  updateBusinessStatus,
  toggleUserStatus,
  toggleVendorStatus,
  deleteVendor,
  deleteUser,
  deleteBusiness,
  toggleBusinessStatus,
  adminUpdateUser,
  getUserById,
  getBusinessById,
  adminUpdateBusiness,
  getCategories,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  getSettings,
  updateSettings,
  getResellerApplications,
  getResellerApplicationById,
  deleteResellerApplication,
  approveResellerApplication,
  updateUserApprovalStatus,
  updateProfileChangeStatus,
  getPendingApprovalsCount,
} = require("../controllers/adminController");
const {
  getAdminReviews,
  toggleReviewVisibility,
} = require("../controllers/reviewController");
const {
  getPosterBoys,
  adminUpdateProfileStatus,
} = require("../controllers/posterBoyController");

const router = express.Router();

router.use(authenticateUser);
router.use(authorizeRole("ADMIN"));

router.get("/dashboard", getDashboardStats);
router.get("/dashboard/growth", getDashboardGrowth);
router.get("/dashboard/business-status", getBusinessStatusCounts);

router.get("/users", getUsers);
router.get("/users/:id", getUserById);
router.put("/users/:id", adminUpdateUser);
router.patch("/users/:id/toggle-status", toggleUserStatus);
router.patch("/users/:id/approval-status", updateUserApprovalStatus);
router.patch("/profile-changes/:id/status", updateProfileChangeStatus);
router.delete("/users/:id", deleteUser);

router.get("/vendors", getVendors);
router.patch("/vendors/:id/toggle-status", toggleVendorStatus);
router.delete("/vendors/:id", deleteVendor);

router.get("/businesses", getBusinesses);
router.get("/businesses/:id", getBusinessById);
router.put("/businesses/:id", adminUpdateBusiness);
router.patch("/businesses/:id/status", updateBusinessStatus);
router.patch("/businesses/:id/toggle-status", toggleBusinessStatus);
router.delete("/businesses/:id", deleteBusiness);

router.get("/approvals", getPendingApprovals);
router.get("/approvals/count", getPendingApprovalsCount);

router.get("/poster-boys", getPosterBoys);
router.patch("/poster-boys/:id/profile-status", adminUpdateProfileStatus);

router.get("/categories", getCategories);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.patch("/categories/:id/toggle-status", toggleCategoryStatus);
router.delete("/categories/:id", deleteCategory);

router.post("/subcategories", createSubcategory);
router.put("/subcategories/:id", updateSubcategory);
router.delete("/subcategories/:id", deleteSubcategory);

router.get("/reviews", getAdminReviews);
router.patch("/reviews/:id/toggle-visibility", toggleReviewVisibility);

router.get("/settings", getSettings);
router.put("/settings", updateSettings);

router.get("/reseller-applications", getResellerApplications);
router.get("/reseller-applications/:id", getResellerApplicationById);
router.patch("/reseller-applications/:id/approve", approveResellerApplication);
router.delete("/reseller-applications/:id", deleteResellerApplication);

module.exports = router;
