"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  createSubscriptionOrder,
  getSubscriptionPlans,
  getSubscriptionStatus,
  loadRazorpayScript,
  verifySubscriptionPayment,
} from "../../services/subscriptionService";

const formatPrice = (value) =>
  `\u20B9${Number(value || 0).toLocaleString("en-IN")}`;

const SearchSubscriptionGate = ({ children }) => {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();

  const [checking, setChecking] = useState(true);
  const [active, setActive] = useState(false);
  const [plans, setPlans] = useState([]);
  const [keyId, setKeyId] = useState(null);
  const [plansLoading, setPlansLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await getSubscriptionStatus();
      setActive(!!res?.data?.active);
      return !!res?.data?.active;
    } catch {
      setActive(false);
      return false;
    }
  }, []);

  // Guests must sign in first — search is not available without an account.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      const current =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/search";
      router.replace(`/login?redirect=${encodeURIComponent(current)}`);
      return;
    }

    // Admins are not part of the subscription flow.
    if (user.role === "ADMIN") {
      setActive(true);
      setChecking(false);
      return;
    }

    let cancelled = false;
    setChecking(true);
    fetchStatus().then((isActive) => {
      if (cancelled) return;
      setActive(isActive);
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, loading, fetchStatus, router]);

  // Only load plans when the user actually needs to subscribe.
  useEffect(() => {
    if (loading || !user || user.role === "ADMIN" || checking || active) {
      return;
    }
    let cancelled = false;
    setPlansLoading(true);
    getSubscriptionPlans()
      .then((res) => {
        if (cancelled) return;
        setPlans(res?.data?.plans || []);
        setKeyId(res?.data?.keyId || null);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load subscription plans.");
      })
      .finally(() => {
        if (!cancelled) setPlansLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loading, user, checking, active]);

  const handleSubscribe = async (plan) => {
    setError("");
    if (!keyId) {
      setError("Payment gateway is not configured. Please try again later.");
      return;
    }

    setProcessing(plan.id);
    try {
      await loadRazorpayScript();
      const res = await createSubscriptionOrder(plan.id);
      const order = res?.data?.order;
      const orderPlan = res?.data?.plan || plan;

      if (!order?.id) {
        throw new Error("Could not create payment order");
      }

      const razorpay = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "The Local Printer",
        description: `${orderPlan.label} search subscription`,
        order_id: order.id,
        prefill: {
          name: user?.fullName || "",
          email: user?.email || "",
          contact: user?.phone || user?.whatsappNumber || "",
        },
        theme: { color: "#EA580C" },
        handler: async (response) => {
          try {
            await verifySubscriptionPayment({
              planId: plan.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setActive(true);
            await refreshUser();
          } catch (err) {
            setError(
              err.response?.data?.message ||
                "Payment succeeded but activation failed. Please contact support."
            );
          } finally {
            setProcessing(null);
          }
        },
        modal: {
          ondismiss: () => setProcessing(null),
        },
      });

      razorpay.on("payment.failed", (response) => {
        setError(response?.error?.description || "Payment failed. Please try again.");
        setProcessing(null);
      });

      razorpay.open();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Could not start payment. Please try again."
      );
      setProcessing(null);
    }
  };

  if (loading || (!user && typeof window !== "undefined")) {
    return (
      <div className="min-h-screen pt-[100px] flex flex-col items-center justify-center gap-3 text-gray-500">
        <Loader2 className="w-9 h-9 animate-spin text-brand-orange" />
        <p className="text-sm font-medium">Checking your account...</p>
      </div>
    );
  }

  if (user && user.role !== "ADMIN" && checking) {
    return (
      <div className="min-h-screen pt-[100px] flex flex-col items-center justify-center gap-3 text-gray-500">
        <Loader2 className="w-9 h-9 animate-spin text-brand-orange" />
        <p className="text-sm font-medium">Checking your subscription...</p>
      </div>
    );
  }

  if (user && user.role !== "ADMIN" && !active) {
    return (
      <div className="min-h-screen pt-[100px] pb-16 px-4 md:px-6 bg-[#F7F8FA]">
        <div className="max-w-screen-xl w-full mx-auto">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-14 h-14 rounded-2xl bg-brand-orange/10 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-brand-orange" strokeWidth={2.5} />
            </div>
            <h1 className="text-[26px] md:text-[34px] font-extrabold text-brand-navy">
              Subscribe to unlock search
            </h1>
            <p className="text-[15px] md:text-[16px] font-medium text-gray-500 mt-2 max-w-[560px]">
              An active subscription is required to search businesses and poster
              boys. Choose a plan below to continue.
            </p>
          </div>

          {error && (
            <div className="max-w-[720px] mx-auto mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          {plansLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-16 text-gray-500 font-medium">
              Subscription plans are not available right now. Please try again
              later.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[1100px] mx-auto">
              {plans.map((plan) => {
                const isProcessing = processing === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-3xl border bg-white p-6 shadow-sm transition-all ${
                      plan.recommended
                        ? "border-brand-orange shadow-lg ring-1 ring-brand-orange/30"
                        : "border-gray-200"
                    }`}
                  >
                    {plan.recommended && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-orange text-white text-[11px] font-extrabold uppercase tracking-wide px-3 py-1 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Recommended
                      </span>
                    )}

                    <h2 className="text-[20px] font-extrabold text-brand-navy">
                      {plan.label}
                    </h2>
                    <p className="text-[13px] font-medium text-gray-500 mt-1">
                      Search access for {plan.durationDays} days
                    </p>

                    <div className="mt-5 flex items-end gap-1">
                      <span className="text-[34px] font-extrabold text-brand-navy leading-none">
                        {formatPrice(plan.price)}
                      </span>
                      <span className="text-[13px] font-semibold text-gray-400 mb-1">
                        / {plan.months === 1 ? "month" : `${plan.months} months`}
                      </span>
                    </div>

                    <ul className="mt-6 space-y-3 flex-1">
                      {(plan.benefits || []).map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <CheckCircle className="w-4.5 h-4.5 mt-0.5 shrink-0 text-emerald-500" />
                          <span className="text-[13.5px] font-medium text-gray-600">
                            {benefit}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => handleSubscribe(plan)}
                      disabled={!!processing}
                      className={`mt-7 w-full h-[46px] rounded-full font-bold text-[14px] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                        plan.recommended
                          ? "bg-brand-orange text-white hover:bg-brand-orange/90 shadow-md"
                          : "bg-brand-navy text-white hover:bg-[#122538]"
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          Subscribe
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-center text-[12.5px] font-medium text-gray-400 mt-8">
            Secure payment powered by Razorpay. Your subscription activates
            instantly after payment.
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default SearchSubscriptionGate;
