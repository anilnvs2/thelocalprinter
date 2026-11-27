import api from "./api";

export const getSubscriptionPlans = async () => {
  const response = await api.get("/subscription/plans");
  return response.data;
};

export const getSubscriptionStatus = async () => {
  const response = await api.get("/subscription/status");
  return response.data;
};

export const createSubscriptionOrder = async (planId) => {
  const response = await api.post("/subscription/create-order", { planId });
  return response.data;
};

export const verifySubscriptionPayment = async (payload) => {
  const response = await api.post("/subscription/verify", payload);
  return response.data;
};

let razorpayScriptPromise = null;

export const loadRazorpayScript = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay can only load in the browser"));
  }
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      razorpayScriptPromise = null;
      reject(new Error("Failed to load payment gateway"));
    };
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
};
