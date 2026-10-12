import api from "./api";

export const getVendorDashboard = async () => {
  const response = await api.get("/vendor/dashboard");
  return response.data;
};

export const getMyBusinesses = async (page = 1, search = "", status = "") => {
  const response = await api.get("/vendor/businesses", {
    params: { page, search, status },
  });
  return response.data;
};

export const getBusinessById = async (id) => {
  const response = await api.get(`/vendor/businesses/${id}`);
  return response.data;
};

export const createBusiness = async (businessData) => {
  const response = await api.post("/vendor/businesses", businessData);
  return response.data;
};

export const updateBusiness = async (id, businessData) => {
  const response = await api.put(`/vendor/businesses/${id}`, businessData);
  return response.data;
};

export const deleteBusiness = async (id) => {
  const response = await api.delete(`/vendor/businesses/${id}`);
  return response.data;
};

export const toggleBusinessStatus = async (id) => {
  const response = await api.patch(`/vendor/businesses/${id}/toggle-status`);
  return response.data;
};

export const getVendorProfile = async () => {
  const response = await api.get("/vendor/profile");
  return response.data;
};

export const updateVendorProfile = async (profileData) => {
  const response = await api.put("/vendor/profile", profileData);
  return response.data;
};

export const getVendorReviews = async (params = {}) => {
  const response = await api.get("/vendor/reviews", { params });
  return response.data;
};

export const getVendorReviewSummary = async () => {
  const response = await api.get("/vendor/reviews/summary");
  return response.data;
};

export const getFraudReports = async (params = {}) => {
  const response = await api.get("/vendor/fraud-reports", { params });
  return response.data;
};
