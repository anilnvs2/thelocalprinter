"use client";
import { useEffect, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { getPosterBoyProfile } from "../../services/posterBoyService";
import { Clock, LogOut, Printer, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import ThemeToggle from "../../components/ThemeToggle";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

const POLL_MS = 8000;

const PosterBoyPending = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [accountStatus, setAccountStatus] = useState(user?.approvalStatus || "pending");
  const [profileStatus, setProfileStatus] = useState(null);
  const [checking, setChecking] = useState(false);
  const redirectedRef = useRef(false);

  // Poll the server so the "pending" screen flips to the dashboard the moment
  // an admin approves — no manual refresh needed.
  const sync = useCallback(async () => {
    if (redirectedRef.current) return;
    setChecking(true);
    try {
      const res = await getPosterBoyProfile();
      const u = res.data.user;
      const p = res.data.profile;
      setAccountStatus(u?.approvalStatus || "pending");
      setProfileStatus(p?.status || null);

      if (u?.approvalStatus === "approved" && !redirectedRef.current) {
        redirectedRef.current = true;
        router.replace("/posterboy/dashboard");
        return;
      }
    } catch {
      /* keep last known status */
    } finally {
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    sync();
    const id = setInterval(sync, POLL_MS);
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [sync]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const rejected = accountStatus === "rejected";
  const profileUnderReview = accountStatus === "approved" && profileStatus === "pending";

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="flex justify-end mb-6">
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Printer size={20} className="text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">Local Printer</span>
          </div>

          <Card>
            <CardContent className="p-6 sm:p-8 text-center">
              {rejected ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-5">
                    <AlertCircle size={36} />
                  </div>
                  <h1 className="text-xl font-bold text-foreground mb-2">Account Rejected</h1>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                    Your Poster Boy registration was not approved. Please contact support if you
                    believe this is a mistake.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-5">
                    <Clock size={36} />
                  </div>

                  <h1 className="text-xl font-bold text-foreground mb-2">
                    Account Submitted Successfully
                  </h1>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                    Your Poster Boy registration has been submitted.
                  </p>

                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-600 border-amber-500/30 mb-5 gap-1.5 px-3 py-1.5 flex-wrap justify-center"
                  >
                    {checking ? (
                      <Loader2 size={14} className="shrink-0 animate-spin" />
                    ) : profileUnderReview ? (
                      <CheckCircle size={14} className="shrink-0" />
                    ) : (
                      <Clock size={14} className="shrink-0" />
                    )}
                    <span>
                      Status:{" "}
                      {checking
                        ? "Checking..."
                        : profileUnderReview
                        ? "Account Approved · Profile Under Review"
                        : "Pending Admin Approval"}
                    </span>
                  </Badge>

                  <div className="p-3 bg-muted rounded-lg mb-5 text-left">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Full Name
                    </p>
                    <p className="text-sm font-semibold text-foreground mt-1">
                      {user?.fullName || "—"}
                    </p>
                    {user?.email && (
                      <>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-3">
                          Email
                        </p>
                        <p className="text-sm font-semibold text-foreground mt-1">{user.email}</p>
                      </>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    Our admin team is reviewing your registration. This screen updates automatically
                    — once your account is approved you will be taken to your dashboard.
                  </p>
                </>
              )}

              <Button variant="outline" className="w-full gap-2" onClick={handleLogout}>
                <LogOut size={16} />
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PosterBoyPending;
