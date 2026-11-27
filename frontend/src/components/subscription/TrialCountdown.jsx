"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Timer } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getSubscriptionStatus } from "@/services/subscriptionService";

const pad = (n) => String(Math.max(0, n)).padStart(2, "0");

// Header pill: live countdown of the 1-day free trial after first login.
// Paid subscribers see nothing, a finished trial sees an Upgrade link.
const TrialCountdown = ({ className = "" }) => {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const watched = !!user && user.role !== "ADMIN";

  useEffect(() => {
    if (loading || !watched) {
      setStatus(null);
      return undefined;
    }

    let cancelled = false;
    const load = () => {
      getSubscriptionStatus()
        .then((res) => {
          if (!cancelled) setStatus(res?.data || null);
        })
        .catch(() => {
          if (!cancelled) setStatus(null);
        });
    };

    load();
    const refresh = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(refresh);
    };
  }, [loading, watched]);

  // Tick every second only while an end time is known.
  useEffect(() => {
    if (!status?.trialEndsAt) return undefined;
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [status?.trialEndsAt]);

  if (loading || !watched || !status) return null;

  const endsAt = status.trialEndsAt ? new Date(status.trialEndsAt).getTime() : NaN;
  const hasClock = Number.isFinite(endsAt);
  const remaining = hasClock ? endsAt - now : 0;
  const trialActive = hasClock && remaining > 0 && !!status.trialEligible;
  const trialEnded =
    !status.subscriptionActive && !!status.trialStartedAt && hasClock && remaining <= 0;

  if (status.subscriptionActive) return null;
  if (!trialActive && !trialEnded) return null;

  if (trialEnded) {
    return (
      <Link
        href="/search"
        aria-label="Free trial ended. Upgrade your plan"
        className={`group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white pl-1.5 pr-2.5 py-1.5 text-brand-navy ring-1 ring-brand-border shadow-sm transition-all duration-200 hover:ring-brand-orange/70 hover:text-brand-orange active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange max-[359px]:hidden ${className}`}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange">
          <Timer className="h-3 w-3" strokeWidth={2.75} />
        </span>
        <span className="hidden text-[10px] font-black uppercase leading-none tracking-[0.08em] text-brand-muted xl:inline">
          Trial Ended
        </span>
        <span className="text-[11px] font-black leading-none tracking-tight text-brand-orange sm:text-[13px]">
          Upgrade
        </span>
        <ArrowUpRight className="h-3 w-3 text-brand-orange" strokeWidth={3} />
      </Link>
    );
  }

  const totalSec = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  const urgent = remaining <= 10 * 60 * 1000;
  const warning = remaining <= 60 * 60 * 1000;
  const tone = urgent
    ? "from-red-600 via-red-500 to-orange-500"
    : warning
      ? "from-amber-500 via-orange-500 to-[#EA580C]"
      : "from-[#EA580C] via-[#F45116] to-[#F97316]";

  return (
    <Link
      href="/search"
      aria-label={`Free trial remaining ${clock}`}
      className={`group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r ${tone} py-1.5 pl-1.5 pr-2.5 text-white shadow-[0_6px_16px_-6px_rgba(234,88,12,0.85)] ring-1 ring-white/25 transition-all duration-200 hover:scale-[1.04] hover:shadow-[0_8px_20px_-6px_rgba(234,88,12,0.95)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white max-[359px]:hidden ${className}`}
    >
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25">
        <Timer className="h-3 w-3" strokeWidth={2.75} />
        <span
          className={`absolute -right-px -top-px h-1.5 w-1.5 rounded-full bg-white ${
            urgent ? "animate-ping" : "animate-pulse"
          }`}
        />
      </span>

      <span className="hidden text-[10px] font-black uppercase leading-none tracking-[0.08em] opacity-90 xl:inline">
        Free Trial
      </span>

      <span className="text-[11px] font-black leading-none tabular-nums tracking-tight sm:text-[13px]">
        {clock}
      </span>
    </Link>
  );
};

export default TrialCountdown;
