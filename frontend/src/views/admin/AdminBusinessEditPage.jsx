"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Building2,
  Loader2,
  AlertCircle,
  Info,
  X,
  MapPin,
  Phone,
  FileText,
  Package,
  Wrench,
  Users,
  ShoppingCart,
  CreditCard,
  Globe,
  Camera,
  Languages,
  Shield,
  FileImage,
  ClipboardList,
  AlertTriangle,
  Plus,
  Trash2,
  Navigation,
} from "lucide-react";
import { getAdminBusinessById, adminUpdateBusiness, getAllTags } from "../../services/adminService";
import { TagPicker } from "../../components/shared/tag-picker";
import api from "../../services/api";
import { mergeCategories } from "../../data/vendorCategories";
import { uploadToCloudinary, ALLOWED_FOLDERS } from "../../lib/cloudinary";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

const STEPS = [
  { label: "Business Info", short: "Info", icon: Building2 },
  { label: "Contact Details", short: "Contact", icon: Phone },
  { label: "Category & Location", short: "Location", icon: MapPin },
  { label: "GST", short: "GST", icon: FileText },
  { label: "Order Limits", short: "Orders", icon: Package },
  { label: "Services", short: "Services", icon: Wrench },
  { label: "Customer Type", short: "Customers", icon: Users },
  { label: "Ordering Method", short: "Ordering", icon: ShoppingCart },
  { label: "Payment Modes", short: "Payment", icon: CreditCard },
  { label: "Social Media", short: "Social", icon: Globe },
  { label: "Verification Media", short: "Media", icon: Camera },
  { label: "Languages", short: "Languages", icon: Languages },
  { label: "Policies & Services", short: "Policies", icon: Shield },
  { label: "Sample & Formats", short: "Formats", icon: FileImage },
  { label: "Purchase Order", short: "PO", icon: ClipboardList },
  { label: "Fraud / Hotlist", short: "Fraud", icon: AlertTriangle },
];

const PAYMENT_OPTIONS = [
  "Cash", "UPI", "Bank Transfer", "Credit Card",
  "Debit Card", "Cheque", "Online Wallet", "NEFT/RTGS",
];

const LANGUAGE_OPTIONS = [
  "English", "Hindi", "Telugu", "Tamil", "Kannada",
  "Malayalam", "Marathi", "Gujarati", "Bengali", "Punjabi", "Other",
];

const FILE_FORMAT_OPTIONS = [
  "PDF", "EPS", "CDR", "Open Source", "JPEG", "TIFF", "PNG",
  "AI (Adobe Illustrator)", "PSD (Adobe Photoshop)", "Other",
];

const ADDON_SERVICE_OPTIONS = [
  "Banner Printing", "Visiting Cards", "Pamphlets", "Brochures",
  "Posters", "Stickers", "Vinyl Printing", "Sublimation",
  "Embroidery", "Screen Printing", "Digital Printing", "Offset Printing",
  "3D Printing", "Laser Cutting", "Engraving", "Other",
];

const normalizeCategoryName = (v) =>
  typeof v === "string" ? v.trim().replace(/\s+/g, " ").toLowerCase() : "";

// Print Shop is the only category limited to a single selected service.
const isPrintShopCategory = (cat, categoryName) => {
  const name = normalizeCategoryName(cat?.name || categoryName || "");
  const slug = (cat?.slug || "").trim().toLowerCase();
  return name === "print shop" || slug === "print-shop";
};

// "Other" free-text support: the stored list keeps "Other" plus the typed
// value so the selection round-trips through save → edit → save.
const otherCustomOf = (list, options) =>
  (Array.isArray(list) ? list : [])
    .filter((v) => typeof v === "string" && v !== "Other" && !options.includes(v))
    .join(", ");

const normalizeOtherList = (list, options) => {
  const arr = Array.isArray(list) ? list.filter((v) => typeof v === "string" && v.trim()) : [];
  const customs = arr.filter((v) => v !== "Other" && !options.includes(v));
  const presets = arr.filter((v) => options.includes(v) && v !== "Other");
  if (!arr.includes("Other") && customs.length === 0) return presets;
  const custom = customs.join(", ");
  return [...presets, "Other", ...(custom ? [custom] : [])];
};

const setOtherCustomValue = (list, options, text) => {
  const arr = Array.isArray(list) ? list : [];
  const presets = arr.filter((v) => options.includes(v));
  // Stored as-is (no trimming) so spaces work while typing.
  const withOther = presets.includes("Other") ? presets : [...presets, "Other"];
  return text ? [...withOther, text] : presets;
};

const toggleOtherList = (list, options, nextSelected) => {
  const arr = Array.isArray(list) ? list : [];
  const customs = arr.filter((v) => typeof v === "string" && v !== "Other" && !options.includes(v));
  return nextSelected.includes("Other") ? [...nextSelected, ...customs] : nextSelected;
};

const emptyForm = {
  name: "",
  description: "",
  establishedYear: "",
  workingHours: {
    monday:    { open: true,  openingTime: "09:00", closingTime: "19:00" },
    tuesday:   { open: true,  openingTime: "09:00", closingTime: "19:00" },
    wednesday: { open: true,  openingTime: "09:00", closingTime: "19:00" },
    thursday:  { open: true,  openingTime: "09:00", closingTime: "19:00" },
    friday:    { open: true,  openingTime: "09:00", closingTime: "19:00" },
    saturday:  { open: true,  openingTime: "10:00", closingTime: "17:00" },
    sunday:    { open: false, openingTime: "",      closingTime: "" },
  },
  contactName: "",
  phone: "",
  whatsapp: "",
  contactEmail: "",
  website: "",
  category: "",
  categoryId: null,
  serviceIds: [],
  // Admin-only extra categories: [{ categoryId, serviceIds }] (ids).
  additionalCategories: [],
  tags: [],
  address: "",
  city: "",
  gpsCoordinates: { lat: "", lng: "" },
  googleBusinessProfileLink: "",
  gstAvailable: false,
  gstNumber: "",
  orderLimits: "no_limit",
  serviceType: "print_only",
  customerType: "both",
  orderingMethod: "both",
  paymentModes: [],
  socialMedia: { facebook: "", instagram: "", youtube: "", linkedin: "", twitter: "" },
  verificationMedia: {
    machineryWorkingVideo: "", completeOutletVideo: "",
    outdoorStoreImage: "", indoorStoreImage: "", thumbnailImages: [],
  },
  languages: [],
  returnReplacementPolicy: "",
  inHouseDesignerAvailable: false,
  customerLocationVisitAvailable: false,
  addonServices: [],
  sampleDisplayAvailable: false,
  preferredFileFormats: [],
  acceptsPurchaseOrder: false,
  fraudReport: [{ contactName: "", designation: "", contactNumber: "" }],
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

const RadioCards = ({ options, value, onChange }) => (
  <div className="space-y-2">
    {options.map((opt) => (
      <label
        key={opt.value}
        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
          value === opt.value
            ? "border-primary bg-primary/5"
            : "border-border hover:border-border/80 hover:bg-muted/50"
        }`}
      >
        <input
          type="radio"
          name={opt.name || "radio"}
          value={opt.value}
          checked={value === opt.value}
          onChange={(e) => onChange(e.target.value)}
          className="accent-primary w-4 h-4"
        />
        <div>
          <p className="text-sm font-medium text-foreground">{opt.label}</p>
          <p className="text-xs text-muted-foreground">{opt.desc}</p>
        </div>
      </label>
    ))}
  </div>
);

const CheckboxGrid = ({ options, selected, onChange, columns = 2 }) => {
  const toggle = (val) => {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  };

  const gridClassName =
    columns === 3
      ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2"
      : "grid grid-cols-1 sm:grid-cols-2 gap-2";

  return (
    <div className={gridClassName}>
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

const AdminBusinessEditPage = () => {
  const router = useRouter();
  const { id } = useParams();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  // The 9 core categories are hardcoded so they show even if the API/DB is down.
  const [categories, setCategories] = useState(() => mergeCategories([]));
  const [uploading, setUploading] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});
  const [customServices, setCustomServices] = useState([]);
  const [newCustomService, setNewCustomService] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  // Existing tags across businesses for the tag picker suggestions.
  const [tagSuggestions, setTagSuggestions] = useState([]);

  const machineryVideoRef = useRef(null);
  const outletVideoRef = useRef(null);
  const outdoorImageRef = useRef(null);
  const indoorImageRef = useRef(null);
  const slideshowImagesRef = useRef(null);
  const stepsScrollRef = useRef(null);

  useEffect(() => {
    api.get("/user/public/categories").then((res) => {
      // Staffing categories (Poster Boy) are never a business category.
      setCategories(
        mergeCategories(res.data.data.categories || []).filter((c) => c.kind !== "staffing")
      );
    }).catch(() => {});
    getAllTags()
      .then((res) => setTagSuggestions(res?.data?.tags || []))
      .catch(() => setTagSuggestions([]));
  }, []);

  // Business saved without a categoryId (static category): resolve it by name
  // once categories are available so the sub-category list shows on edit.
  useEffect(() => {
    if (form.categoryId || !form.category) return;
    const match = categories.find(
      (c) => (c.name || "").trim().toLowerCase() === form.category.trim().toLowerCase()
    );
    if (match) updateField("categoryId", match._id);
  }, [categories, form.categoryId, form.category]);

  useEffect(() => {
    if (!id) return;
    const fetchBusiness = async () => {
      try {
        const res = await getAdminBusinessById(id);
        const b = res.data.business;
        setForm({
          name: b.name || "", description: b.description || "",
          establishedYear: b.establishedYear || "", workingHours: (() => {
            if (b.workingHours && typeof b.workingHours === "object" && !Array.isArray(b.workingHours) && b.workingHours.monday) {
              return {
                monday:    { open: b.workingHours.monday?.open ?? true,  openingTime: b.workingHours.monday?.openingTime ?? "", closingTime: b.workingHours.monday?.closingTime ?? "" },
                tuesday:   { open: b.workingHours.tuesday?.open ?? true,  openingTime: b.workingHours.tuesday?.openingTime ?? "", closingTime: b.workingHours.tuesday?.closingTime ?? "" },
                wednesday: { open: b.workingHours.wednesday?.open ?? true,  openingTime: b.workingHours.wednesday?.openingTime ?? "", closingTime: b.workingHours.wednesday?.closingTime ?? "" },
                thursday:  { open: b.workingHours.thursday?.open ?? true,  openingTime: b.workingHours.thursday?.openingTime ?? "", closingTime: b.workingHours.thursday?.closingTime ?? "" },
                friday:    { open: b.workingHours.friday?.open ?? true,  openingTime: b.workingHours.friday?.openingTime ?? "", closingTime: b.workingHours.friday?.closingTime ?? "" },
                saturday:  { open: b.workingHours.saturday?.open ?? true,  openingTime: b.workingHours.saturday?.openingTime ?? "", closingTime: b.workingHours.saturday?.closingTime ?? "" },
                sunday:    { open: b.workingHours.sunday?.open ?? false, openingTime: b.workingHours.sunday?.openingTime ?? "", closingTime: b.workingHours.sunday?.closingTime ?? "" },
              };
            }
            return emptyForm.workingHours;
          })(),
          contactName: b.contactName || "", phone: b.phone || "", whatsapp: b.whatsapp || "",
          contactEmail: b.contactEmail || "", website: b.website || "",
          category: b.category || "", categoryId: b.categoryId?._id || b.categoryId || null,
          serviceIds: b.serviceIds ? b.serviceIds.map((s) => s._id || s) : [],
          // Populate gives { categoryId: {_id,...}, serviceIds: [{_id,...}] } —
          // normalize to plain ids for the form.
          additionalCategories: (Array.isArray(b.additionalCategories) ? b.additionalCategories : [])
            .map((entry) => ({
              categoryId: entry?.categoryId?._id || entry?.categoryId || null,
              serviceIds: (Array.isArray(entry?.serviceIds) ? entry.serviceIds : []).map((s) => s?._id || s),
              tags: Array.isArray(entry?.tags) ? entry.tags.filter((t) => typeof t === "string" && t.trim()) : [],
            }))
            .filter((entry) => entry.categoryId),
          tags: b.tags || [], address: b.address || "", city: b.city || "",
          gpsCoordinates: b.gpsCoordinates || { lat: "", lng: "" },
          googleBusinessProfileLink: b.googleBusinessProfileLink || "",
          gstAvailable: b.gstAvailable || false, gstNumber: b.gstNumber || "",
          orderLimits: b.orderLimits || "no_limit", serviceType: b.serviceType || "print_only",
          customerType: b.customerType || "both", orderingMethod: b.orderingMethod || "both",
          paymentModes: b.paymentModes || [],
          socialMedia: b.socialMedia || emptyForm.socialMedia,
          verificationMedia: b.verificationMedia || emptyForm.verificationMedia,
          languages: normalizeOtherList(b.languages, LANGUAGE_OPTIONS), returnReplacementPolicy: b.returnReplacementPolicy || "",
          inHouseDesignerAvailable: b.inHouseDesignerAvailable || false,
          customerLocationVisitAvailable: b.customerLocationVisitAvailable || false,
          addonServices: normalizeOtherList(b.addonServices, ADDON_SERVICE_OPTIONS), sampleDisplayAvailable: b.sampleDisplayAvailable || false,
          preferredFileFormats: normalizeOtherList(b.preferredFileFormats, FILE_FORMAT_OPTIONS),
          acceptsPurchaseOrder: b.acceptsPurchaseOrder || false,
          fraudReport: Array.isArray(b.fraudReport)
            ? b.fraudReport
            : b.fraudReport && b.fraudReport.contactName
              ? [b.fraudReport]
              : emptyForm.fraudReport,
        });
      } catch (err) {
        setSubmitError(err.response?.data?.message || "Failed to load business data");
      } finally {
        setLoading(false);
      }
    };
    fetchBusiness();
  }, [id]);

  useEffect(() => {
    const handler = (e) => {
      if (hasChanges) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  useEffect(() => {
    if (!stepsScrollRef.current) return;
    const container = stepsScrollRef.current;
    const activeEl = container.querySelector(`[data-step="${step}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [step]);

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    setSaveSuccess(false);
  }, []);

  const updateNested = useCallback((parent, field, value) => {
    setForm((prev) => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));
    setHasChanges(true);
    setSaveSuccess(false);
  }, []);

  // ─── Admin-only multi-category helpers ───
  const addAdditionalCategory = (categoryId) => {
    if (!categoryId) return;
    if (form.categoryId === categoryId) return; // primary already covers it
    if (form.additionalCategories.some((e) => e.categoryId === categoryId)) return;
    updateField("additionalCategories", [...form.additionalCategories, { categoryId, serviceIds: [], tags: [] }]);
  };

  const removeAdditionalCategory = (categoryId) => {
    updateField("additionalCategories", form.additionalCategories.filter((e) => e.categoryId !== categoryId));
  };

  const updateAdditionalTags = (categoryId, tags) => {
    updateField(
      "additionalCategories",
      form.additionalCategories.map((entry) =>
        entry.categoryId === categoryId ? { ...entry, tags } : entry
      )
    );
  };

  const toggleAdditionalService = (categoryId, serviceId) => {
    updateField(
      "additionalCategories",
      form.additionalCategories.map((entry) => {
        if (entry.categoryId !== categoryId) return entry;
        const current = entry.serviceIds || [];
        return {
          ...entry,
          serviceIds: current.includes(serviceId)
            ? current.filter((id) => id !== serviceId)
            : [...current, serviceId],
        };
      })
    );
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) { setGeoError("Geolocation is not supported by your browser."); return; }
    setGeoLoading(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        updateNested("gpsCoordinates", "lat", lat.toFixed(6));
        updateNested("gpsCoordinates", "lng", lng.toFixed(6));

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
          updateField("address", fullAddress || data.display_name || "");

          const city = addr.city || addr.town || addr.village || addr.city_district || addr.county || "";
          updateField("city", city);
        } catch (e) {
          console.warn("Reverse geocoding failed:", e);
        }
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        console.error("Geolocation error:", err.code, err.message);
        if (err.code === 1) {
          setGeoError("Location permission was denied. Please allow location access or enter your location manually.");
        } else if (err.code === 2) {
          setGeoError("Location information is unavailable. Please enter your location manually.");
        } else if (err.code === 3) {
          setGeoError("Location request timed out. Please try again or enter your location manually.");
        } else {
          setGeoError("Unable to detect your current location. Please enter your location manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleFileUpload = useCallback(async (file, fieldKey, folder, resourceType) => {
    setUploadErrors((prev) => ({ ...prev, [fieldKey]: "" }));
    setUploading((prev) => ({ ...prev, [fieldKey]: true }));

    try {
      const result = await uploadToCloudinary(file, folder, resourceType, (percent) => {
        setUploading((prev) => ({ ...prev, [fieldKey]: `${percent}%` }));
      });
      updateNested("verificationMedia", fieldKey, result.secure_url);
    } catch (err) {
      setUploadErrors((prev) => ({ ...prev, [fieldKey]: err.message || "Upload failed" }));
    } finally {
      setUploading((prev) => ({ ...prev, [fieldKey]: false }));
    }
  }, [updateNested]);

  const handleMultiImageUpload = useCallback(async (files) => {
    setUploadErrors((prev) => ({ ...prev, thumbnailImages: "" }));
    setUploading((prev) => ({ ...prev, thumbnailImages: "0%" }));

    try {
      const uploads = Array.from(files).map((file) =>
        uploadToCloudinary(file, ALLOWED_FOLDERS.slideshowImage, "image", () => {})
      );
      const results = await Promise.allSettled(uploads);
      const newUrls = [];
      const errs = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled") newUrls.push(r.value.secure_url);
        else errs.push(`Image ${i + 1}: ${r.reason?.message || "failed"}`);
      });

      if (errs.length > 0) {
        setUploadErrors((prev) => ({ ...prev, thumbnailImages: errs.join("; ") }));
      }
      if (newUrls.length > 0) {
        const existing = form.verificationMedia.thumbnailImages || [];
        updateNested("verificationMedia", "thumbnailImages", [...existing, ...newUrls]);
      }
    } catch (err) {
      setUploadErrors((prev) => ({ ...prev, thumbnailImages: err.message || "Upload failed" }));
    } finally {
      setUploading((prev) => ({ ...prev, thumbnailImages: false }));
    }
  }, [form.verificationMedia.thumbnailImages, updateNested]);

  const validateStep = (stepIndex) => {
    const errs = {};
    if (stepIndex === 0 && !form.name.trim()) errs.name = "Business name is required";
    if (stepIndex === 3 && form.gstAvailable && form.gstNumber) {
      const gst = form.gstNumber.trim();
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst)) {
        errs.gstNumber = "Invalid GST number format (e.g. 22AAAAA0000A1Z5)";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => { if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const handleSave = async () => {
    setSaving(true);
    setSubmitError("");
    setSaveSuccess(false);
    try {
      const payload = {
        ...form,
        establishedYear: form.establishedYear ? Number(form.establishedYear) : null,
        gpsCoordinates: {
          lat: form.gpsCoordinates.lat ? Number(form.gpsCoordinates.lat) : null,
          lng: form.gpsCoordinates.lng ? Number(form.gpsCoordinates.lng) : null,
        },
      };
      await adminUpdateBusiness(id, payload);
      setSaveSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
        <Loader2 size={32} className="animate-spin" />
        <span className="text-sm">Loading business data...</span>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-3 pb-4 border-b">
              <Building2 size={20} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Business Information</h3>
                <p className="text-sm text-muted-foreground">Basic details about the printing business</p>
              </div>
            </div>
            <FormField label="Business Name" required error={errors.name}>
              <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. ABC Digital Printing" />
            </FormField>
            <FormField label="Business Description">
              <Textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Describe the business, services, and specialties..." rows={4} />
            </FormField>
            <FormField label="Established Year">
              <Input type="number" value={form.establishedYear} onChange={(e) => updateField("establishedYear", e.target.value)} placeholder="e.g. 2015" min="1900" max={new Date().getFullYear()} />
            </FormField>
            <FormField label="Working Hours">
              <div className="space-y-2">
                {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => {
                  const dayData = form.workingHours[day];
                  const label = day.charAt(0).toUpperCase() + day.slice(1);
                  return (
                    <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border border-border bg-card">
                      <div className="flex items-center gap-3 sm:w-[140px] shrink-0">
                        <Switch
                          checked={dayData.open}
                          onCheckedChange={(checked) => {
                            const updated = { ...form.workingHours, [day]: { ...dayData, open: checked, openingTime: checked ? dayData.openingTime : "", closingTime: checked ? dayData.closingTime : "" } };
                            updateField("workingHours", updated);
                          }}
                        />
                        <span className="text-sm font-medium text-foreground">{label}</span>
                      </div>
                      {dayData.open ? (
                        <div className="flex items-center gap-2 sm:gap-3 flex-1">
                          <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
                            <span className="text-xs text-muted-foreground hidden sm:inline">From</span>
                            <input
                              type="time"
                              value={dayData.openingTime}
                              onChange={(e) => {
                                const updated = { ...form.workingHours, [day]: { ...dayData, openingTime: e.target.value } };
                                updateField("workingHours", updated);
                              }}
                              className="flex-1 sm:w-[130px] h-9 rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                          <span className="text-muted-foreground text-sm">—</span>
                          <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
                            <span className="text-xs text-muted-foreground hidden sm:inline">To</span>
                            <input
                              type="time"
                              value={dayData.closingTime}
                              onChange={(e) => {
                                const updated = { ...form.workingHours, [day]: { ...dayData, closingTime: e.target.value } };
                                updateField("workingHours", updated);
                              }}
                              className="flex-1 sm:w-[130px] h-9 rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Closed</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </FormField>
          </div>
        );

      case 1:
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-3 pb-4 border-b">
              <Phone size={20} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Contact Details</h3>
                <p className="text-sm text-muted-foreground">How customers can reach this business</p>
              </div>
            </div>
            <FormField label="Contact Name">
              <Input value={form.contactName} onChange={(e) => updateField("contactName", e.target.value)} placeholder="e.g. Ramesh Kumar" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Phone">
                <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="e.g. +91 98765 43210" />
              </FormField>
              <FormField label="WhatsApp">
                <Input value={form.whatsapp} onChange={(e) => updateField("whatsapp", e.target.value)} placeholder="e.g. +91 98765 43210" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Email">
                <Input type="email" value={form.contactEmail} onChange={(e) => updateField("contactEmail", e.target.value)} placeholder="e.g. contact@abcprinting.com" />
              </FormField>
              <FormField label="Website">
                <Input value={form.website} onChange={(e) => updateField("website", e.target.value)} placeholder="e.g. https://abcprinting.com" />
              </FormField>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-3 pb-4 border-b">
              <MapPin size={20} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Category & Location</h3>
                <p className="text-sm text-muted-foreground">What they do and where they are</p>
              </div>
            </div>
            <FormField label="Business Category">
              <Select value={form.categoryId || ""} onValueChange={(val) => {
                const cat = categories.find((c) => c._id === val);
                updateField("categoryId", val || null);
                updateField("category", cat ? cat.name : "");
                updateField("serviceIds", []);
                // The new primary must not also live in the additional list.
                if (val) {
                  updateField("additionalCategories", form.additionalCategories.filter((e) => e.categoryId !== val));
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>
                      <div className="flex items-center gap-2">
                        {cat.image && (
                          cat.image.trim().startsWith('<') ? (
                            <span className="inline-block h-4 w-4 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: cat.image }} />
                          ) : (
                            <img src={cat.image} alt="" className="h-4 w-4 object-contain" />
                          )
                        )}
                        <span>{cat.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            {form.categoryId && (() => {
              const selectedCat = categories.find((c) => c._id === form.categoryId);
              const services = selectedCat?.services || [];
              const singleSelect = isPrintShopCategory(selectedCat, form.category);
              return (
                <FormField
                  label="Services"
                  hint={services.length > 0 ? (singleSelect ? "Print Shop allows only one service" : "Select one or more services") : undefined}
                >
                  {services.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {services.map((service) => {
                        const serviceId = service.id || service._id;
                        const isChecked = (form.serviceIds || []).includes(serviceId);
                      return (
                        <label
                          key={serviceId}
                          className={`flex items-center gap-2 rounded-md border p-2.5 cursor-pointer transition-colors ${
                            isChecked ? "border-primary bg-primary/5" : "border-input hover:bg-muted/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={isChecked}
                            onChange={() => {
                              const current = form.serviceIds || [];
                              const updated = singleSelect
                                ? isChecked
                                  ? []
                                  : [serviceId]
                                : isChecked
                                ? current.filter((id) => id !== serviceId)
                                : [...current, serviceId];
                              updateField("serviceIds", updated);
                            }}
                          />
                          <span className="text-sm">{service.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No services available for this category.</p>
                  )}
                </FormField>
              );
            })()}
            {/* Admin-only: list this business under more categories too. */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-sm font-medium text-foreground">Additional Categories</Label>
                <Select value="" onValueChange={addAdditionalCategory}>
                  <SelectTrigger className="h-9 w-full sm:w-[240px]">
                    <SelectValue placeholder="Add a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((cat) => cat._id !== form.categoryId && !form.additionalCategories.some((e) => e.categoryId === cat._id))
                      .map((cat) => (
                        <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {form.additionalCategories.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  None yet — the business is listed only under its primary category.
                </p>
              ) : (
                form.additionalCategories.map((entry) => {
                  const cat = categories.find((c) => c._id === entry.categoryId);
                  const services = cat?.services || [];
                  return (
                    <div key={entry.categoryId} className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">{cat?.name || "Unknown category"}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Remove category"
                          onClick={() => removeAdditionalCategory(entry.categoryId)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      {services.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {services.map((service) => {
                            const serviceId = service.id || service._id;
                            const isChecked = (entry.serviceIds || []).includes(serviceId);
                            return (
                              <label
                                key={serviceId}
                                className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer transition-colors ${
                                  isChecked ? "border-primary bg-primary/5" : "border-input hover:bg-muted/50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300"
                                  checked={isChecked}
                                  onChange={() => toggleAdditionalService(entry.categoryId, serviceId)}
                                />
                                <span className="text-sm">{service.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No services available for this category.</p>
                      )}
                      <div className="pt-1">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">
                          Tags for {cat?.name || "this category"}
                        </p>
                        <TagPicker
                          tags={entry.tags || []}
                          onChange={(val) => updateAdditionalTags(entry.categoryId, val)}
                          suggestions={tagSuggestions}
                          placeholder={`e.g. ${(services[0]?.name || "banner").toLowerCase()}...`}
                          hint="Pick an existing tag or type a new one and press Enter."
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {(() => {
              const primaryCat = categories.find((c) => c._id === form.categoryId);
              const primaryName = primaryCat?.name || form.category || "primary category";
              return (
                <FormField label={`Tags — ${primaryName}`} hint="Pick an existing tag or type a new one and press Enter">
                  <TagPicker tags={form.tags} onChange={(val) => updateField("tags", val)} suggestions={tagSuggestions} placeholder="e.g. banner, visiting card, brochure" />
                </FormField>
              );
            })()}
            <FormField label="Address">
              <Input value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder="e.g. 123 Main Street, Andheri West" />
            </FormField>
            <FormField label="City">
              <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} placeholder="e.g. Mumbai" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Latitude">
                <Input type="number" step="any" value={form.gpsCoordinates.lat} onChange={(e) => updateNested("gpsCoordinates", "lat", e.target.value)} placeholder="e.g. 19.0760" />
              </FormField>
              <FormField label="Longitude">
                <Input type="number" step="any" value={form.gpsCoordinates.lng} onChange={(e) => updateNested("gpsCoordinates", "lng", e.target.value)} placeholder="e.g. 72.8777" />
              </FormField>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleGetCurrentLocation} disabled={geoLoading} className="gap-2">
              {geoLoading ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
              {geoLoading ? "Detecting location..." : "Use My Current Location"}
            </Button>
            {geoError && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{geoError}</span>
              </div>
            )}
            <FormField label="Google Business Profile Link" hint="Internal use only - not publicly displayed">
              <Input value={form.googleBusinessProfileLink} onChange={(e) => updateField("googleBusinessProfileLink", e.target.value)} placeholder="https://goo.gl/maps/..." />
            </FormField>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-3 pb-4 border-b">
              <FileText size={20} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-foreground">GST Information</h3>
                <p className="text-sm text-muted-foreground">Tax registration details</p>
              </div>
            </div>
            <FormField label="GST Available?">
              <div className="flex items-center gap-3">
                <Switch checked={form.gstAvailable} onCheckedChange={(checked) => {
                  updateField("gstAvailable", checked);
                  if (!checked) updateField("gstNumber", "");
                }} />
                <span className="text-sm text-muted-foreground">{form.gstAvailable ? "Yes, has GST registration" : "No GST registration"}</span>
              </div>
            </FormField>
            {form.gstAvailable && (
              <FormField label="GST Number" required error={errors.gstNumber} hint="Format: 22AAAAA0000A1Z5">
                <Input value={form.gstNumber} onChange={(e) => updateField("gstNumber", e.target.value.toUpperCase())} placeholder="e.g. 22AAAAA0000A1Z5" maxLength={15} />
              </FormField>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-3 pb-4 border-b">
              <Package size={20} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Order Limits</h3>
                <p className="text-sm text-muted-foreground">What order quantities do they accept?</p>
              </div>
            </div>
            <FormField label="Order Quantity Preference">
              <RadioCards
                options={[
                  { value: "single", label: "Single Qty", desc: "Individual piece orders" },
                  { value: "minimum", label: "Minimum Qty", desc: "Minimum order quantity required" },
                  { value: "bulk", label: "Bulk Orders", desc: "Large quantity orders only" },
                  { value: "no_limit", label: "No Limit", desc: "Accept any order size" },
                ]}
                value={form.orderLimits}
                onChange={(val) => updateField("orderLimits", val)}
              />
            </FormField>
          </div>
        );

      case 5:
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-3 pb-4 border-b">
              <Wrench size={20} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Services / Offering</h3>
                <p className="text-sm text-muted-foreground">What level of service do they provide?</p>
              </div>
            </div>
            <FormField label="Service Type">
              <RadioCards
                options={[
                  { value: "print_only", label: "Print Only", desc: "Only handle printing" },
                  { value: "full_with_design", label: "Full-fledged with Design", desc: "Design + Print end-to-end" },
                  { value: "full_without_design", label: "Full-fledged without Design", desc: "Complete service except design" },
                ]}
                value={form.serviceType}
                onChange={(val) => updateField("serviceType", val)}
              />
            </FormField>
          </div>
        );

      case 6:
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-3 pb-4 border-b">
              <Users size={20} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Customer Type</h3>
                <p className="text-sm text-muted-foreground">Who do they primarily serve?</p>
              </div>
            </div>
            <FormField label="Target Customers">
              <RadioCards
                options={[
                  { value: "b2b", label: "B2B", desc: "Business to Business - corporate clients" },
                  { value: "b2c", label: "B2C", desc: "Business to Consumer - individual customers" },
                  { value: "both", label: "B2B and B2C", desc: "Serve both businesses and individuals" },
                ]}
                value={form.customerType}
                onChange={(val) => updateField("customerType", val)}
              />
            </FormField>
          </div>
        );

      case 7:
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-3 pb-4 border-b">
              <ShoppingCart size={20} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Ordering Method</h3>
                <p className="text-sm text-muted-foreground">How can customers place orders?</p>
              </div>
            </div>
            <FormField label="Order Acceptance Method">
              <RadioCards
                options={[
                  { value: "on_call", label: "On Call", desc: "Orders via phone call or WhatsApp" },
                  { value: "shop_visit", label: "Shop Visit", desc: "Customers visit the shop" },
                  { value: "both", label: "On Call and Shop Visit", desc: "Accept orders both ways" },
                ]}
                value={form.orderingMethod}
                onChange={(val) => updateField("orderingMethod", val)}
              />
            </FormField>
          </div>
        );

      case 8:
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-3 pb-4 border-b">
              <CreditCard size={20} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Payment Modes</h3>
                <p className="text-sm text-muted-foreground">What payment methods do they accept?</p>
              </div>
            </div>
            <FormField label="Accepted Payment Methods">
              <CheckboxGrid options={PAYMENT_OPTIONS} selected={form.paymentModes} onChange={(val) => updateField("paymentModes", val)} columns={2} />
            </FormField>
          </div>
        );

      case 9:
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-3 pb-4 border-b">
              <Globe size={20} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Social Media</h3>
                <p className="text-sm text-muted-foreground">Online presence (optional)</p>
              </div>
            </div>
            <FormField label="Facebook">
              <Input value={form.socialMedia.facebook} onChange={(e) => updateNested("socialMedia", "facebook", e.target.value)} placeholder="https://facebook.com/yourpage" />
            </FormField>
            <FormField label="Instagram">
              <Input value={form.socialMedia.instagram} onChange={(e) => updateNested("socialMedia", "instagram", e.target.value)} placeholder="https://instagram.com/yourpage" />
            </FormField>
            <FormField label="YouTube">
              <Input value={form.socialMedia.youtube} onChange={(e) => updateNested("socialMedia", "youtube", e.target.value)} placeholder="https://youtube.com/yourchannel" />
            </FormField>
            <FormField label="LinkedIn">
              <Input value={form.socialMedia.linkedin} onChange={(e) => updateNested("socialMedia", "linkedin", e.target.value)} placeholder="https://linkedin.com/company/yours" />
            </FormField>
            <FormField label="Twitter / X">
              <Input value={form.socialMedia.twitter} onChange={(e) => updateNested("socialMedia", "twitter", e.target.value)} placeholder="https://twitter.com/yourhandle" />
            </FormField>
          </div>
        );

      case 10:
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-3 pb-4 border-b">
              <Camera size={20} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Verification Media</h3>
                <p className="text-sm text-muted-foreground">Upload proofs or paste URLs</p>
              </div>
            </div>

            <FormField label="Machinery Working Video" error={uploadErrors.machineryWorkingVideo}>
              {form.verificationMedia.machineryWorkingVideo ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Check size={14} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-emerald-600 truncate flex-1">
                    {form.verificationMedia.machineryWorkingVideo.split("/").pop()}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateNested("verificationMedia", "machineryWorkingVideo", "")}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div
                    onClick={() => machineryVideoRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors"
                  >
                    {uploading.machineryWorkingVideo ? (
                      <Loader2 size={20} className="animate-spin text-primary" />
                    ) : (
                      <Camera size={20} className="text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {uploading.machineryWorkingVideo ? `Uploading... ${uploading.machineryWorkingVideo}` : "Click to select video"}
                    </span>
                    <span className="text-xs text-muted-foreground">MP4, MOV, WebM (max 100MB)</span>
                  </div>
                  <input
                    ref={machineryVideoRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "machineryWorkingVideo", ALLOWED_FOLDERS.machineryVideo, "video");
                      e.target.value = "";
                    }}
                  />
                </>
              )}
            </FormField>

            <FormField label="Complete Outlet Video" error={uploadErrors.completeOutletVideo}>
              {form.verificationMedia.completeOutletVideo ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Check size={14} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-emerald-600 truncate flex-1">
                    {form.verificationMedia.completeOutletVideo.split("/").pop()}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateNested("verificationMedia", "completeOutletVideo", "")}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div
                    onClick={() => outletVideoRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors"
                  >
                    {uploading.completeOutletVideo ? (
                      <Loader2 size={20} className="animate-spin text-primary" />
                    ) : (
                      <Camera size={20} className="text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {uploading.completeOutletVideo ? `Uploading... ${uploading.completeOutletVideo}` : "Click to select video"}
                    </span>
                    <span className="text-xs text-muted-foreground">MP4, MOV, WebM (max 100MB)</span>
                  </div>
                  <input
                    ref={outletVideoRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "completeOutletVideo", ALLOWED_FOLDERS.outletVideo, "video");
                      e.target.value = "";
                    }}
                  />
                </>
              )}
            </FormField>

            <FormField label="Outdoor Store Image" error={uploadErrors.outdoorStoreImage}>
              {form.verificationMedia.outdoorStoreImage ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Check size={14} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-emerald-600 truncate flex-1">
                    {form.verificationMedia.outdoorStoreImage.split("/").pop()}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateNested("verificationMedia", "outdoorStoreImage", "")}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div
                    onClick={() => outdoorImageRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors"
                  >
                    {uploading.outdoorStoreImage ? (
                      <Loader2 size={20} className="animate-spin text-primary" />
                    ) : (
                      <FileImage size={20} className="text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {uploading.outdoorStoreImage ? `Uploading... ${uploading.outdoorStoreImage}` : "Click to select image"}
                    </span>
                    <span className="text-xs text-muted-foreground">JPG, PNG, WebP (max 10MB)</span>
                  </div>
                  <input
                    ref={outdoorImageRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "outdoorStoreImage", ALLOWED_FOLDERS.outdoorImage, "image");
                      e.target.value = "";
                    }}
                  />
                </>
              )}
            </FormField>

            <FormField label="Indoor Store Image" error={uploadErrors.indoorStoreImage}>
              {form.verificationMedia.indoorStoreImage ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Check size={14} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-emerald-600 truncate flex-1">
                    {form.verificationMedia.indoorStoreImage.split("/").pop()}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateNested("verificationMedia", "indoorStoreImage", "")}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div
                    onClick={() => indoorImageRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors"
                  >
                    {uploading.indoorStoreImage ? (
                      <Loader2 size={20} className="animate-spin text-primary" />
                    ) : (
                      <FileImage size={20} className="text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {uploading.indoorStoreImage ? `Uploading... ${uploading.indoorStoreImage}` : "Click to select image"}
                    </span>
                    <span className="text-xs text-muted-foreground">JPG, PNG, WebP (max 10MB)</span>
                  </div>
                  <input
                    ref={indoorImageRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "indoorStoreImage", ALLOWED_FOLDERS.indoorImage, "image");
                      e.target.value = "";
                    }}
                  />
                </>
              )}
            </FormField>

            <FormField label="Thumbnail / Slideshow Images" hint="Select multiple images" error={uploadErrors.thumbnailImages}>
              {(form.verificationMedia.thumbnailImages || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.verificationMedia.thumbnailImages.map((url, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                      <span className="text-emerald-600 truncate max-w-[120px]">Image {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = form.verificationMedia.thumbnailImages.filter((_, idx) => idx !== i);
                          updateNested("verificationMedia", "thumbnailImages", updated);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div
                onClick={() => slideshowImagesRef.current?.click()}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors"
              >
                {uploading.thumbnailImages ? (
                  <Loader2 size={20} className="animate-spin text-primary" />
                ) : (
                  <FileImage size={20} className="text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  {uploading.thumbnailImages ? "Uploading..." : "Click to select images (multiple)"}
                </span>
                <span className="text-xs text-muted-foreground">JPG, PNG, WebP (max 10MB each)</span>
              </div>
              <input
                ref={slideshowImagesRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files?.length) handleMultiImageUpload(files);
                  e.target.value = "";
                }}
              />
            </FormField>
          </div>
        );

      case 11:
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-3 pb-4 border-b">
              <Languages size={20} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Languages</h3>
                <p className="text-sm text-muted-foreground">Languages this business supports</p>
              </div>
            </div>
            <FormField label="Communication Languages">
              <CheckboxGrid
                options={LANGUAGE_OPTIONS}
                selected={form.languages}
                onChange={(val) => updateField("languages", toggleOtherList(form.languages, LANGUAGE_OPTIONS, val))}
                columns={3}
              />
              {form.languages.includes("Other") && (
                <div className="mt-2">
                  <Input
                    value={otherCustomOf(form.languages, LANGUAGE_OPTIONS)}
                    onChange={(e) => updateField("languages", setOtherCustomValue(form.languages, LANGUAGE_OPTIONS, e.target.value))}
                    placeholder="Enter your language"
                  />
                </div>
              )}
            </FormField>
          </div>
        );

      case 12:
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-3 pb-4 border-b">
              <Shield size={20} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Policies & Additional Services</h3>
                <p className="text-sm text-muted-foreground">Extra information about the business</p>
              </div>
            </div>
            <FormField label="Return / Replacement Policy">
              <Textarea value={form.returnReplacementPolicy} onChange={(e) => updateField("returnReplacementPolicy", e.target.value)} placeholder="Describe the return/replacement policy..." rows={3} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="In-house Designer Available">
                <div className="flex items-center gap-3">
                  <Switch checked={form.inHouseDesignerAvailable} onCheckedChange={(checked) => updateField("inHouseDesignerAvailable", checked)} />
                  <span className="text-sm text-muted-foreground">{form.inHouseDesignerAvailable ? "Yes" : "No"}</span>
                </div>
              </FormField>
              <FormField label="Customer Location Visit Available">
                <div className="flex items-center gap-3">
                  <Switch checked={form.customerLocationVisitAvailable} onCheckedChange={(checked) => updateField("customerLocationVisitAvailable", checked)} />
                  <span className="text-sm text-muted-foreground">{form.customerLocationVisitAvailable ? "Yes" : "No"}</span>
                </div>
              </FormField>
            </div>
            <FormField label="Add-on Services">
              <CheckboxGrid options={[...ADDON_SERVICE_OPTIONS, ...customServices]} selected={form.addonServices} onChange={(val) => updateField("addonServices", toggleOtherList(form.addonServices, ADDON_SERVICE_OPTIONS, val))} columns={3} />
              {form.addonServices.includes("Other") && (
                <div className="mt-2">
                  <Input
                    value={otherCustomOf(form.addonServices, ADDON_SERVICE_OPTIONS)}
                    onChange={(e) => updateField("addonServices", setOtherCustomValue(form.addonServices, ADDON_SERVICE_OPTIONS, e.target.value))}
                    placeholder="Enter custom add-on service"
                  />
                </div>
              )}
              <div className="mt-3 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newCustomService}
                    onChange={(e) => setNewCustomService(e.target.value)}
                    placeholder="Enter custom service name..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const name = newCustomService.trim();
                        if (name && !ADDON_SERVICE_OPTIONS.includes(name) && !customServices.includes(name)) {
                          setCustomServices((prev) => [...prev, name]);
                          setNewCustomService("");
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const name = newCustomService.trim();
                      if (name && !ADDON_SERVICE_OPTIONS.includes(name) && !customServices.includes(name)) {
                        setCustomServices((prev) => [...prev, name]);
                        setNewCustomService("");
                      }
                    }}
                    className="gap-1"
                  >
                    <Plus size={14} /> Add
                  </Button>
                </div>
                {customServices.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {customServices.map((svc) => (
                      <span key={svc} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                        {svc}
                        <button
                          type="button"
                          onClick={() => {
                            setCustomServices((prev) => prev.filter((s) => s !== svc));
                            if (form.addonServices.includes(svc)) {
                              updateField("addonServices", form.addonServices.filter((s) => s !== svc));
                            }
                          }}
                          className="hover:opacity-70"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </FormField>
          </div>
        );

      case 13:
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-3 pb-4 border-b">
              <FileImage size={20} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Sample & File Formats</h3>
                <p className="text-sm text-muted-foreground">Display samples and file format preferences</p>
              </div>
            </div>
            <FormField label="Sample / Display Available">
              <div className="flex items-center gap-3">
                <Switch checked={form.sampleDisplayAvailable} onCheckedChange={(checked) => {
                  updateField("sampleDisplayAvailable", checked);
                  if (!checked) updateField("preferredFileFormats", []);
                }} />
                <span className="text-sm text-muted-foreground">{form.sampleDisplayAvailable ? "Yes, has samples" : "No samples available"}</span>
              </div>
            </FormField>
            <FormField label="Preferred File Formats">
              <div className={form.sampleDisplayAvailable ? "" : "pointer-events-none opacity-50"}>
                <CheckboxGrid
                  options={FILE_FORMAT_OPTIONS}
                  selected={form.sampleDisplayAvailable ? form.preferredFileFormats : []}
                  onChange={(val) => updateField("preferredFileFormats", toggleOtherList(form.preferredFileFormats, FILE_FORMAT_OPTIONS, val))}
                  columns={3}
                />
              </div>
              {form.preferredFileFormats.includes("Other") && form.sampleDisplayAvailable && (
                <div className="mt-2">
                  <Input
                    value={otherCustomOf(form.preferredFileFormats, FILE_FORMAT_OPTIONS)}
                    onChange={(e) => updateField("preferredFileFormats", setOtherCustomValue(form.preferredFileFormats, FILE_FORMAT_OPTIONS, e.target.value))}
                    placeholder="Enter your file format"
                  />
                </div>
              )}
              {!form.sampleDisplayAvailable && (
                <p className="text-xs text-muted-foreground mt-1.5">Enable Sample / Display Available to select file formats</p>
              )}
            </FormField>
          </div>
        );

      case 14:
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-3 pb-4 border-b">
              <ClipboardList size={20} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Purchase Order</h3>
                <p className="text-sm text-muted-foreground">Do they accept orders against a Purchase Order?</p>
              </div>
            </div>
            <FormField label="Accept Purchase Orders without advance payment?">
              <RadioCards
                options={[
                  { value: "true", label: "Yes", desc: "Accept PO-based orders without advance" },
                  { value: "false", label: "No", desc: "Require advance payment" },
                ]}
                value={String(form.acceptsPurchaseOrder)}
                onChange={(val) => updateField("acceptsPurchaseOrder", val === "true")}
              />
            </FormField>
          </div>
        );

      case 15:
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-3 pb-4 border-b">
              <AlertTriangle size={20} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Fraud / Hotlist Report</h3>
                <p className="text-sm text-muted-foreground">Report suspicious activity (private - not publicly displayed)</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-600 text-sm">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>This information is strictly private and will never be shown to public users.</span>
            </div>
            <div className="space-y-4">
              {(Array.isArray(form.fraudReport) ? form.fraudReport : [form.fraudReport]).map((entry, idx, arr) => (
                <div key={idx} className="space-y-3 p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Contact {idx + 1}</p>
                    {arr.length > 1 && (
                      <button
                        type="button"
                        onClick={() => updateField("fraudReport", arr.filter((_, i) => i !== idx))}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive hover:text-destructive/80 transition-colors"
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    )}
                  </div>
                  <FormField label="Contact Name">
                    <Input
                      value={entry?.contactName || ""}
                      onChange={(e) => {
                        const updated = [...arr];
                        updated[idx] = { ...updated[idx], contactName: e.target.value };
                        updateField("fraudReport", updated);
                      }}
                      placeholder="Name of the person to report"
                    />
                  </FormField>
                  <FormField label="Designation">
                    <Input
                      value={entry?.designation || ""}
                      onChange={(e) => {
                        const updated = [...arr];
                        updated[idx] = { ...updated[idx], designation: e.target.value };
                        updateField("fraudReport", updated);
                      }}
                      placeholder="e.g. Manager, Owner"
                    />
                  </FormField>
                  <FormField label="Contact Number">
                    <Input
                      value={entry?.contactNumber || ""}
                      onChange={(e) => {
                        const updated = [...arr];
                        updated[idx] = { ...updated[idx], contactNumber: e.target.value };
                        updateField("fraudReport", updated);
                      }}
                      placeholder="e.g. +91 98765 43210"
                    />
                  </FormField>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                updateField("fraudReport", [
                  ...(Array.isArray(form.fraudReport) ? form.fraudReport : []),
                  { contactName: "", designation: "", contactNumber: "" },
                ])
              }
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Plus size={16} />
              Add Another
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <button onClick={() => router.push("/admin/businesses")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors mb-3">
          <ArrowLeft size={16} />
          Back to Businesses
        </button>
        <h1 className="text-2xl font-bold text-foreground">Edit Business</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update business information (admin edit)
        </p>
      </div>

      <div
        ref={stepsScrollRef}
        className="flex items-center justify-between mb-6 overflow-x-auto pb-2 scrollbar-thin"
        style={{ scrollbarWidth: "thin" }}
      >
        {STEPS.map((s, i) => {
          const isCompleted = i < step;
          const isActive = i === step;
          return (
            <div key={i} data-step={i} className="flex items-center flex-1 flex-shrink-0">
              {i > 0 && (
                <div className={`flex-1 h-0.5 transition-colors ${isCompleted || isActive ? "bg-emerald-500" : "bg-border"}`} />
              )}
              <button
                type="button"
                onClick={() => { if (i < step) setStep(i); }}
                disabled={i > step}
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all ${
                  isCompleted
                    ? "bg-emerald-500 text-white cursor-pointer hover:bg-emerald-600"
                    : isActive
                    ? "bg-emerald-500/15 text-emerald-600 border-2 border-emerald-500 shadow-[0_0_0_4px_rgba(34,197,94,0.12)]"
                    : "bg-muted text-muted-foreground border-2 border-border cursor-default"
                }`}
                title={s.label}
              >
                {isCompleted ? <Check size={14} /> : <s.icon size={14} />}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-1.5 mb-6 flex-wrap">
        {STEPS.map((s, i) => (
          <span key={i} className={`text-[10px] font-medium px-1 ${i === step ? "text-emerald-600" : i < step ? "text-emerald-500" : "text-muted-foreground"}`}>
            {s.short}
          </span>
        ))}
      </div>

      {submitError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span className="flex-1">{submitError}</span>
          <button onClick={() => setSubmitError("")} className="hover:opacity-70"><X size={14} /></button>
        </div>
      )}

      {saveSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-600 text-sm mb-4">
          <Check size={16} className="flex-shrink-0" />
          <span>Changes saved successfully</span>
        </div>
      )}

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            {renderStep()}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={prevStep} disabled={step === 0} className="gap-2">
          <ArrowLeft size={16} />
          Previous
        </Button>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving} variant="outline" className="gap-2">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Check size={16} /> Save Changes</>}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={nextStep} className="gap-2">
              Next <ArrowRight size={16} />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Check size={16} /> Save Changes</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBusinessEditPage;
