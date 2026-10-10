import api from "./api";

export const getUserDashboard = async () => {
  const response = await api.get("/user/dashboard");
  return response.data;
};

export const getPublicBusinesses = async (params = {}) => {
  const response = await api.get("/user/businesses", { params });
  return response.data;
};

export const getBusinessDetails = async (id) => {
  const response = await api.get(`/user/businesses/${id}`);
  return response.data;
};

export const getFilterOptions = async () => {
  const response = await api.get("/user/businesses/filters");
  return response.data;
};

export const getWishlist = async (page = 1) => {
  const response = await api.get("/user/wishlist", { params: { page } });
  return response.data;
};

export const addToWishlist = async (businessId) => {
  const response = await api.post("/user/wishlist", { businessId });
  return response.data;
};

export const removeFromWishlist = async (businessId) => {
  const response = await api.delete(`/user/wishlist/${businessId}`);
  return response.data;
};

export const checkWishlist = async (businessId) => {
  const response = await api.get(`/user/wishlist/check/${businessId}`);
  return response.data;
};

export const getUserProfile = async () => {
  const response = await api.get("/user/profile");
  return response.data;
};

export const getBusinessReviews = async (businessId, page = 1) => {
  const response = await api.get(`/user/businesses/${businessId}/reviews`, { params: { page } });
  return response.data;
};

export const getPublicBusinessReviews = async (businessId, page = 1) => {
  const response = await api.get(`/user/public/businesses/${businessId}/reviews`, { params: { page } });
  return response.data;
};

export const getMyReview = async (businessId) => {
  const response = await api.get(`/user/businesses/${businessId}/my-review`);
  return response.data;
};

export const createReview = async (businessId, data) => {
  const response = await api.post(`/user/businesses/${businessId}/reviews`, data);
  return response.data;
};

export const updateReview = async (reviewId, data) => {
  const response = await api.put(`/user/reviews/${reviewId}`, data);
  return response.data;
};

export const deleteReview = async (reviewId) => {
  const response = await api.delete(`/user/reviews/${reviewId}`);
  return response.data;
};

export const getActiveCategories = async () => {
  const response = await api.get("/user/public/categories");
  return response.data;
};

export const searchPublicBusinesses = async (params = {}) => {
  const response = await api.get("/user/public/businesses", { params });
  return response.data;
};

export const getPublicFilterOptions = async () => {
  const response = await api.get("/user/public/businesses/filters");
  return response.data;
};

export const getPublicBusinessDetails = async (id) => {
  const response = await api.get(`/user/public/businesses/${id}`);
  return response.data;
};

export const getLocationAutocomplete = async (query, limit = 5, signal) => {
  const response = await api.get("/user/public/locations/autocomplete", {
    params: { q: query, limit },
    ...(signal ? { signal } : {}),
  });
  return response.data;
};

// Public Poster Boys (category pages + search results)
export const getPublicPosterBoys = async (params = {}) => {
  const response = await api.get("/user/public/poster-boys", { params });
  return response.data;
};

export const getPublicPosterBoy = async (id) => {
  const response = await api.get(`/user/public/poster-boys/${id}`);
  return response.data;
};

export const revealPosterBoyContact = async (id) => {
  const response = await api.post(`/user/public/poster-boys/${id}/contact`);
  return response.data;
};
