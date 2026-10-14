"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Heart,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Store,
  Tag,
  UserCircle,
  Search,
  Star,
  Package,
  MessageCircle,
  ClipboardCheck,
  Megaphone,
  AlertTriangle,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const navItemsByRole = {
  user: [
    { to: "/user/dashboard/wishlist", icon: Heart, label: "Wishlist" },
    { to: "/user/dashboard/chat", icon: MessageCircle, label: "Chat", showChatBadge: true },
    { to: "/user/dashboard/my-package", icon: Package, label: "My Package" },
    { to: "/user/dashboard/profile", icon: UserCircle, label: "Profile" },
  ],
  vendorFull: [
    { to: "/vendor/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/vendor/businesses", icon: Building2, label: "My Businesses" },
    { to: "/vendor/fraud-reports", icon: AlertTriangle, label: "Fraud Report" },
    { to: "/vendor/reviews", icon: Star, label: "Reviews" },
    { to: "/vendor/chat", icon: MessageCircle, label: "Chat", showChatBadge: true },
    { to: "/vendor/package", icon: Package, label: "My Package" },
    { to: "/vendor/profile", icon: UserCircle, label: "Profile" },
  ],
  vendorPending: [
    { to: "/vendor/businesses", icon: Building2, label: "My Businesses" },
  ],
  poster_boy: [
    { to: "/posterboy/dashboard", icon: Megaphone, label: "Dashboard" },
  ],
  admin: [
    { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/approvals", icon: ClipboardCheck, label: "Approvals", showBadge: true },
    { to: "/admin/vendors", icon: Store, label: "Vendors" },
    { to: "/admin/posterboys", icon: Megaphone, label: "Poster Boys", showPosterBoyBadge: true },
    { to: "/admin/users", icon: Users, label: "Users" },
    { to: "/admin/businesses", icon: Building2, label: "Businesses", showBusinessBadge: true },
    { to: "/admin/categories", icon: Tag, label: "Categories" },
    { to: "/admin/reviews", icon: Star, label: "Reviews" },
    { to: "/admin/chat", icon: MessageCircle, label: "Chat", showChatBadge: true },
    { to: "/admin/settings", icon: Settings, label: "Settings" },
  ],
};

const roleIndicatorColors = {
  admin: "bg-violet-500",
  vendor: "bg-orange-500",
  user: "bg-blue-500",
  poster_boy: "bg-emerald-500",
};

const roleAvatarColors = {
  admin: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  vendor: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  user: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  poster_boy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export function AppSidebar({
  collapsed,
  onCollapsedChange,
  user,
  vendorOnboarding,
  pendingApprovalsCount,
  pendingBusinessesCount = 0,
  pendingPosterBoysCount = 0,
  unreadChatCount,
  onLogout,
  onNavigate,
  className,
}) {
  const pathname = usePathname();
  const role = user?.role?.toLowerCase();

  const isVendor = user?.role === "VENDOR";
  const hasApprovedBusiness =
    isVendor &&
    vendorOnboarding?.hasBusiness &&
    vendorOnboarding?.firstBusinessStatus === "approved";
  const items = isVendor
    ? hasApprovedBusiness
      ? navItemsByRole.vendorFull
      : navItemsByRole.vendorPending
    : navItemsByRole[role] || navItemsByRole.user;

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[260px]",
        className
      )}
    >
      {/* Logo */}
      <Link href="/" className="flex h-20 items-center gap-3 border-b border-sidebar-border px-4 hover:bg-sidebar-hover transition-colors">
        <img src="/favicon.png" alt="The Local Printer" className={cn("shrink-0 object-contain", collapsed ? "h-9 w-9" : "h-9 w-9")} />
      </Link>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const isActive =
              pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                href={item.to}
                onClick={onNavigate}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-sidebar-accent text-white"
                    : "text-white/50 hover:bg-sidebar-hover hover:text-white/80"
                )}
              >
                {isActive && (
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full",
                      roleIndicatorColors[role] || "bg-blue-500"
                    )}
                  />
                )}
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    collapsed ? "" : "ml-1"
                  )}
                />
                {!collapsed && <span>{item.label}</span>}
                {item.showBadge && pendingApprovalsCount > 0 && !collapsed && (
                  <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white animate-pulse">
                    {pendingApprovalsCount}
                  </span>
                )}
                {item.showBadge && pendingApprovalsCount > 0 && collapsed && (
                  <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                )}
                {item.showChatBadge && unreadChatCount > 0 && !collapsed && (
                  <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white animate-pulse">
                    {unreadChatCount}
                  </span>
                )}
                {item.showChatBadge && unreadChatCount > 0 && collapsed && (
                  <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                )}
                {item.showBusinessBadge && pendingBusinessesCount > 0 && !collapsed && (
                  <span className="ml-auto h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                )}
                {item.showBusinessBadge && pendingBusinessesCount > 0 && collapsed && (
                  <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                )}
                {item.showPosterBoyBadge && pendingPosterBoysCount > 0 && !collapsed && (
                  <span className="ml-auto h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                )}
                {item.showPosterBoyBadge && pendingPosterBoysCount > 0 && collapsed && (
                  <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-sidebar-border" />

      {/* User Info & Logout */}
      <div className="flex flex-col gap-2 p-3">
        {!collapsed && user && (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                roleAvatarColors[role] || "bg-blue-500/10 text-blue-600"
              )}
            >
              {user.fullName?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">
                {user.fullName}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">
                {user.role}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/50 transition-all duration-150 hover:bg-red-500/10 hover:text-red-400",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-[18px] w-[18px]" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse Button - desktop only */}
      <button
        onClick={() => onCollapsedChange?.(!collapsed)}
        className="absolute -right-3 top-5 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-gray-200 text-gray-700 shadow-lg backdrop-blur-sm transition-colors hover:bg-gray-300 dark:border-white/20 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/20 dark:hover:text-white md:flex"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </aside>
  );
}
