import api from "./api";

// ─── Dashboard ───

export const getDashboardStats = async () => {
  const response = await api.get("/admin/dashboard");
  return response.data;
};

export const getDashboardGrowth = async (period = "30d") => {
  const response = await api.get("/admin/dashboard/growth", { params: { period } });
  return response.data;
};

export const getBusinessStatusCounts = async () => {
  const response = await api.get("/admin/dashboard/business-status");
  return response.data;
};

// ─── Users ───

export const getUsers = async (page = 1, search = "") => {
  const response = await api.get("/admin/users", {
    params: { page, search },
  });
  return response.data;
};

export const toggleUserStatus = async (id) => {
  const response = await api.patch(`/admin/users/${id}/toggle-status`);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/admin/users/${id}`);
  return response.data;
};

export const getAdminUserById = async (id) => {
  const response = await api.get(`/admin/users/${id}`);
  return response.data;
};

export const adminUpdateUser = async (id, data) => {
  const response = await api.put(`/admin/users/${id}`, data);
  return response.data;
};

// ─── Vendors ───

export const getVendors = async (page = 1, search = "") => {
  const response = await api.get("/admin/vendors", {
    params: { page, search },
  });
  return response.data;
};

export const toggleVendorStatus = async (id) => {
  const response = await api.patch(`/admin/vendors/${id}/toggle-status`);
  return response.data;
};

export const deleteVendor = async (id) => {
  const response = await api.delete(`/admin/vendors/${id}`);
  return response.data;
};

// ─── Businesses ───

export const getBusinesses = async (page = 1, search = "", status = "", vendor = "", limit = 15) => {
  const response = await api.get("/admin/businesses", {
    params: { page, search, status, vendor, limit },
  });
  return response.data;
};

export const getAdminBusinessById = async (id) => {
  const response = await api.get(`/admin/businesses/${id}`);
  return response.data;
};

export const adminUpdateBusiness = async (id, data) => {
  const response = await api.put(`/admin/businesses/${id}`, data);
  return response.data;
};

export const deleteBusiness = async (id) => {
  const response = await api.delete(`/admin/businesses/${id}`);
  return response.data;
};

export const toggleBusinessStatus = async (id) => {
  const response = await api.patch(`/admin/businesses/${id}/toggle-status`);
  return response.data;
};

// Optional, ADMIN-managed Brand Recall / Trust Score for one business.
// Pass null (or "") to remove the score.
export const updateBusinessTrustScore = async (id, brandRecallScore) => {
  const response = await api.patch(`/admin/businesses/${id}/trust-score`, {
    brandRecallScore,
  });
  return response.data;
};

// ─── Approvals ───

export const getPendingApprovals = async (page = 1) => {
  const response = await api.get("/admin/approvals", {
    params: { page },
  });
  return response.data;
};

export const updateBusinessStatus = async (id, status) => {
  const response = await api.patch(`/admin/businesses/${id}/status`, {
    status,
  });
  return response.data;
};

export const updateUserApprovalStatus = async (id, status) => {
  const response = await api.patch(`/admin/users/${id}/approval-status`, {
    status,
  });
  return response.data;
};

export const updateProfileChangeStatus = async (id, status) => {
  const response = await api.patch(`/admin/profile-changes/${id}/status`, {
    status,
  });
  return response.data;
};

// ─── Poster Boys ───

export const getPosterBoys = async (page = 1, search = "", accountStatus = "") => {
  const response = await api.get("/admin/poster-boys", {
    params: { page, search, ...(accountStatus ? { accountStatus } : {}) },
  });
  return response.data;
};

export const updatePosterBoyProfileStatus = async (id, status) => {
  const response = await api.patch(`/admin/poster-boys/${id}/profile-status`, {
    status,
  });
  return response.data;
};

// ─── Categories ───

export const getCategories = async (page = 1, search = "", limit = 50) => {
  const response = await api.get("/admin/categories", {
    params: { page, search, limit },
  });
  return response.data;
};

export const createCategory = async (data) => {
  const response = await api.post("/admin/categories", data);
  return response.data;
};

export const updateCategory = async (id, data) => {
  const response = await api.put(`/admin/categories/${id}`, data);
  return response.data;
};

export const toggleCategoryStatus = async (id) => {
  const response = await api.patch(`/admin/categories/${id}/toggle-status`);
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await api.delete(`/admin/categories/${id}`);
  return response.data;
};

export const createSubcategory = async (data) => {
  const response = await api.post("/admin/subcategories", data);
  return response.data;
};

export const updateSubcategory = async (id, data) => {
  const response = await api.put(`/admin/subcategories/${id}`, data);
  return response.data;
};

export const deleteSubcategory = async (id) => {
  const response = await api.delete(`/admin/subcategories/${id}`);
  return response.data;
};

// ─── Settings ───

export const getSettings = async (category = "") => {
  const response = await api.get("/admin/settings", {
    params: category ? { category } : {},
  });
  return response.data;
};

export const updateSettings = async (settings) => {
  const response = await api.put("/admin/settings", { settings });
  return response.data;
};

// ─── Reseller Applications ───

export const getResellerApplications = async (page = 1, search = "", status = "") => {
  const response = await api.get("/admin/reseller-applications", {
    params: { page, search, status },
  });
  return response.data;
};

export const getResellerApplicationById = async (id) => {
  const response = await api.get(`/admin/reseller-applications/${id}`);
  return response.data;
};

export const deleteResellerApplication = async (id) => {
  const response = await api.delete(`/admin/reseller-applications/${id}`);
  return response.data;
};

export const approveResellerApplication = async (id) => {
  const response = await api.patch(`/admin/reseller-applications/${id}/approve`);
  return response.data;
};

// ─── Reviews ───

export const getAdminReviews = async (page = 1, search = "") => {
  const response = await api.get("/admin/reviews", { params: { page, search } });
  return response.data;
};

export const toggleReviewVisibility = async (id) => {
  const response = await api.patch(`/admin/reviews/${id}/toggle-visibility`);
  return response.data;
};

// ─── Coupons ───

export const getCoupons = async (page = 1, search = "", type = "") => {
  const response = await api.get("/admin/coupons", {
    params: { page, search, type },
  });
  return response.data;
};

export const createCoupon = async (data) => {
  const response = await api.post("/admin/coupons", data);
  return response.data;
};

export const updateCoupon = async (id, data) => {
  const response = await api.put(`/admin/coupons/${id}`, data);
  return response.data;
};

export const toggleCouponStatus = async (id) => {
  const response = await api.patch(`/admin/coupons/${id}/toggle-status`);
  return response.data;
};

export const deleteCoupon = async (id) => {
  const response = await api.delete(`/admin/coupons/${id}`);
  return response.data;
};

export const searchUsersForCoupon = async (search = "", role = "USER") => {
  const response = await api.get("/admin/coupons/search-users", {
    params: { search, role },
  });
  return response.data;
};

// ─── Coupons (User/Vendor) ───

export const getMyCoupons = async () => {
  const response = await api.get("/coupons/my");
  return response.data;
};

export const validateCoupon = async (code) => {
  const response = await api.post("/coupons/validate", { code });
  return response.data;
};

export const applyCoupon = async (code, originalPrice) => {
  const response = await api.post("/coupons/apply", { code, originalPrice });
  return response.data;
};

export const consumeCoupon = async (code) => {
  const response = await api.post("/coupons/consume", { code });
  return response.data;
};

export const calculateDiscount = async (code, originalPrice) => {
  const response = await api.post("/coupons/calculate", { code, originalPrice });
  return response.data;
};
