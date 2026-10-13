"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import api from "../services/api";
import { checkOtpVerified } from "../services/authService";
import {
  Mail, Lock, Eye, EyeOff, User, Printer, AlertCircle, Loader2,
  UserCheck, Store, Briefcase, Phone, Building2, MapPin, FileText,
  CreditCard, Upload, CheckCircle, ArrowLeft, ArrowRight, Send,
  Clock, Shield, Video, Megaphone,
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

const RESELLER_CATEGORIES = ["Designer", "Printer", "Ad Agency", "Directory Business Listed Person"];
const BUSINESS_CATEGORIES = ["School", "Hospital", "Clinic", "Retail Store", "Corporate Office", "Hotel", "Restaurant", "Gym", "Salon", "Other"];

const STEPS = { ROLE_SELECT: 0, BASIC_INFO: 1, OTP_VERIFY: 2, SELECT_TYPE: 3, COMPLETE: 4 };

const Signup = () => {
  const [step, setStep] = useState(STEPS.ROLE_SELECT);
  const [role, setRole] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [registrationType, setRegistrationType] = useState(null);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef([]);
  const { signup, refreshUser } = useAuth();
  const router = useRouter();

  const [businessForm, setBusinessForm] = useState({ companyName: "", location: "", businessCategory: "", contactNumber: "", officialEmail: "", gstNumber: "", paymentRule: [] });
  const [resellerForm, setResellerForm] = useState({ companyName: "", address: "", businessCategory: "", contactNumber: "", gstNumber: "", yearlyTurnover: "" });
  const [locationVideo, setLocationVideo] = useState(null);
  const [businessCard, setBusinessCard] = useState(null);
  const [isAlreadyListed, setIsAlreadyListed] = useState(false);

  useEffect(() => { if (cooldown <= 0) return; const t = setTimeout(() => setCooldown((c) => c - 1), 1000); return () => clearTimeout(t); }, [cooldown]);

  // VENDOR and POSTER_BOY both skip the registration-type step: the account is
  // created straight after OTP verification.
  const isDirectFlow = role === "VENDOR" || role === "POSTER_BOY";
  const isPosterBoyFlow = role === "POSTER_BOY";

  const validateStep1 = () => {
    const e = {};
    if (!fullName.trim()) e.fullName = "Full name is required";
    else if (fullName.trim().length < 2) e.fullName = "Must be at least 2 characters";
    if (role === "USER" || role === "VENDOR" || role === "POSTER_BOY") {
      const whatsapp = whatsappNumber.trim();
      if (!whatsapp) e.whatsappNumber = "WhatsApp number is required";
      else if (!/^\+?[\d\s\-()]+$/.test(whatsapp) || whatsapp.replace(/\D/g, "").length < 7 || whatsapp.replace(/\D/g, "").length > 15)
        e.whatsappNumber = "Enter a valid WhatsApp number";
    }
    if (!email.trim()) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "Invalid email";
    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "At least 6 characters";
    if (!confirmPassword) e.confirmPassword = "Please confirm";
    else if (password !== confirmPassword) e.confirmPassword = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSendOtp = async () => {
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) { setErrors({ email: "Valid email is required" }); return; }
    setOtpLoading(true); setOtpError(""); setOtpSuccess("");
    try {
      await api.post("/auth/send-otp", { email: email.toLowerCase().trim() });
      setOtpSent(true); setCooldown(60); setOtpSuccess("OTP sent to your email");
    } catch (err) {
      setOtpError(err.response?.data?.message || "Failed to send OTP");
      if (err.response?.data?.cooldown) setCooldown(err.response.data.cooldown);
    } finally { setOtpLoading(false); }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const n = [...otp]; n[index] = value.slice(-1); setOtp(n); setOtpError("");
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => { if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus(); };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (p) { const n = p.split("").concat(Array(6).fill("")).slice(0, 6); setOtp(n); otpRefs.current[n.findIndex((d) => !d) === -1 ? 5 : n.findIndex((d) => !d)]?.focus(); }
  };

  const handleVerifyOtp = async () => {
    const s = otp.join("");
    if (s.length !== 6) { setOtpError("Please enter the complete 6-digit OTP"); return; }
    setVerifyLoading(true); setOtpError("");
    try {
      await api.post("/auth/verify-otp", { email: email.toLowerCase().trim(), otp: s });
      const checkRes = await checkOtpVerified(email.toLowerCase().trim());
      if (!checkRes.data.verified) {
        setOtpError("Verification failed on server. Please try again.");
        return;
      }
      setOtpVerified(true); setOtpSuccess("Email verified successfully");
      setTimeout(() => { isDirectFlow ? handleCompleteRegistration() : setStep(STEPS.SELECT_TYPE); }, 1000);
    } catch (err) { setOtpError(err.response?.data?.message || "Invalid OTP"); setOtp(["", "", "", "", "", ""]); otpRefs.current[0]?.focus(); }
    finally { setVerifyLoading(false); }
  };

  const handleTypeSelect = (type) => { setRegistrationType(type); setStep(STEPS.COMPLETE); };
  const handleBusinessChange = (field, value) => { setBusinessForm((p) => ({ ...p, [field]: value })); if (errors[field]) setErrors((p) => ({ ...p, [field]: "" })); };
  const handleResellerChange = (field, value) => { setResellerForm((p) => ({ ...p, [field]: value })); if (errors[field]) setErrors((p) => ({ ...p, [field]: "" })); };

  const selectedPaymentRules = Array.isArray(businessForm.paymentRule)
    ? businessForm.paymentRule
    : businessForm.paymentRule
      ? [businessForm.paymentRule]
      : [];
  const togglePaymentRule = (rule) => {
    setBusinessForm((p) => {
      const current = Array.isArray(p.paymentRule) ? p.paymentRule : p.paymentRule ? [p.paymentRule] : [];
      return { ...p, paymentRule: current.includes(rule) ? current.filter((r) => r !== rule) : [...current, rule] };
    });
  };

  const validateBusinessForm = () => { const e = {}; if (!businessForm.companyName.trim()) e.companyName = "Required"; if (!businessForm.location.trim()) e.location = "Required"; if (!businessForm.businessCategory) e.businessCategory = "Required"; if (!businessForm.contactNumber.trim()) e.contactNumber = "Required"; setErrors(e); return Object.keys(e).length === 0; };
  const validateResellerForm = () => { const e = {}; if (!resellerForm.companyName.trim()) e.companyName = "Required"; if (!resellerForm.businessCategory) e.businessCategory = "Required"; if (!resellerForm.contactNumber.trim()) e.contactNumber = "Required"; if (!businessCard) e.businessCard = "Required"; setErrors(e); return Object.keys(e).length === 0; };

  const handleCompleteRegistration = async () => {
    setServerError(""); setLoading(true);
    try {
      const verifyRes = await checkOtpVerified(email.toLowerCase().trim());
      if (!verifyRes.data.verified) {
        setServerError("Email verification expired or not found. Please go back and verify your email again.");
        setLoading(false);
        return;
      }
      if (isDirectFlow) {
        const posterBoy = role === "POSTER_BOY";
        await signup(fullName.trim(), email.toLowerCase().trim(), password, role, { fullName: fullName.trim(), email: email.toLowerCase().trim(), password, role, whatsappNumber: whatsappNumber.trim() || undefined });
        router.push(posterBoy ? "/posterboy/pending" : "/vendor/businesses/new");
        return;
      }
      const payload = { fullName: fullName.trim(), email: email.toLowerCase().trim(), password, role: "USER", whatsappNumber: whatsappNumber.trim() || undefined, registrationType };
      if (registrationType === "BUSINESS_PURPOSE") { payload.businessPurposeDetails = businessForm; }
      else if (registrationType === "RESELLER") {
        const fd = new FormData();
        fd.append("fullName", fullName.trim()); fd.append("email", email.toLowerCase().trim()); fd.append("password", password);
        fd.append("role", "USER"); fd.append("whatsappNumber", whatsappNumber.trim() || ""); fd.append("registrationType", "RESELLER");
        fd.append("resellerDetails", JSON.stringify(resellerForm));
        if (locationVideo) fd.append("locationVideo", locationVideo);
        if (businessCard) fd.append("businessCard", businessCard);
        const res = await api.post("/auth/signup", fd, { headers: { "Content-Type": "multipart/form-data" } });
        const { token: t } = res.data.data; localStorage.setItem("token", t); await refreshUser(); router.push("/user/dashboard/wishlist");
        return;
      }
      await signup(fullName.trim(), email.toLowerCase().trim(), password, "USER", payload);
      router.push("/user/dashboard/wishlist");
    } catch (err) { setServerError(err.response?.data?.message || "Registration failed. Please try again."); }
    finally { setLoading(false); }
  };

  const getPageTitle = () => {
    if (step === STEPS.ROLE_SELECT) return "Create Account";
    if (step === STEPS.BASIC_INFO) return isPosterBoyFlow ? "Worker Boy Registration" : isDirectFlow ? "Vendor Registration" : "Create Account";
    if (step === STEPS.OTP_VERIFY) return "Verify Email";
    if (step === STEPS.SELECT_TYPE) return "Choose Registration Type";
    return isPosterBoyFlow ? "Worker Boy Registration" : isDirectFlow ? "Vendor Registration" : registrationType === "RESELLER" ? "Reseller Application" : "Complete Registration";
  };

  const getPageSubtitle = () => {
    if (step === STEPS.ROLE_SELECT) return "Join Local Printer today";
    if (step === STEPS.BASIC_INFO) return isPosterBoyFlow ? "Get directly order calls from companies" : isDirectFlow ? "List your business on Local Printer" : "Join Local Printer today";
    if (step === STEPS.OTP_VERIFY) return "We'll send a verification code to your email";
    if (step === STEPS.SELECT_TYPE) return "Select how you'll use the platform";
    return "Fill in the required details";
  };

  const getStepNumber = () => {
    switch (step) { case STEPS.ROLE_SELECT: return 1; case STEPS.BASIC_INFO: return 2; case STEPS.OTP_VERIFY: return 3; case STEPS.SELECT_TYPE: return 4; case STEPS.COMPLETE: return isDirectFlow ? 4 : 5; default: return 1; }
  };

  const renderRoleSelect = () => (
    <>
      <p className="text-sm text-muted-foreground mb-5 text-center">How do you want to use Local Printer?</p>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { value: "USER", icon: UserCheck, label: "User", desc: "Find printing services", active: "border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400", iconBg: "bg-blue-500/10 text-blue-500" },
          { value: "VENDOR", icon: Store, label: "Vendor", desc: "List your business", active: "border-orange-500 bg-orange-500/5 text-orange-600 dark:text-orange-400", iconBg: "bg-orange-500/10 text-orange-500" },
          { value: "POSTER_BOY", icon: Megaphone, label: "Worker Boy", desc: "Get directly order calls from companies", active: "border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400", iconBg: "bg-emerald-500/10 text-emerald-500" },
        ].map((r) => (
          <button key={r.value} type="button" onClick={() => { setRole(r.value); setStep(STEPS.BASIC_INFO); }}
            className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${role === r.value ? r.active : "border-border bg-card hover:border-border/80"}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${r.iconBg}`}>
              <r.icon size={22} />
            </div>
            <span className="text-sm font-semibold text-foreground">{r.label}</span>
            <small className="text-xs text-muted-foreground">{r.desc}</small>
          </button>
        ))}
      </div>
    </>
  );

  const renderBasicInfo = () => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">Full Name *</Label>
        <div className="relative"><User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Enter your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={loading} autoComplete="name" className="pl-9 h-11" /></div>
        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">WhatsApp Number {(role === "USER" || role === "VENDOR" || role === "POSTER_BOY") && "*"}</Label>
        <div className="relative"><Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input type="tel" placeholder="Enter WhatsApp number" value={whatsappNumber} onChange={(e) => { setWhatsappNumber(e.target.value); if (errors.whatsappNumber) setErrors((p) => ({ ...p, whatsappNumber: "" })); }} disabled={loading} className="pl-9 h-11" /></div>
        {errors.whatsappNumber && <p className="text-xs text-destructive">{errors.whatsappNumber}</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">Email Address *</Label>
        <div className="relative"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input type="email" placeholder="Enter your email" value={email} onChange={(e) => { setEmail(e.target.value); if (serverError) setServerError(""); }} disabled={loading} autoComplete="email" className="pl-9 h-11" /></div>
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">Password *</Label>
        <div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input type={showPassword ? "text" : "password"} placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} autoComplete="new-password" className="pl-9 pr-10 h-11" />
          <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><EyeOff size={16} /></button>
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">Confirm Password *</Label>
        <div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input type="password" placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} autoComplete="new-password" className="pl-9 h-11" /></div>
        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1 h-11 gap-1" onClick={() => { setStep(STEPS.ROLE_SELECT); setServerError(""); setErrors({}); }}><ArrowLeft size={14} /> Back</Button>
        <Button type="button" className="flex-[2] h-11 gap-1 bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20" onClick={() => { if (validateStep1()) setStep(STEPS.OTP_VERIFY); }}>Continue <ArrowRight size={14} /></Button>
      </div>
    </div>
  );

  const renderOtpVerify = () => (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">Email Address</Label>
        <div className="relative"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input type="email" value={email} disabled className="pl-9 opacity-70" /></div>
        {otpVerified && <p className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle size={12} /> Email Verified</p>}
      </div>
      {!otpVerified && (
        <>
          {!otpSent ? (
            <Button type="button" className="w-full h-11 gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20" onClick={handleSendOtp} disabled={otpLoading}>
              {otpLoading ? <><Loader2 size={16} className="animate-spin" /> Sending OTP...</> : <><Send size={16} /> Send OTP</>}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-sm">
                <CheckCircle size={14} /> OTP sent to {email}
              </div>
              <Label className="text-sm font-medium text-foreground">Enter Verification Code</Label>
              <div className="flex gap-2 justify-center">
                {otp.map((digit, i) => (
                  <input key={i} ref={(el) => (otpRefs.current[i] = el)} type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                    className="w-11 h-12 text-center text-lg font-bold border-2 rounded-lg bg-background text-foreground outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" />
                ))}
              </div>
              {otpError && <div className="flex items-center gap-1 text-xs text-destructive"><AlertCircle size={12} /> {otpError}</div>}
              {otpSuccess && !otpVerified && <div className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle size={12} /> {otpSuccess}</div>}
              <Button type="button" className="w-full h-11 gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20" onClick={handleVerifyOtp} disabled={verifyLoading || otp.join("").length !== 6}>
                {verifyLoading ? <><Loader2 size={16} className="animate-spin" /> Verifying...</> : <><Shield size={16} /> Verify OTP</>}
              </Button>
              <div className="text-center">
                {cooldown > 0 ? (
                  <span className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Clock size={12} /> Resend OTP in {cooldown}s</span>
                ) : (
                  <button type="button" onClick={handleSendOtp} disabled={otpLoading} className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline">Resend OTP</button>
                )}
              </div>
            </div>
          )}
        </>
      )}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1 h-11 gap-1" onClick={() => { setStep(STEPS.BASIC_INFO); setOtpSent(false); setOtpVerified(false); setOtp(["", "", "", "", "", ""]); setOtpError(""); setOtpSuccess(""); setServerError(""); }}><ArrowLeft size={14} /> Back</Button>
        {otpVerified && (
          <Button type="button" className="flex-1 h-11 gap-1 bg-orange-600 hover:bg-orange-700 text-white" onClick={() => { isDirectFlow ? handleCompleteRegistration() : setStep(STEPS.SELECT_TYPE); }}>
            {isDirectFlow ? "Create Account" : "Continue"} <ArrowRight size={14} />
          </Button>
        )}
      </div>
    </div>
  );

  const renderSelectType = () => (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground text-center mb-1">How do you want to use Local Printer?</p>
      {[
        { type: "PERSONAL_USE", icon: UserCheck, label: "Personal Use", desc: "For personal printing requirements", iconBg: "bg-blue-500/10 text-blue-500" },
        { type: "BUSINESS_PURPOSE", icon: Briefcase, label: "Business Purpose", desc: "For your own business needs", iconBg: "bg-orange-500/10 text-orange-500" },
        { type: "RESELLER", icon: Store, label: "Reseller", desc: "For reselling/arranging printing services", iconBg: "bg-violet-500/10 text-violet-500" },
      ].map((t) => (
        <button key={t.type} type="button" onClick={() => handleTypeSelect(t.type)}
          className="flex items-center gap-4 p-3.5 border-2 border-border rounded-xl bg-card hover:border-orange-500/30 hover:bg-orange-500/5 transition-all cursor-pointer text-left w-full">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.iconBg}`}><t.icon size={22} /></div>
          <div><div className="font-semibold text-foreground text-sm">{t.label}</div><div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div></div>
        </button>
      ))}
      <Button type="button" variant="outline" className="w-full h-11 gap-1" onClick={() => { setStep(STEPS.OTP_VERIFY); setOtpSent(true); setServerError(""); }}><ArrowLeft size={14} /> Back</Button>
    </div>
  );

  const renderPersonalUse = () => (
    <div className="space-y-4">
      <div className="p-6 rounded-xl bg-card border text-center">
        <div className="w-14 h-14 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-3"><CheckCircle size={28} /></div>
        <h3 className="font-semibold text-foreground mb-1">Personal Use Registration</h3>
        <p className="text-sm text-muted-foreground">No additional details required. Complete your registration to get started.</p>
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1 h-11 gap-1" onClick={() => setStep(STEPS.SELECT_TYPE)}><ArrowLeft size={14} /> Back</Button>
        <Button type="button" className="flex-[2] h-11 bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20" onClick={handleCompleteRegistration} disabled={loading}>
          {loading ? <><Loader2 size={16} className="animate-spin mr-2" /> Creating Account...</> : "Complete Registration"}
        </Button>
      </div>
    </div>
  );

  const renderBusinessForm = () => (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground">Business Details</h3>
      {[
        { field: "companyName", label: "Company Name *", icon: Building2, placeholder: "Enter company name" },
        { field: "location", label: "Location *", icon: MapPin, placeholder: "Enter business location" },
        { field: "contactNumber", label: "Contact Number *", icon: Phone, placeholder: "Enter contact number" },
        { field: "officialEmail", label: "Official Mail ID", icon: Mail, placeholder: "Enter official email (optional)" },
        { field: "gstNumber", label: "GST Number", icon: CreditCard, placeholder: "Enter GST number (optional)" },
      ].map((f) => (
        <div key={f.field} className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">{f.label}</Label>
          <div className="relative"><f.icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type={f.field === "officialEmail" ? "email" : f.field === "contactNumber" ? "tel" : "text"} placeholder={f.placeholder}
              value={businessForm[f.field]} onChange={(e) => handleBusinessChange(f.field, e.target.value)} className="pl-9" /></div>
          {errors[f.field] && <p className="text-xs text-destructive">{errors[f.field]}</p>}
        </div>
      ))}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">Business Category *</Label>
        <select value={businessForm.businessCategory} onChange={(e) => handleBusinessChange("businessCategory", e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer">
          <option value="">Select category</option>
          {BUSINESS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {errors.businessCategory && <p className="text-xs text-destructive">{errors.businessCategory}</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">Payment Rule * <span className="text-xs font-normal text-muted-foreground">(select one or more)</span></Label>
        <div className="grid grid-cols-2 gap-3">
          {["Cash & Carry", "PO Based"].map((rule) => {
            const selected = selectedPaymentRules.includes(rule);
            return (
              <button key={rule} type="button" onClick={() => togglePaymentRule(rule)} aria-pressed={selected}
                className={`p-2.5 border-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${selected ? "border-primary bg-primary/5 text-primary" : "border-border bg-muted text-muted-foreground"}`}>
                {selected && <CheckCircle size={14} />} {rule}
              </button>
            );
          })}
        </div>
      </div>
      {serverError && <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"><AlertCircle size={16} /> {serverError}</div>}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1 h-11 gap-1" onClick={() => setStep(STEPS.SELECT_TYPE)}><ArrowLeft size={14} /> Back</Button>
        <Button type="button" className="flex-[2] h-11 bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20" onClick={() => { if (validateBusinessForm()) handleCompleteRegistration(); }} disabled={loading}>
          {loading ? <><Loader2 size={16} className="animate-spin mr-2" /> Creating Account...</> : "Complete Registration"}
        </Button>
      </div>
    </div>
  );

  const renderResellerForm = () => (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground">Reseller Application</h3>
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-orange-500/10 text-orange-600 text-xs">
        <Shield size={14} className="flex-shrink-0" /> Your application goes to our admin for review. Your reseller account stays pending until it is approved.
      </div>
      {[
        { field: "companyName", label: "Company Name *", icon: Building2, placeholder: "Enter company name" },
        { field: "address", label: "Address", icon: MapPin, placeholder: "Enter business address" },
        { field: "contactNumber", label: "Contact Number *", icon: Phone, placeholder: "Enter contact number" },
        { field: "gstNumber", label: "GST Number", icon: CreditCard, placeholder: "Enter GST number (optional)" },
        { field: "yearlyTurnover", label: "Yearly Turnover", icon: FileText, placeholder: "Enter yearly turnover (optional)" },
      ].map((f) => (
        <div key={f.field} className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">{f.label}</Label>
          <div className="relative"><f.icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={f.placeholder} value={resellerForm[f.field]} onChange={(e) => handleResellerChange(f.field, e.target.value)} className="pl-9" /></div>
          {errors[f.field] && <p className="text-xs text-destructive">{errors[f.field]}</p>}
        </div>
      ))}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">Business Category *</Label>
        <select value={resellerForm.businessCategory} onChange={(e) => handleResellerChange("businessCategory", e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer">
          <option value="">Select category</option>
          {RESELLER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {errors.businessCategory && <p className="text-xs text-destructive">{errors.businessCategory}</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">Business Card File *</Label>
        <div className={`border-2 border-dashed rounded-lg p-4 text-center bg-muted cursor-pointer transition-all ${errors.businessCard ? "border-destructive" : "border-input"}`}>
          <input type="file" accept="image/*,.pdf" onChange={(e) => { setBusinessCard(e.target.files[0]); if (errors.businessCard) setErrors((p) => ({ ...p, businessCard: "" })); }} className="hidden" id="businessCard" />
          <label htmlFor="businessCard" className="cursor-pointer flex flex-col items-center gap-1">
            {businessCard ? (<><FileText size={20} className="text-emerald-500" /><span className="text-xs text-emerald-500">{businessCard.name}</span><span className="text-xs text-muted-foreground">Click to change</span></>) :
              (<><Upload size={20} className="text-muted-foreground" /><span className="text-xs text-muted-foreground">Upload printable business card (JPG, PNG, PDF)</span></>)}
          </label>
        </div>
        {errors.businessCard && <p className="text-xs text-destructive">{errors.businessCard}</p>}
      </div>
      <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
        <input type="checkbox" checked={isAlreadyListed} onChange={(e) => setIsAlreadyListed(e.target.checked)} className="accent-primary w-4 h-4" />
        I am already listed as a business on this website
      </label>
      {!isAlreadyListed && (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">Location Video with Name Board</Label>
          <div className="border-2 border-dashed border-input rounded-lg p-4 text-center bg-muted cursor-pointer transition-all">
            <input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => setLocationVideo(e.target.files[0])} className="hidden" id="locationVideo" />
            <label htmlFor="locationVideo" className="cursor-pointer flex flex-col items-center gap-1">
              {locationVideo ? (<><Video size={20} className="text-emerald-500" /><span className="text-xs text-emerald-500">{locationVideo.name}</span><span className="text-xs text-muted-foreground">Click to change</span></>) :
                (<><Upload size={20} className="text-muted-foreground" /><span className="text-xs text-muted-foreground">Upload location video (MP4, MOV, WebM)</span></>)}
            </label>
          </div>
        </div>
      )}
      {serverError && <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"><AlertCircle size={16} /> {serverError}</div>}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1 h-11 gap-1" onClick={() => setStep(STEPS.SELECT_TYPE)}><ArrowLeft size={14} /> Back</Button>
        <Button type="button" className="flex-[2] h-11 bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20" onClick={() => { if (validateResellerForm()) handleCompleteRegistration(); }} disabled={loading}>
          {loading ? <><Loader2 size={16} className="animate-spin mr-2" /> Submitting...</> : "Submit Application"}
        </Button>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case STEPS.ROLE_SELECT: return renderRoleSelect();
      case STEPS.BASIC_INFO: return renderBasicInfo();
      case STEPS.OTP_VERIFY: return renderOtpVerify();
      case STEPS.SELECT_TYPE: return renderSelectType();
      case STEPS.COMPLETE:
        if (registrationType === "PERSONAL_USE") return renderPersonalUse();
        if (registrationType === "BUSINESS_PURPOSE") return renderBusinessForm();
        if (registrationType === "RESELLER") return renderResellerForm();
        return null;
      default: return null;
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:flex-1 relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Printer size={28} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Local Printer</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 text-center">Start Your Printing Journey</h1>
          <p className="text-slate-400 text-lg text-center max-w-md">
            Create an account to explore local printing services or list your business.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-background">
        <div className="w-full max-w-[440px]">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-orange-600 transition-colors">
              ← Back to Home
            </Link>
            <ThemeToggle />
          </div>

          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-500/20"><Printer size={20} className="text-white" /></div>
            <span className="text-lg font-bold text-foreground">Local Printer</span>
          </div>

          <Card className="border-border/50 shadow-xl shadow-black/5">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-foreground">{getPageTitle()}</h2>
                <p className="text-sm text-muted-foreground mt-1">{getPageSubtitle()}</p>
              </div>

              {step !== STEPS.ROLE_SELECT && (
                <div className="flex items-center justify-center gap-2 mb-5">
                  {["Info", "Verify", ...(isDirectFlow ? [] : ["Type"]), "Done"].map((label, i) => {
                    const current = getStepNumber(); const stepNum = i + 2; const isActive = current >= stepNum;
                    return (
                      <div key={label} className="flex items-center gap-1.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isActive ? "bg-orange-600 text-white" : "bg-muted text-muted-foreground"}`}>
                          {current > stepNum ? <CheckCircle size={12} /> : i + 1}
                        </div>
                        <span className={`text-xs hidden sm:inline ${current === stepNum ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{label}</span>
                        {i < (isDirectFlow ? 2 : 3) && <div className={`w-5 h-0.5 rounded ${current > stepNum ? "bg-orange-600" : "bg-muted"}`} />}
                      </div>
                    );
                  })}
                </div>
              )}

              {serverError && step !== STEPS.COMPLETE && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-4"><AlertCircle size={16} /> {serverError}</div>
              )}

              {renderStepContent()}
            </CardContent>
          </Card>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-orange-600 dark:text-orange-400 font-semibold hover:underline transition-colors">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
