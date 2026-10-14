"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navigate } from "@/lib/navigate-shim";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

const BLOCKED_VENDOR_ROUTES = ["/vendor/dashboard"];

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, vendorOnboarding, checkVendorOnboarding } = useAuth();
  const pathname = usePathname();
  const [vendorCheckDone, setVendorCheckDone] = useState(false);
  const [vendorCheckLoading, setVendorCheckLoading] = useState(false);

  const isVendorRoute = allowedRoles?.includes("VENDOR") && user?.role === "VENDOR";
  const isBlockedVendorRoute = isVendorRoute && BLOCKED_VENDOR_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  useEffect(() => {
    if (isVendorRoute && !vendorOnboarding) {
      setVendorCheckLoading(true);
      checkVendorOnboarding().finally(() => {
        setVendorCheckDone(true);
        setVendorCheckLoading(false);
      });
    } else {
      setVendorCheckDone(true);
    }
  }, [isVendorRoute, vendorOnboarding, checkVendorOnboarding]);

  if (loading || (isVendorRoute && vendorCheckLoading && !vendorOnboarding)) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--bg-primary)",
        }}
      >
        <Loader2
          size={36}
          className="spin"
          style={{ animation: "spin 1s linear infinite", color: "var(--accent-primary)" }}
        />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirectMap = {
      ADMIN: "/admin/dashboard",
      VENDOR: "/vendor/dashboard",
      USER: "/user/dashboard/wishlist",
      POSTER_BOY: "/posterboy/dashboard",
    };
    return <Navigate to={redirectMap[user.role] || "/login"} replace />;
  }

  // Poster boys fill their profile form BEFORE admin approval. While their
  // account is pending they may only reach the form (/posterboy/dashboard)
  // and the awaiting-approval screen (/posterboy/pending).
  if (
    user.role === "POSTER_BOY" &&
    user.approvalStatus !== "approved" &&
    pathname !== "/posterboy/pending" &&
    pathname !== "/posterboy/dashboard"
  ) {
    return <Navigate to="/posterboy/pending" replace />;
  }

  if (isBlockedVendorRoute && vendorCheckDone && vendorOnboarding) {
    if (!vendorOnboarding.hasBusiness) {
      return <Navigate to="/vendor/businesses/new" replace />;
    }
    if (vendorOnboarding.firstBusinessStatus === "pending") {
      return <Navigate to="/vendor/pending" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
