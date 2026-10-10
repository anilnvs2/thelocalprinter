"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import api from "@/services/api";
import { getUnreadCounts } from "@/services/chatService";

export function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [pendingBusinessesCount, setPendingBusinessesCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const { user, logout, vendorOnboarding, checkVendorOnboarding } = useAuth();
  const router = useRouter();

  const isVendor = user?.role === "VENDOR";
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (isVendor && !vendorOnboarding) {
      checkVendorOnboarding();
    }
  }, [isVendor, vendorOnboarding, checkVendorOnboarding]);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchPendingCount = async () => {
      try {
        const res = await api.get("/admin/approvals/count");
        const data = res.data.data || {};
        setPendingApprovalsCount(data.total || 0);
        // Businesses waiting on the admin: new registrations + edit/delete
        // requests (vendor profile changes belong to the Vendors tab).
        setPendingBusinessesCount((data.businesses || 0) + (data.changes || 0));
      } catch {
        setPendingApprovalsCount(0);
        setPendingBusinessesCount(0);
      }
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 60000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await getUnreadCounts();
        setUnreadChatCount(res.data.data.totalUnread || 0);
      } catch {
        setUnreadChatCount(0);
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="flex h-screen bg-background">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 overflow-visible transition-transform duration-300 md:relative md:z-40 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <AppSidebar
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          user={user}
          vendorOnboarding={vendorOnboarding}
          pendingApprovalsCount={pendingApprovalsCount}
          pendingBusinessesCount={pendingBusinessesCount}
          unreadChatCount={unreadChatCount}
          onLogout={handleLogout}
          onNavigate={() => setMobileOpen(false)}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader
          user={user}
          onMobileMenuToggle={() => setMobileOpen(!mobileOpen)}
          mobileMenuOpen={mobileOpen}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
