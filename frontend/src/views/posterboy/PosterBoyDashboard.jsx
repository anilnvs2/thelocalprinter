"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  User, Phone, CreditCard, Languages, MapPin, Wrench, Camera,
  Loader2, AlertCircle, CheckCircle, Clock, Plus, X, ImagePlus, Video,
} from "lucide-react";
import ThemeToggle from "../../components/ThemeToggle";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { getPosterBoyProfile, updatePosterBoyProfile } from "../../services/posterBoyService";
import ProtectedVideo from "../../components/media/ProtectedVideo";
import {
  ALLOWED_FOLDERS, uploadToCloudinary, getFileCategory,
} from "../../lib/cloudinary";

const LANGUAGE_OPTIONS = [
  "English", "Hindi", "Telugu", "Tamil", "Kannada",
  "Malayalam", "Marathi", "Gujarati", "Bengali", "Punjabi", "Other",
];

const SKILL_OPTIONS = [
  "Flex & Vinyl pasting",
  "Outdoor safety belt worker",
  "Flyer distribution boys",
  "Board Fitting boys",
  "flyer inserts",
  "reckoning boy",
];

const MAX_WORK_MEDIA = 10;

const WORK_RADIUS_OPTIONS = ["10 km to 30 km", "No Limit"];
const STRENGTH_OPTIONS = ["Single Person", "Team"];
const ORDER_ACCEPTED_OPTIONS = ["Small", "Medium", "Bulk", "No Limit"];
const BOOKING_TIMELINE_OPTIONS = ["1 day prior", "2 days prior", "Sameday"];

const emptyForm = {
  aadhaarNumber: "",
  languages: [],
  address: "",
  city: "",
  gpsCoordinates: { lat: null, lng: null },
  skills: [],
  workRadius: "",
  strength: "",
  orderAccepted: [],
  bookingTimeline: "",
  workMedia: [],
};

const FormField = ({ label, required, error, children, hint }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium text-foreground">
      {label} {required && <span className="text-destructive">*</span>}
    </Label>
    {children}
    {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    {error && <p className="text-xs text-destructive font-medium">{error}</p>}
  </div>
);

const CheckboxGrid = ({ options, selected, onChange, columns = 2 }) => {
  const toggle = (val) => {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  };

  const gridClass = columns === 3
    ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2"
    : "grid grid-cols-1 sm:grid-cols-2 gap-2";

  return (
    <div className={gridClass}>
      {options.map((opt) => (
        <label
          key={opt}
          className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm cursor-pointer transition-all ${
            selected.includes(opt)
              ? "border-primary bg-primary/5 text-foreground"
              : "border-border text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
            className="accent-primary w-3.5 h-3.5"
          />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
};

const RadioGrid = ({ name, options, value, onChange, columns = 2 }) => {
  const gridClass = columns === 3
    ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2"
    : "grid grid-cols-1 sm:grid-cols-2 gap-2";

  return (
    <div className={gridClass}>
      {options.map((opt) => (
        <label
          key={opt}
          className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm cursor-pointer transition-all ${
            value === opt
              ? "border-primary bg-primary/5 text-foreground"
              : "border-border text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <input
            type="radio"
            name={name}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="accent-primary w-3.5 h-3.5"
          />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
};

const TagInput = ({ tags, onChange, placeholder }) => {
  const [input, setInput] = useState("");

  const addTag = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) onChange([...tags, val]);
    setInput("");
  };

  const removeTag = (tag) => onChange(tags.filter((t) => t !== tag));

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); addTag(); }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:opacity-70"><X size={12} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Type and press Enter"}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
      </div>
    </div>
  );
};

const Section = ({ icon: Icon, title, subtitle, children }) => (
  <div className="space-y-4 pb-6 border-b border-border last:border-b-0 last:pb-0">
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

const PosterBoyDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState("");

  const [accountUser, setAccountUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [othersChecked, setOthersChecked] = useState(false);
  const [otherLanguage, setOtherLanguage] = useState("");

  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setNotice("");
    setNoticeError("");
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getPosterBoyProfile();
      const u = res.data.user;
      const p = res.data.profile;
      setAccountUser(u);
      setProfile(p);

      const source = (p && p.pendingChangeData) || p || {};
      const skills = Array.isArray(source.skills) ? source.skills : [];
      const custom = skills.filter((s) => !SKILL_OPTIONS.includes(s));
      const loadedLangs = Array.isArray(source.languages) ? source.languages : [];
      const customLang = loadedLangs.find((l) => l && !LANGUAGE_OPTIONS.includes(l)) || "";
      const selectedLangs = [
        ...loadedLangs.filter((l) => LANGUAGE_OPTIONS.includes(l)),
        ...(customLang ? ["Other"] : []),
      ];

      setForm({
        aadhaarNumber: source.aadhaarNumber || "",
        languages: selectedLangs,
        address: source.address || "",
        city: source.city || "",
        gpsCoordinates: source.gpsCoordinates || { lat: null, lng: null },
        skills,
        workRadius: source.workRadius || "",
        strength: source.strength || "",
        orderAccepted: Array.isArray(source.orderAccepted) ? source.orderAccepted : [],
        bookingTimeline: source.bookingTimeline || "",
        workMedia: Array.isArray(source.workMedia) ? source.workMedia : [],
      });
      setOthersChecked(custom.length > 0);
      setOtherLanguage(customLang);
    } catch (err) {
      setLoadError(err.response?.data?.message || "Could not load your profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const validate = () => {
    const e = {};
    if (!/^\d{12}$/.test(form.aadhaarNumber)) e.aadhaarNumber = "Aadhaar number must be exactly 12 digits";
    if (form.languages.length < 1) e.languages = "Please select at least one language";
    else if (form.languages.includes("Other") && !otherLanguage.trim()) {
      e.otherLanguage = "Please specify your other language";
    }
    if (form.address.trim().length < 5) e.address = "Address must be at least 5 characters";
    else if (form.address.trim().length > 300) e.address = "Address must be at most 300 characters";
    if (form.skills.length < 1) {
      e.skills = othersChecked
        ? "Add at least one custom skill, or pick a skill from the list"
        : "Please select at least one skill";
    }
    if (!WORK_RADIUS_OPTIONS.includes(form.workRadius)) {
      e.workRadius = "Please select your work radius (10 km to 30 km, or No Limit)";
    }
    if (!STRENGTH_OPTIONS.includes(form.strength)) {
      e.strength = "Please select Single Person or Team";
    }
    if (form.orderAccepted.length < 1) {
      e.orderAccepted = "Please select at least one order size";
    }
    if (!BOOKING_TIMELINE_OPTIONS.includes(form.bookingTimeline)) {
      e.bookingTimeline = "Please select your booking timeline";
    }
    if (form.workMedia.length < 1) {
      e.workMedia = "At least one work photo or video is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    setNotice("");
    setNoticeError("");
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        aadhaarNumber: form.aadhaarNumber.trim(),
        languages: form.languages.map((l) => (l === "Other" ? otherLanguage.trim() : l)),
        address: form.address.trim(),
        city: form.city,
        gpsCoordinates: form.gpsCoordinates,
        skills: form.skills,
        workRadius: form.workRadius,
        strength: form.strength,
        orderAccepted: form.orderAccepted,
        bookingTimeline: form.bookingTimeline,
        workMedia: form.workMedia,
      };
      const res = await updatePosterBoyProfile(payload);
      setProfile(res.data.profile);
      setNotice(res.message || "Profile submitted for admin approval.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors && Array.isArray(data.errors)) {
        const map = {};
        data.errors.forEach((x) => { map[x.field] = x.message; });
        setErrors(map);
      }
      setNoticeError(data?.message || "Failed to save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Location is not supported by your browser. Please enter your address manually.");
      return;
    }
    setGeoLoading(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        if (accuracy && accuracy > 1000) {
          setGeoError("Location accuracy is low. Please try again outdoors or enable precise location.");
        }

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          if (!res.ok) throw new Error(`Reverse geocoding failed: ${res.status}`);
          const data = await res.json();
          const addr = data.address || {};

          const streetParts = [];
          if (addr.house_number && addr.road) streetParts.push(`${addr.road}, ${addr.house_number}`);
          else if (addr.road) streetParts.push(addr.road);
          else if (addr.pedestrian) streetParts.push(addr.pedestrian);
          else if (addr.footway) streetParts.push(addr.footway);

          const locality = addr.neighbourhood || addr.suburb || addr.quarter || "";
          const area = addr.village || addr.town || addr.city || addr.city_district || addr.county || "";
          const state = addr.state || "";
          const postcode = addr.postcode || "";
          const country = addr.country || "";

          const fullAddress = [...streetParts, locality, area, postcode, state, country]
            .filter(Boolean)
            .join(", ");
          const city = addr.city || addr.town || addr.village || addr.city_district || addr.county || "";

          setForm((prev) => ({
            ...prev,
            address: fullAddress || data.display_name || prev.address,
            city,
            gpsCoordinates: { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) },
          }));
          setErrors((prev) => ({ ...prev, address: "" }));
        } catch {
          setForm((prev) => ({ ...prev, gpsCoordinates: { lat, lng } }));
          setGeoError("Could not read your address automatically. It was filled with coordinates — you can edit it.");
        }
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === 1) {
          setGeoError("Location permission was denied. Please allow location access or enter your address manually.");
        } else if (err.code === 2) {
          setGeoError("Location information is unavailable. Please enter your address manually.");
        } else if (err.code === 3) {
          setGeoError("Location request timed out. Please try again or enter your address manually.");
        } else {
          setGeoError("Unable to detect your current location. Please enter your address manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleFiles = async (fileList) => {
    setUploadError("");
    setNotice("");
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const remaining = MAX_WORK_MEDIA - form.workMedia.length;
    if (remaining <= 0) {
      setUploadError(`You can add at most ${MAX_WORK_MEDIA} work images or videos.`);
      return;
    }
    if (files.length > remaining) {
      setUploadError(`Only ${remaining} slot${remaining === 1 ? "" : "s"} left — extra files were skipped.`);
    }
    const accepted = files.slice(0, remaining);

    const invalid = accepted.find((f) => !getFileCategory(f));
    if (invalid) {
      setUploadError(`"${invalid.name}" is not a supported image or video file.`);
      return;
    }

    setUploading(true);
    const batch = accepted.map((file, i) => ({ key: `${Date.now()}-${i}`, file, type: getFileCategory(file) }));
    setUploadProgress(Object.fromEntries(batch.map((b) => [b.key, 0])));

    try {
      const results = await Promise.allSettled(
        batch.map((b) =>
          uploadToCloudinary(
            b.file,
            ALLOWED_FOLDERS.posterBoyWorkMedia,
            b.type,
            (pct) => setUploadProgress((prev) => ({ ...prev, [b.key]: pct }))
          )
        )
      );

      const added = [];
      const errs = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          added.push({ url: r.value.secure_url, resourceType: batch[i].type });
        } else {
          errs.push(`${batch[i].file.name}: ${r.reason?.message || "failed"}`);
        }
      });

      if (added.length) setForm((prev) => ({ ...prev, workMedia: [...prev.workMedia, ...added] }));
      if (errs.length) setUploadError(errs.join("; "));
    } catch (err) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress({});
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeMedia = (index) => {
    setForm((prev) => ({ ...prev, workMedia: prev.workMedia.filter((_, i) => i !== index) }));
    setNotice("");
  };

  const setCustomSkills = (custom) => {
    const fixed = form.skills.filter((s) => SKILL_OPTIONS.includes(s));
    updateField("skills", [...fixed, ...custom]);
  };
  const customSkills = form.skills.filter((s) => !SKILL_OPTIONS.includes(s));
  const fixedSkills = form.skills.filter((s) => SKILL_OPTIONS.includes(s));

  const toggleOthers = (checked) => {
    setOthersChecked(checked);
    if (!checked) updateField("skills", fixedSkills);
    else setErrors((prev) => ({ ...prev, skills: "" }));
  };

  const hasPendingChange = !!(profile && profile.hasPendingChange);
  const profileStatus = profile ? profile.status : null;
  const accountRejected = accountUser && accountUser.approvalStatus === "rejected";

  const submitLabel = () => {
    if (!profile || profileStatus !== "approved") return "Submit for Approval";
    if (hasPendingChange) return "Submit Changes for Approval";
    return "Save Changes";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
        <Loader2 size={32} className="animate-spin" />
        <p className="text-sm">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Poster Boy Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fill in your details so clients can find you for flyer pasting and distribution work.
          </p>
        </div>
        <ThemeToggle />
      </div>

      {loadError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-4">
          <AlertCircle size={16} /> {loadError}
        </div>
      )}

      {accountRejected && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-4">
          <p className="font-semibold mb-1">Your account has been rejected</p>
          <p>Please contact support if you believe this is a mistake.</p>
        </div>
      )}

      {!accountRejected && !loadError && (
        <Card className="border-border/50">
          <CardContent className="p-5 sm:p-6 space-y-6">
            {/* ── Approval banners ── */}
            {hasPendingChange && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm border border-amber-500/30">
                <Clock size={16} className="shrink-0 mt-0.5" />
                <span>
                  You have changes submitted on{" "}
                  {new Date(profile.pendingChangeAt).toLocaleString()} that are waiting for admin
                  approval. The approved version is still live.
                </span>
              </div>
            )}

            {!hasPendingChange && profileStatus === "pending" && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm border border-amber-500/30">
                <Clock size={16} className="shrink-0" />
                <span>Your profile is under review by the admin.</span>
              </div>
            )}

            {!hasPendingChange && profileStatus === "rejected" && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>Your last submission was not approved. Please review your details and resubmit.</span>
              </div>
            )}

            {notice && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm border border-emerald-500/30">
                <CheckCircle size={16} className="shrink-0" /> {notice}
              </div>
            )}

            {noticeError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                <AlertCircle size={16} className="shrink-0" /> {noticeError}
              </div>
            )}

            {/* ── 1. Account details (auto) ── */}
            <Section icon={User} title="Account Details" subtitle="These are taken from your account and cannot be edited here.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Full Name">
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={accountUser?.fullName || ""} disabled className="pl-9 opacity-70" />
                  </div>
                  <p className="text-xs text-muted-foreground">From your account</p>
                </FormField>
                <FormField label="Mobile Number">
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={accountUser?.phone || accountUser?.whatsappNumber || ""}
                      disabled
                      className="pl-9 opacity-70"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">From your account</p>
                </FormField>
              </div>
            </Section>

            {/* ── 2. Identity ── */}
            <Section icon={CreditCard} title="Identity" subtitle="Your Aadhaar number is private and never shown publicly.">
              <FormField
                label="Aadhaar Number"
                required
                error={errors.aadhaarNumber}
                hint="12 digits, no spaces"
              >
                <div className="relative">
                  <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    inputMode="numeric"
                    maxLength={12}
                    placeholder="e.g. 453278912345"
                    value={form.aadhaarNumber}
                    onChange={(e) => updateField("aadhaarNumber", e.target.value.replace(/\D/g, ""))}
                    className="pl-9"
                  />
                </div>
              </FormField>
            </Section>

            {/* ── 3. Languages ── */}
            <Section icon={Languages} title="Languages" subtitle="Languages you can communicate in.">
              <FormField label="Languages" required error={errors.languages}>
                <CheckboxGrid
                  options={LANGUAGE_OPTIONS}
                  selected={form.languages}
                  onChange={(val) => updateField("languages", val)}
                  columns={3}
                />
                {form.languages.includes("Other") && (
                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor="otherLanguage" className="text-sm font-medium text-foreground">
                      Other — what language do you speak? <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="otherLanguage"
                      value={otherLanguage}
                      onChange={(e) => {
                        setOtherLanguage(e.target.value);
                        setErrors((prev) => ({ ...prev, otherLanguage: "" }));
                      }}
                      placeholder="Type your language"
                    />
                    {errors.otherLanguage && (
                      <p className="text-xs text-destructive font-medium">{errors.otherLanguage}</p>
                    )}
                  </div>
                )}
              </FormField>
            </Section>

            {/* ── 4. Address ── */}
            <Section icon={MapPin} title="Address" subtitle="Where you are based for pasting and distribution work.">
              <FormField label="Address" required error={errors.address}>
                <Textarea
                  rows={3}
                  placeholder="House/Street, Area, City, State, PIN"
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                />
              </FormField>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleGetCurrentLocation}
                  disabled={geoLoading}
                >
                  {geoLoading ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                  {geoLoading ? "Detecting..." : "Use Current Location"}
                </Button>
                {geoError && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-start gap-1.5">
                    <AlertCircle size={12} className="shrink-0 mt-0.5" /> {geoError}
                  </p>
                )}
                {form.gpsCoordinates?.lat != null && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Location captured: {form.gpsCoordinates.lat}, {form.gpsCoordinates.lng}
                  </p>
                )}
              </div>
            </Section>

            {/* ── 5. Skills ── */}
            <Section icon={Wrench} title="Skills" subtitle="Select the work you can do, and add your own if needed.">
              <FormField label="Skills" required error={errors.skills}>
                <div className="space-y-3">
                  <CheckboxGrid
                    options={SKILL_OPTIONS}
                    selected={fixedSkills}
                    onChange={(val) => updateField("skills", val)}
                    columns={2}
                  />
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border text-sm cursor-pointer transition-all border-border text-muted-foreground hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={othersChecked}
                      onChange={(e) => toggleOthers(e.target.checked)}
                      className="accent-primary w-3.5 h-3.5"
                    />
                    <span>Others (add your own skills)</span>
                  </label>
                  {othersChecked && (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <TagInput
                        tags={customSkills}
                        onChange={setCustomSkills}
                        placeholder="Type a skill and press Enter"
                      />
                    </div>
                  )}
                </div>
              </FormField>
            </Section>

            {/* ── 6. Work preferences ── */}
            <Section
              icon={MapPin}
              title="Work Preferences"
              subtitle="How far you travel, team size, order sizes you handle, and the notice you need."
            >
              <div className="space-y-5">
                <FormField label="Work Preference area radius from your address" required error={errors.workRadius}>
                  <RadioGrid
                    name="workRadius"
                    options={WORK_RADIUS_OPTIONS}
                    value={form.workRadius}
                    onChange={(val) => updateField("workRadius", val)}
                  />
                </FormField>

                <FormField label="Strength" required error={errors.strength}>
                  <RadioGrid
                    name="strength"
                    options={STRENGTH_OPTIONS}
                    value={form.strength}
                    onChange={(val) => updateField("strength", val)}
                  />
                </FormField>

                <FormField
                  label="Order Accepted"
                  required
                  error={errors.orderAccepted}
                  hint="Select all the order sizes you can handle"
                >
                  <CheckboxGrid
                    options={ORDER_ACCEPTED_OPTIONS}
                    selected={form.orderAccepted}
                    onChange={(val) => updateField("orderAccepted", val)}
                  />
                </FormField>

                <FormField label="Booking Timeline" required error={errors.bookingTimeline} hint="How much notice do you need before the work starts?">
                  <RadioGrid
                    name="bookingTimeline"
                    options={BOOKING_TIMELINE_OPTIONS}
                    value={form.bookingTimeline}
                    onChange={(val) => updateField("bookingTimeline", val)}
                  />
                </FormField>
              </div>
            </Section>

            {/* ── 7. Work media ── */}
            <Section
              icon={Camera}
              title="Work Pics & Videos"
              subtitle={`Photos or videos of your past work. Mandatory — up to ${MAX_WORK_MEDIA} files.`}
            >
              <FormField
                label="Work Pics & Videos"
                required
                error={uploadError || errors.workMedia}
                hint="JPG, PNG, WebP (max 10MB) · MP4, MOV, WebM (max 100MB)"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {form.workMedia.map((m, i) => (
                    <div
                      key={m.url + i}
                      className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted"
                    >
                      {m.resourceType === "video" ? (
                        <ProtectedVideo src={m.url} variant="thumb" className="h-full w-full" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      )}
                      {m.resourceType === "video" && (
                        <span className="absolute bottom-1 left-1 p-1 rounded bg-black/60 text-white">
                          <Video size={12} />
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        aria-label="Remove"
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {Object.entries(uploadProgress).map(([key, pct]) => (
                    <div
                      key={key}
                      className="aspect-square rounded-lg border border-dashed border-input bg-muted flex flex-col items-center justify-center gap-1 text-muted-foreground"
                    >
                      <Loader2 size={18} className="animate-spin" />
                      <span className="text-xs">{pct}%</span>
                    </div>
                  ))}

                  {form.workMedia.length + Object.keys(uploadProgress).length < MAX_WORK_MEDIA && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="aspect-square rounded-lg border-2 border-dashed border-input bg-muted hover:bg-muted/70 hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-1 text-muted-foreground"
                    >
                      {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                      <span className="text-xs px-2 text-center">
                        {uploading ? "Uploading..." : "Add photo / video"}
                      </span>
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files?.length) handleFiles(files);
                  }}
                />

                {form.workMedia.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {form.workMedia.length} of {MAX_WORK_MEDIA} files added
                  </p>
                )}
              </FormField>
            </Section>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                className="h-11 gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                onClick={handleSubmit}
                disabled={saving || uploading || accountRejected}
              >
                {saving ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving...</>
                ) : (
                  <><CheckCircle size={16} /> {submitLabel()}</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground self-center">
                {profileStatus === "approved" && !hasPendingChange
                  ? "Approved — new changes will be sent to the admin for review."
                  : "Your submission will be reviewed by the admin."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {profile && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Badge
            variant="outline"
            className={`gap-1.5 ${
              profileStatus === "approved"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                : profileStatus === "rejected"
                ? "bg-red-500/10 text-red-600 border-red-500/30"
                : "bg-amber-500/10 text-amber-600 border-amber-500/30"
            }`}
          >
            <Clock size={12} />
            Profile status: {profileStatus}
          </Badge>
        </div>
      )}
    </div>
  );
};

export default PosterBoyDashboard;
