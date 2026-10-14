"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, MapPin, Phone, Clock, Heart, Globe,
  MessageCircle, Loader2, Languages, CreditCard,
  FileText, Star, Send, Trash2, Edit2, MessageSquare, Mail, Share2,
  Camera, Wrench, Shield, FileImage, ClipboardList,
  Package, X, ChevronLeft, ChevronRight, Eye, ExternalLink, Sun, Moon, Video, BadgeCheck, Navigation, Award,
} from "lucide-react";
import {
  getBusinessDetails, getPublicBusinessDetails, addToWishlist, removeFromWishlist,
  getBusinessReviews, getPublicBusinessReviews, getMyReview, createReview, updateReview, deleteReview,
} from "../../services/userService";
import { PageLoader } from "../../components/shared/page-loader";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import CopyableId from "../../components/admin/CopyableId";
import WatermarkLogo from "../../components/media/WatermarkLogo";
import ProtectedVideo from "../../components/media/ProtectedVideo";
import { useAuth } from "../../context/AuthContext";
import { extractBusinessId } from "../../lib/utils";

const ProfileSection = ({ title, icon: Icon, children }) => (
  <section className="py-7 sm:py-8">
    <div className="flex items-center gap-2.5 mb-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {Icon && <Icon className="h-4 w-4" />}
      </span>
      <h2 className="text-base sm:text-lg font-bold text-foreground">{title}</h2>
    </div>
    {children}
  </section>
);

const Field = ({ label, value, mono, link }) => {
  const display = value || "Not provided";
  const isNA = !value;
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      {link && value ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1 break-all"
        >
          {value} <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      ) : (
        <p
          className={`text-sm break-all ${
            mono ? "font-mono" : ""
          } ${isNA ? "text-muted-foreground italic" : "text-foreground"}`}
        >
          {display}
        </p>
      )}
    </div>
  );
};

const BoolField = ({ label, value }) => (
  <div className="space-y-0.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <Badge variant={value ? "default" : "secondary"} className="text-xs">
      {value ? "Yes" : "No"}
    </Badge>
  </div>
);

const ArrayField = ({ label, value }) => {
  const items = Array.isArray(value) ? value : [];
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <Badge key={i} variant="outline" className="text-xs font-normal">
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Not provided</p>
      )}
    </div>
  );
};

const VideoPlayer = ({ url, label }) => {
  if (!url) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-muted-foreground italic">Not provided</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="rounded-lg overflow-hidden bg-black">
        <ProtectedVideo src={url} label={label} className="rounded-lg" />
      </div>
    </div>
  );
};

const ImageViewer = ({ url, label }) => {
  const [open, setOpen] = useState(false);
  if (!url) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-muted-foreground italic">Not provided</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div
        className="relative group cursor-pointer rounded-lg overflow-hidden border"
        onClick={() => setOpen(true)}
      >
        <img src={url} alt={label} className="w-full h-40 object-cover transition-transform group-hover:scale-105" />
        <WatermarkLogo position="top-right" size="sm" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <button className="absolute top-4 right-4 text-white hover:text-white/80 z-10" onClick={() => setOpen(false)}>
            <X className="h-6 w-6" />
          </button>
          <div className="flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <img src={url} alt={label} className="max-w-full max-h-[78vh] object-contain rounded-lg" />
              <WatermarkLogo position="bottom-right-lg" size="lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SlideshowViewer = ({ urls, label }) => {
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);
  if (!urls || urls.length === 0) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-muted-foreground italic">Not provided</p>
      </div>
    );
  }
  const prev = () => setCurrent((c) => (c === 0 ? urls.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === urls.length - 1 ? 0 : c + 1));
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{label} ({urls.length} image{urls.length !== 1 ? "s" : ""})</p>
      <div className="relative rounded-lg overflow-hidden border group cursor-pointer" onClick={() => setOpen(true)}>
        <img src={urls[current]} alt={`${label} ${current + 1}`} className="w-full h-40 object-cover" />
        <WatermarkLogo position="top-right" size="sm" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {urls.length > 1 && (
          <>
            <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2.5 hover:bg-black/80" onClick={(e) => { e.stopPropagation(); prev(); }}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2.5 hover:bg-black/80" onClick={(e) => { e.stopPropagation(); next(); }}>
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
              {current + 1} / {urls.length}
            </div>
          </>
        )}
      </div>
      {urls.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {urls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Thumb ${i + 1}`}
              className={`h-12 w-12 rounded object-cover border-2 cursor-pointer shrink-0 ${
                i === current ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
              }`}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <button className="absolute top-4 right-4 text-white hover:text-white/80 z-10 p-2" onClick={() => setOpen(false)}>
            <X className="h-6 w-6" />
          </button>
          <div className="flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <img src={urls[current]} alt={label} className="max-w-full max-h-[78vh] object-contain rounded-lg" />
              <WatermarkLogo position="bottom-right-lg" size="lg" />
            </div>
          </div>
          {urls.length > 1 && (
            <>
              <button className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 text-white rounded-full p-3 hover:bg-white/30" onClick={(e) => { e.stopPropagation(); prev(); }}>
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 text-white rounded-full p-3 hover:bg-white/30" onClick={(e) => { e.stopPropagation(); next(); }}>
                <ChevronRight className="h-6 w-6" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                {current + 1} / {urls.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const ENUM_LABELS = {
  orderLimits: { single: "Single Order", minimum: "Minimum Order", bulk: "Bulk Orders", no_limit: "No Limit" },
  serviceType: { print_only: "Print Only", full_with_design: "Full Service (With Design)", full_without_design: "Full Service (Without Design)" },
  customerType: { b2b: "B2B", b2c: "B2C", both: "B2B and B2C" },
  orderingMethod: { on_call: "On Call", shop_visit: "Shop Visit", both: "On Call and Shop Visit" },
};

const WEEK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const fmtTime = (t) => {
  if (!t || typeof t !== "string" || !t.includes(":")) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  if (Number.isNaN(hr)) return t;
  const ampm = hr >= 12 ? "PM" : "AM";
  const h12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
  return `${h12}:${m} ${ampm}`;
};

const UserBusinessDetails = ({ publicMode = false }) => {
  // Route param may be a plain id or a pretty "{name-slug}-{id}" — extract the id.
  const { id: businessParam } = useParams();
  const id = extractBusinessId(businessParam);
  const router = useRouter();
  const { user } = useAuth();
  const isUserRole = !publicMode && user?.role === "USER";
  // Any logged-in USER can write a review, on the public page or the user page.
  const canReview = user?.role === "USER";
  // USER-facing privacy: GST + restricted verification media stay hidden for
  // logged-in USERs and for public (logged-out) visitors alike.
  const hidePrivate = publicMode || isUserRole;
  const [business, setBusiness] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingWishlist, setTogglingWishlist] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ averageRating: 0, reviewCount: 0, ratingBreakdown: {1:0,2:0,3:0,4:0,5:0} });
  const [myReview, setMyReview] = useState(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPagination, setReviewPagination] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [editingReview, setEditingReview] = useState(false);
  const [theme, setTheme] = useState('light');
  const [shareFeedback, setShareFeedback] = useState("");

  useEffect(() => {
    if (publicMode) {
      const saved = localStorage.getItem('search-theme');
      setTheme(saved || 'light');
    }
  }, [publicMode]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('search-theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    if (publicMode) {
      const html = document.documentElement;
      if (theme === 'dark') {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    }
  }, [publicMode, theme]);

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const apiFn = publicMode ? getPublicBusinessDetails : getBusinessDetails;
        const res = await apiFn(id);
        setBusiness(res.data.business);
        if (!publicMode) setIsWishlisted(res.data.isWishlisted);
      } catch (err) {
        setError(err.response?.data?.message || "Business not found");
      } finally {
        setLoading(false);
      }
    };
    fetchBusiness();
  }, [id, publicMode]);

  useEffect(() => {
    if (!id) return;
    const fetchReviews = publicMode ? getPublicBusinessReviews : getBusinessReviews;
    fetchReviews(id, reviewPage).then((res) => {
      setReviews(res.data.reviews);
      setReviewSummary(res.data.summary || { averageRating: 0, reviewCount: 0, ratingBreakdown: {1:0,2:0,3:0,4:0,5:0} });
      setReviewPagination(res.data.pagination);
    }).catch(() => {});
    if (user?.role === "USER") {
      getMyReview(id).then((res) => {
        setMyReview(res.data.review);
        if (res.data.review) {
          setReviewRating(res.data.review.rating);
          setReviewComment(res.data.review.comment);
        }
      }).catch(() => {});
    } else {
      setMyReview(null);
    }
  }, [id, reviewPage, submittingReview, publicMode, user?.role]);

  const handleWishlist = async () => {
    setTogglingWishlist(true);
    try {
      if (isWishlisted) { await removeFromWishlist(id); setIsWishlisted(false); }
      else { await addToWishlist(id); setIsWishlisted(true); }
    } catch (err) { /* silent */ } finally { setTogglingWishlist(false); }
  };

  const copyShareUrl = async (url) => {
    try {
      if (url && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        return true;
      }
      throw new Error("no-clipboard");
    } catch {
      // Fallback for older browsers / non-secure contexts (same as CopyableId).
      try {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        return true;
      } catch {
        return false;
      }
    }
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareData = { title: business?.name || "Business", text: business?.description || "", url: shareUrl };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        // Mobile / supported browsers: native share sheet (URL included).
        await navigator.share(shareData);
        return;
      }
      throw new Error("no-share");
    } catch (err) {
      if (err?.name === "AbortError") return;
      // Desktop / unsupported browsers: copy the page URL + show feedback.
      if (shareUrl && (await copyShareUrl(shareUrl))) {
        setShareFeedback("Link copied");
        setTimeout(() => setShareFeedback(""), 2000);
      }
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <div className="text-destructive p-6">{error}</div>;
  if (!business) return null;

  const heroImage =
    business.verificationMedia?.outdoorStoreImage ||
    business.verificationMedia?.indoorStoreImage ||
    "";
  const storeImages = [
    business.verificationMedia?.outdoorStoreImage
      ? { url: business.verificationMedia.outdoorStoreImage, label: "Outdoor Store Image" }
      : null,
    business.verificationMedia?.indoorStoreImage
      ? { url: business.verificationMedia.indoorStoreImage, label: "Indoor Store Image" }
      : null,
  ].filter(Boolean);
  const wh = business.workingHours;
  const hasStructuredHours = wh && typeof wh === "object" && !!wh.monday;
  const serviceList = Array.isArray(business.serviceIds) ? business.serviceIds : [];
  // Extra categories an admin attached (each with its own services).
  const additionalCats = Array.isArray(business.additionalCategories) ? business.additionalCategories : [];
  // Primary + additional services, de-duplicated by id.
  const allServiceList = [
    ...serviceList,
    ...additionalCats.flatMap((e) => (Array.isArray(e.serviceIds) ? e.serviceIds : [])),
  ].filter((s, i, arr) => arr.findIndex((x) => (x?._id || x) === (s?._id || s)) === i);
  const socials = [
    { key: "facebook", label: "Facebook", url: business.socialMedia?.facebook?.trim(), cls: "text-[#1877F2] border-[#1877F2]/30 hover:bg-[#1877F2]/5" },
    { key: "instagram", label: "Instagram", url: business.socialMedia?.instagram?.trim(), cls: "text-[#E1306C] border-[#E1306C]/30 hover:bg-[#E1306C]/5" },
    { key: "youtube", label: "YouTube", url: business.socialMedia?.youtube?.trim(), cls: "text-[#FF0000] border-[#FF0000]/30 hover:bg-[#FF0000]/5" },
    { key: "linkedin", label: "LinkedIn", url: business.socialMedia?.linkedin?.trim(), cls: "text-[#0A66C2] border-[#0A66C2]/30 hover:bg-[#0A66C2]/5" },
    { key: "twitter", label: "Twitter", url: business.socialMedia?.twitter?.trim(), cls: "text-[#1D9BF0] border-[#1D9BF0]/30 hover:bg-[#1D9BF0]/5" },
  ].filter((s) => !!s.url);
  const lat = business.gpsCoordinates?.lat;
  const lng = business.gpsCoordinates?.lng;
  const hasCoords =
    typeof lat === "number" && typeof lng === "number" &&
    Number.isFinite(lat) && Number.isFinite(lng);
  // Optional, admin-managed Brand Recall / Trust Score (0-10). No score = no badge.
  const trustScore =
    business.brandRecallScore === null ||
    business.brandRecallScore === undefined ||
    business.brandRecallScore === ""
      ? NaN
      : Number(business.brandRecallScore);
  const hasTrustScore = Number.isFinite(trustScore);
  const mapDelta = 0.02;
  const mapSrc = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - mapDelta}%2C${lat - mapDelta}%2C${lng + mapDelta}%2C${lat + mapDelta}&layer=mapnik&marker=${lat}%2C${lng}`
    : "";
  const callDigits = String(business.whatsapp || business.phone || "").replace(/\D/g, "");
  const hasContact = business.contactName || business.phone || business.whatsapp || business.contactEmail || business.website;
  const hasCapabilities =
    business.category || allServiceList.length > 0 || business.serviceType ||
    (business.addonServices?.length || 0) > 0 || (business.tags?.length || 0) > 0;
  const hasOrderInfo = business.orderLimits || business.customerType || business.orderingMethod;
  const hasPolicies =
    business.returnReplacementPolicy || business.inHouseDesignerAvailable || business.customerLocationVisitAvailable;
  const hasSamples =
    business.sampleDisplayAvailable || (business.preferredFileFormats?.length || 0) > 0;

  const handleSubmitReview = async () => {
    setReviewError(""); setReviewSuccess("");
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) { setReviewError("Please select a rating"); return; }
    if (!reviewComment.trim()) { setReviewError("Please write a review comment"); return; }
    setSubmittingReview(true);
    try {
      if (editingReview && myReview) {
        await updateReview(myReview._id, { rating: reviewRating, comment: reviewComment.trim() });
        setReviewSuccess("Review updated successfully");
      } else {
        await createReview(id, { rating: reviewRating, comment: reviewComment.trim() });
        setReviewSuccess("Review submitted successfully");
      }
      setShowReviewForm(false); setEditingReview(false); setReviewComment(""); setReviewRating(0);
    } catch (err) { setReviewError(err.response?.data?.message || "Failed to submit review"); }
    finally { setSubmittingReview(false); }
  };

  const handleDeleteReview = async () => {
    if (!myReview) return;
    if (!window.confirm("Delete your review?")) return;
    setSubmittingReview(true);
    try {
      await deleteReview(myReview._id);
      setMyReview(null); setReviewComment(""); setReviewRating(0); setReviewSuccess("Review deleted");
    } catch (err) { setReviewError(err.response?.data?.message || "Failed to delete review"); }
    finally { setSubmittingReview(false); }
  };

  return (
    <div className="relative bg-[#F4F6FA] px-3 pb-4 pt-24 sm:px-4 md:pt-24 dark:bg-transparent">
      {/* Subtle decorative page backdrop (purely visual, extremely low opacity) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 hidden h-64 bg-gradient-to-b from-slate-200/40 via-transparent to-transparent dark:hidden" />
        <div className="absolute -top-24 left-1/2 h-72 w-[min(42rem,120vw)] -translate-x-1/2 rounded-full bg-gradient-to-br from-orange-500/10 via-rose-500/5 to-blue-500/10 blur-3xl dark:from-orange-500/[0.14] dark:via-purple-500/10 dark:to-blue-500/[0.14]" />
      </div>
      <div className="relative max-w-6xl mx-auto">
      <div className="flex items-center justify-between pb-2">
        <Button variant="ghost" size="sm" className="gap-1.5 w-fit" onClick={() => router.back()}>
          <ArrowLeft size={16} /> Back
        </Button>
        {publicMode && (
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </Button>
        )}
      </div>

      {/* ONE main premium profile template containing the whole business profile */}
      <article className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white text-card-foreground shadow-xl shadow-slate-900/[0.06] dark:border-border/60 dark:bg-card dark:shadow-black/40">
        <div className="p-5 sm:p-8 md:p-10">
      <div className="pb-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-950/30 flex items-center justify-center text-primary h-44 md:h-64">
          {heroImage ? (
            <img src={heroImage} alt={business.name} className="w-full h-full object-cover" />
          ) : (
            <Building2 size={48} />
          )}
          {heroImage && <WatermarkLogo position="top-right" size="sm" />}
          {(hasCoords || hasTrustScore) && (
            <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5">
              {hasCoords && (
                <span className="inline-flex items-center gap-1 bg-emerald-600/95 text-white text-[11px] font-extrabold uppercase tracking-wide px-2.5 py-1.5 rounded-full backdrop-blur-sm shadow-sm">
                  <BadgeCheck size={13} className="shrink-0" />
                  GPS Verified
                </span>
              )}
              {hasTrustScore && (
                <span
                  title="Trust Score assigned by the admin"
                  className="inline-flex items-center gap-1 bg-amber-500/95 text-white text-[11px] font-extrabold uppercase tracking-wide px-2.5 py-1.5 rounded-full backdrop-blur-sm shadow-sm whitespace-nowrap"
                >
                  <Award size={13} className="shrink-0" />
                  Trust Score {trustScore}/10
                </span>
              )}
            </div>
          )}
        </div>
        <div className="pt-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground break-words">{business.name}</h1>
              {business.vendor?.publicId && (
                <div className="mt-1"><CopyableId id={business.vendor.publicId} /></div>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {business.category && (
                  <span className="inline-flex items-center gap-1.5">
                    {business.categoryId?.image && (business.categoryId.image.trim().startsWith('<') ? <span className="h-4 w-4 [&>svg]:w-4 [&>svg]:h-4" dangerouslySetInnerHTML={{ __html: business.categoryId.image }} /> : <img src={business.categoryId.image} alt="" className="h-4 w-4 object-contain" />)}
                    <Badge variant="secondary">{business.category}</Badge>
                  </span>
                )}
                {additionalCats
                  .filter((entry) => entry.categoryId?.name)
                  .map((entry) => (
                    <Badge key={entry.categoryId._id} variant="secondary">
                      {entry.categoryId.name}
                    </Badge>
                  ))}
                {reviewSummary.reviewCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    {Number(reviewSummary.averageRating).toFixed(1)}
                    <span className="font-normal text-muted-foreground">({reviewSummary.reviewCount} reviews)</span>
                  </span>
                )}
                {business.establishedYear && (
                  <Badge variant="outline" className="text-[11px]">Since {business.establishedYear}</Badge>
                )}
              </div>
            </div>
            {!publicMode && (
              <Button
                variant="outline"
                size="sm"
                className={`gap-2 shrink-0${isWishlisted ? " bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-700" : ""}`}
                onClick={handleWishlist}
                disabled={togglingWishlist}
              >
                {togglingWishlist ? <Loader2 size={16} className="animate-spin" /> : <Heart size={16} fill={isWishlisted ? "currentColor" : "none"} />}
                <span className="hidden sm:inline">{isWishlisted ? "Wishlisted" : "Add to Wishlist"}</span>
                <span className="sm:hidden">{isWishlisted ? "Wishlisted" : "Wishlist"}</span>
              </Button>
            )}
          </div>
          {(business.city || business.address) && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-3">
              <MapPin size={14} className="shrink-0" />
              {hasCoords ? (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Get directions"
                  className="break-words hover:text-primary hover:underline underline-offset-2"
                >
                  {[business.city, business.address].filter(Boolean).join(", ")}
                </a>
              ) : (
                <span className="break-words">{[business.city, business.address].filter(Boolean).join(", ")}</span>
              )}
            </p>
          )}
          {business.contactName && (
            <p className="text-sm text-muted-foreground mt-1">Contact: <span className="text-foreground font-medium">{business.contactName}</span></p>
          )}
          {business.description && <p className="text-sm text-muted-foreground leading-relaxed mt-3">{business.description}</p>}
          {(business.phone || callDigits || business.contactEmail) && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {business.phone && (
                <a href={`tel:${String(business.phone).replace(/\s/g, "")}`}>
                  <Button size="sm" className="gap-1.5"><Phone size={14} /> Call Now</Button>
                </a>
              )}
              {callDigits && (
                <a href={`https://wa.me/${callDigits}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="gap-1.5 text-emerald-600 border-emerald-600/30 hover:bg-emerald-600/5 hover:text-emerald-600"><MessageCircle size={14} /> WhatsApp</Button>
                </a>
              )}
              {business.contactEmail && (
                <a href={`mailto:${business.contactEmail}`}>
                  <Button size="sm" variant="outline" className="gap-1.5"><Mail size={14} /> Email</Button>
                </a>
              )}
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleShare}>
                <Share2 size={14} /> {shareFeedback || "Share"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="divide-y divide-border border-t border-border">
        {/* Working Hours — structured Mon–Sun */}
        {hasStructuredHours && (
          <ProfileSection title="Working Hours" icon={Clock}>
            <ul className="divide-y divide-border max-w-xl">
              {WEEK_DAYS.map((d) => {
                const day = wh[d] || {};
                const label = d.charAt(0).toUpperCase() + d.slice(1);
                const open = !!day.open;
                const range = open && (day.openingTime || day.closingTime)
                  ? `${fmtTime(day.openingTime)} – ${fmtTime(day.closingTime)}`
                  : "";
                return (
                  <li key={d} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    {open ? (
                      <span className="text-sm text-muted-foreground">{range || "Open"}</span>
                    ) : (
                      <Badge variant="secondary" className="text-[11px]">Closed</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </ProfileSection>
        )}

        {/* Contact Details — only when data exists */}
        {hasContact && (
          <ProfileSection title="Contact Details" icon={Phone}>
            <div className="grid gap-3 sm:grid-cols-2">
              {business.contactName && <Field label="Contact Name" value={business.contactName} />}
              {business.phone && <Field label="Phone" value={business.phone} mono />}
              {business.whatsapp && <Field label="WhatsApp" value={business.whatsapp} mono />}
              {business.contactEmail && <Field label="Email" value={business.contactEmail} />}
              {business.website && <Field label="Website" value={business.website} link />}
            </div>
          </ProfileSection>
        )}

        {/* Services & Capabilities */}
        {hasCapabilities && (
          <ProfileSection title="Services & Capabilities" icon={Wrench}>
            <div className="space-y-3">
              {(business.categoryId?.name || business.category || additionalCats.length > 0) && (
                <Field
                  label="Category"
                  value={[
                    business.categoryId?.name || business.category,
                    ...additionalCats.map((e) => e.categoryId?.name).filter(Boolean),
                  ].filter(Boolean).join(", ")}
                />
              )}
              {allServiceList.length > 0 && (
                <ArrayField label="Services" value={allServiceList.map((s) => s.name || s)} />
              )}
              {business.serviceType && (
                <Field label="Service Type" value={ENUM_LABELS.serviceType[business.serviceType] || business.serviceType} />
              )}
              {(business.addonServices?.length || 0) > 0 && (
                <ArrayField label="Add-on Services" value={business.addonServices} />
              )}
              {(business.tags?.length || 0) > 0 && (
                <ArrayField label="Tags" value={business.tags} />
              )}
            </div>
          </ProfileSection>
        )}

        {/* 4. GST — never rendered in USER-facing views (incl. public) */}
        {!hidePrivate && (
          <ProfileSection title="GST" icon={FileText}>
            <div className="space-y-3">
              <BoolField label="GST Available" value={business.gstAvailable} />
            </div>
          </ProfileSection>
        )}

        {/* Orders */}
        {hasOrderInfo && (
          <ProfileSection title="Orders" icon={Package}>
            <div className="grid gap-3 sm:grid-cols-2">
              {business.orderLimits && (
                <Field label="Orders Limit" value={ENUM_LABELS.orderLimits[business.orderLimits] || business.orderLimits} />
              )}
              {business.customerType && (
                <Field label="Deals With" value={ENUM_LABELS.customerType[business.customerType] || business.customerType} />
              )}
              {business.orderingMethod && (
                <Field label="To Order" value={ENUM_LABELS.orderingMethod[business.orderingMethod] || business.orderingMethod} />
              )}
            </div>
          </ProfileSection>
        )}

        {/* Mode of Payments */}
        {(business.paymentModes?.length || 0) > 0 && (
          <ProfileSection title="Mode of Payments" icon={CreditCard}>
            <ArrayField label="Payment Methods" value={business.paymentModes} />
          </ProfileSection>
        )}

        {/* Social Media — buttons only for saved URLs */}
        {socials.length > 0 && (
          <ProfileSection title="Social Media" icon={Globe}>
            <div className="flex flex-wrap gap-2">
              {socials.map((s) => (
                <a
                  key={s.key}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors min-h-[40px] ${s.cls}`}
                >
                  {s.label}
                  <ExternalLink size={13} />
                </a>
              ))}
            </div>
          </ProfileSection>
        )}

        {/* Location & Map — business's stored GPS coordinates */}
        {(business.address || business.city || hasCoords) && (
          <ProfileSection title="Location" icon={MapPin}>
            <div className="space-y-3">
              {business.address && <Field label="Full Address" value={business.address} />}
              {business.city && <Field label="City" value={business.city} />}
              {hasCoords ? (
                <div className="space-y-2">
                  <div className="rounded-xl overflow-hidden border">
                    <iframe
                      title={`Map of ${business.name}`}
                      src={mapSrc}
                      className="w-full aspect-video"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
                    >
                      Open in Maps <ExternalLink size={13} />
                    </a>
                    <Button asChild size="sm" className="gap-1.5 font-bold">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Navigation size={15} /> Directions
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                (business.address || business.city) && (
                  <p className="text-xs text-muted-foreground italic">Map not available for this location.</p>
                )
              )}
            </div>
          </ProfileSection>
        )}

        {/* 10b. Videos — only the two public validation videos for USER-facing views */}
        {hidePrivate &&
          (business.verificationMedia?.machineryWorkingVideo ||
            business.verificationMedia?.completeOutletVideo) && (
            <ProfileSection title="Videos" icon={Video}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {business.verificationMedia?.machineryWorkingVideo && (
                  <VideoPlayer
                    url={business.verificationMedia.machineryWorkingVideo}
                    label="Machinery Working Video"
                  />
                )}
                {business.verificationMedia?.completeOutletVideo && (
                  <VideoPlayer
                    url={business.verificationMedia.completeOutletVideo}
                    label="Complete Outlet Video"
                  />
                )}
              </div>
            </ProfileSection>
          )}

        {/* 11. Store Photos — outdoor/indoor only in USER-facing views */}
        {(!hidePrivate || storeImages.length > 0) && (
          <ProfileSection title="Store Photos" icon={Camera}>
            <div className="space-y-6">
              {hidePrivate ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {storeImages.map((img) => (
                    <ImageViewer key={img.label} url={img.url} label={img.label} />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <VideoPlayer url={business.verificationMedia?.machineryWorkingVideo} label="Machinery Working Video" />
                    <VideoPlayer url={business.verificationMedia?.completeOutletVideo} label="Complete Outlet Video" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <ImageViewer url={business.verificationMedia?.outdoorStoreImage} label="Outdoor Store Image" />
                    <ImageViewer url={business.verificationMedia?.indoorStoreImage} label="Indoor Store Image" />
                  </div>
                  <SlideshowViewer urls={business.verificationMedia?.thumbnailImages || []} label="Thumbnail / Slideshow Images" />
                </>
              )}
            </div>
          </ProfileSection>
        )}

        {/* 12. Languages */}
        {(business.languages?.length || 0) > 0 && (
          <ProfileSection title="Communication Languages" icon={Languages}>
            <ArrayField label="Languages" value={business.languages} />
          </ProfileSection>
        )}

        {/* 13. Policies & Additional Services */}
        {hasPolicies && (
          <ProfileSection title="Policies & Additional Services" icon={Shield}>
            <div className="space-y-3">
              {business.returnReplacementPolicy && (
                <Field label="Return / Replacement Policy" value={business.returnReplacementPolicy} />
              )}
              {business.inHouseDesignerAvailable && (
                <BoolField label="In-house Designer Available" value={business.inHouseDesignerAvailable} />
              )}
              {business.customerLocationVisitAvailable && (
                <BoolField label="Customer Location Visit Available" value={business.customerLocationVisitAvailable} />
              )}
            </div>
          </ProfileSection>
        )}

        {/* 14. Sample / Display & File Formats */}
        {hasSamples && (
          <ProfileSection title="Sample / Display & File Formats" icon={FileImage}>
            <div className="space-y-3">
              {business.sampleDisplayAvailable && (
                <BoolField label="Sample/Display Available" value={business.sampleDisplayAvailable} />
              )}
              {(business.preferredFileFormats?.length || 0) > 0 && (
                <ArrayField label="Preferred File Formats" value={business.preferredFileFormats} />
              )}
            </div>
          </ProfileSection>
        )}

        {/* 15. Purchase Order */}
        {business.acceptsPurchaseOrder && (
          <ProfileSection title="Purchase Order" icon={ClipboardList}>
            <BoolField label="Accepts Orders Without Advance (After Verification)" value={business.acceptsPurchaseOrder} />
          </ProfileSection>
        )}
      </div>

      <section className="py-7 sm:py-8">
        <div className="flex flex-row items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="h-4 w-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-foreground">Customer Reviews</h2>
          </div>
          {canReview && !myReview && (
            <Button size="sm" className="gap-1.5" onClick={() => { setShowReviewForm(!showReviewForm); setEditingReview(false); setReviewComment(""); setReviewRating(0); setReviewError(""); setReviewSuccess(""); }}>
              <MessageSquare size={14} /> Write a Review
            </Button>
          )}
          {!canReview && (
            <Button size="sm" variant="outline" className="gap-1.5" asChild>
              <a href="/login">
                <Edit2 size={14} /> Login to Write a Review
              </a>
            </Button>
          )}
        </div>
        <div className="space-y-4">
          {reviewSuccess && !showReviewForm && (
            <p className="text-xs text-emerald-600">{reviewSuccess}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
            <div className="text-center min-w-[100px]">
              <p className="text-4xl font-extrabold text-foreground">{reviewSummary.averageRating}</p>
              <div className="flex justify-center gap-0.5 my-1">
                {[1,2,3,4,5].map((s) => <Star key={s} size={14} fill={s <= Math.round(reviewSummary.averageRating) ? "#f59e0b" : "none"} color={s <= Math.round(reviewSummary.averageRating) ? "#f59e0b" : "var(--muted-foreground)"} />)}
              </div>
              <p className="text-xs text-muted-foreground">Based on {reviewSummary.reviewCount} reviews</p>
            </div>
            <div className="flex-1 min-w-[200px] space-y-1">
              {[5,4,3,2,1].map((star) => {
                const count = reviewSummary.ratingBreakdown?.[star] || 0;
                const pct = reviewSummary.reviewCount > 0 ? (count / reviewSummary.reviewCount * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5">{star}★</span>
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {myReview && (
            <div className="p-3 rounded-lg bg-muted border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-foreground">Your Review</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowReviewForm(true); setEditingReview(true); setReviewRating(myReview.rating); setReviewComment(myReview.comment); }}><Edit2 size={12} /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={handleDeleteReview}><Trash2 size={12} /></Button>
                </div>
              </div>
              <div className="flex gap-0.5 mb-1">{[1,2,3,4,5].map((s) => <Star key={s} size={12} fill={s <= myReview.rating ? "#f59e0b" : "none"} color={s <= myReview.rating ? "#f59e0b" : "var(--muted-foreground)"} />)}</div>
              <p className="text-sm text-muted-foreground">{myReview.comment}</p>
              <span className="text-xs text-muted-foreground">{new Date(myReview.createdAt).toLocaleDateString()}</span>
            </div>
          )}

          {showReviewForm && (
            <div className="p-4 rounded-lg bg-muted border space-y-3">
              <h4 className="text-sm font-semibold text-foreground">{editingReview ? "Edit Review" : "Write a Review"}</h4>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Rating</Label>
                <div className="flex gap-1">{[1,2,3,4,5].map((s) => <button key={s} type="button" onClick={() => setReviewRating(s)}><Star size={24} fill={s <= reviewRating ? "#f59e0b" : "none"} color={s <= reviewRating ? "#f59e0b" : "currentColor"} strokeWidth={s <= reviewRating ? 0 : 2} /></button>)}</div>
              </div>
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Comment</Label><Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} placeholder="Share your experience..." /></div>
              {reviewError && <p className="text-xs text-destructive">{reviewError}</p>}
              {reviewSuccess && <p className="text-xs text-emerald-600">{reviewSuccess}</p>}
              <div className="flex gap-2">
                <Button size="sm" className="gap-1.5" onClick={handleSubmitReview} disabled={submittingReview}>
                  {submittingReview ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {editingReview ? "Update" : "Submit"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowReviewForm(false); setEditingReview(false); setReviewError(""); setReviewSuccess(""); }}>Cancel</Button>
              </div>
            </div>
          )}

          {reviews.length === 0 && !showReviewForm ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No reviews yet</p>
              <p className="text-xs">Be the first to review this business</p>
            </div>
          ) : (
            <div className="divide-y">
              {reviews.map((r) => (
                <div key={r._id} className="py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-7 w-7"><AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">{r.user?.fullName?.[0] || "U"}</AvatarFallback></Avatar>
                    <span className="text-sm font-semibold text-foreground">{r.user?.fullName || "User"}</span>
                    <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-0.5 mb-1">{[1,2,3,4,5].map((s) => <Star key={s} size={12} fill={s <= r.rating ? "#f59e0b" : "none"} color={s <= r.rating ? "#f59e0b" : "var(--muted-foreground)"} />)}</div>
                  <p className="text-sm text-muted-foreground">{r.comment}</p>
                </div>
              ))}
            </div>
          )}

          {reviewPagination && reviewPagination.pages > 1 && (
            <div className="flex justify-center gap-1.5">
              {Array.from({ length: reviewPagination.pages }, (_, i) => i + 1).map((p) => (
                <Button key={p} size="sm" variant={p === reviewPage ? "default" : "outline"} className="h-10 w-10 p-0" onClick={() => setReviewPage(p)}>{p}</Button>
              ))}
            </div>
          )}
        </div>
      </section>
        </div>
      </article>
      </div>
    </div>
  );
};

export default UserBusinessDetails;
