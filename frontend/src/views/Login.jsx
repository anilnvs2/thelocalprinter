"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import { Mail, Lock, Eye, EyeOff, Printer, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, checkVendorOnboarding } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) { setError("Please fill in all fields"); return; }
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === "VENDOR") {
        const onboarding = await checkVendorOnboarding();
        if (!onboarding || !onboarding.hasBusiness) router.push("/vendor/businesses/new");
        else if (onboarding.firstBusinessStatus === "pending") router.push("/vendor/pending");
        else if (onboarding.firstBusinessStatus === "rejected") router.push("/vendor/businesses");
        else router.push("/vendor/dashboard");
      } else if (user.role === "POSTER_BOY") {
        router.push(user.approvalStatus === "approved" ? "/posterboy/dashboard" : "/posterboy/pending");
      } else {
        const redirectMap = { ADMIN: "/admin/dashboard", USER: "/user/dashboard/wishlist" };
        router.push(redirectMap[user.role] || "/user/dashboard/wishlist");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:flex-1 relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <div className="mb-6">
            <span className="text-3xl font-extrabold italic tracking-tight text-white" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              The Local Printer
            </span>
          </div>
          <h1 className="text-4xl font-extrabold italic text-white mb-4 text-center" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>Find Local Printing Services</h1>
          <p className="text-slate-400 text-lg text-center max-w-md italic" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            Connect with trusted local printers for all your printing needs. Fast, reliable, and affordable.
          </p>
          <div className="mt-8 w-full max-w-sm mx-auto">
            <img
              src="/login-animation.gif"
              alt="Printing Animation"
              className="w-full h-auto rounded-2xl"
              style={{ maxHeight: "260px", objectFit: "contain" }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-background">
        <div className="w-full max-w-[420px]">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-orange-600 transition-colors">
              ← Back to Home
            </Link>
            <ThemeToggle />
          </div>

          <div className="lg:hidden mb-8">
            <span className="text-xl font-extrabold italic tracking-tight text-foreground" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              The Local Printer
            </span>
          </div>

          <Card className="border-border/50 shadow-xl shadow-black/5">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
                <p className="text-sm text-muted-foreground mt-1">Sign in to your account to continue</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-5">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      autoComplete="email"
                      className="pl-9 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="current-password"
                      className="pl-9 pr-10 h-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20" disabled={loading}>
                  {loading ? <><Loader2 size={16} className="animate-spin mr-2" /> Signing in...</> : "Sign In"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-orange-600 dark:text-orange-400 font-semibold hover:underline transition-colors">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
