"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Building2,
  Phone,
  MapPin,
  FileText,
  Package,
  Wrench,
  ShoppingCart,
  CreditCard,
  Globe,
  Camera,
  Languages,
  Shield,
  FileImage,
  ClipboardList,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  Users,
} from "lucide-react";
import { getAdminBusinessById } from "../../services/adminService";
import { StatusBadge } from "../../components/shared/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { ScrollArea } from "../../components/ui/scroll-area";
import WatermarkLogo from "../../components/media/WatermarkLogo";

const Section = ({ title, icon: Icon, children }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
        {title}
      </h3>
    </div>
    <div className="rounded-lg border bg-muted/30 p-4">{children}</div>
  </div>
);

const Field = ({ label, value, mono, link }) => {
  const display = value || "Not provided";
  const isNA = !value;
  return (
    <div className="space-y-0.5 min-w-0">
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
  <div className="space-y-0.5 min-w-0">
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
      <div className="relative rounded-lg overflow-hidden bg-black">
        <video
          src={url}
          controls
          className="w-full max-h-[300px] object-contain"
        >
          Your browser does not support the video tag.
        </video>
        <WatermarkLogo position="top-right" size="sm" />
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
        <img
          src={url}
          alt={label}
          className="w-full h-40 object-cover transition-transform group-hover:scale-105"
        />
        <WatermarkLogo position="top-right" size="sm" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      {open && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-white/80 z-10"
            onClick={() => setOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={url}
              alt={label}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <WatermarkLogo position="bottom-right-lg" size="lg" />
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
      <p className="text-xs text-muted-foreground">
        {label} ({urls.length} image{urls.length !== 1 ? "s" : ""})
      </p>
      <div className="relative rounded-lg overflow-hidden border group cursor-pointer" onClick={() => setOpen(true)}>
        <img src={urls[current]} alt={`${label} ${current + 1}`} className="w-full h-40 object-cover" />
        <WatermarkLogo position="top-right" size="sm" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {urls.length > 1 && (
          <>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
              onClick={(e) => { e.stopPropagation(); prev(); }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
              onClick={(e) => { e.stopPropagation(); next(); }}
            >
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
          <button className="absolute top-4 right-4 text-white hover:text-white/80 z-10" onClick={() => setOpen(false)}>
            <X className="h-6 w-6" />
          </button>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img src={urls[current]} alt={label} className="max-w-full max-h-[90vh] object-contain rounded-lg" />
            <WatermarkLogo position="bottom-right-lg" size="lg" />
          </div>
          {urls.length > 1 && (
            <>
              <button className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 text-white rounded-full p-2 hover:bg-white/30" onClick={(e) => { e.stopPropagation(); prev(); }}>
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 text-white rounded-full p-2 hover:bg-white/30" onClick={(e) => { e.stopPropagation(); next(); }}>
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

const BusinessViewDialog = ({
  open,
  onOpenChange,
  businessId,
  fetchFn,
  showSystemInfo = true,
  showFraud = true,
  title,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [business, setBusiness] = useState(null);

  useEffect(() => {
    if (!open || !businessId) return;
    setLoading(true);
    setError("");
    setBusiness(null);

    const fetcher = fetchFn || (() => getAdminBusinessById(businessId));
    fetcher()
      .then((res) => {
        const b = res.data.business || res.data;
        setBusiness(b);
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load business details"))
      .finally(() => setLoading(false));
  }, [open, businessId, fetchFn]);

  const media = business?.verificationMedia || {};
  const social = business?.socialMedia || {};
  const fraud = business?.fraudReport || {};
  const coords = business?.gpsCoordinates || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-2xl lg:max-w-4xl h-full max-h-[calc(100vh-40px)] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg truncate">{title || business?.name || "Business Details"}</DialogTitle>
                {business && (
                  <div className="flex items-center gap-2 mt-0.5">
                    {business.status && <StatusBadge status={business.status} />}
                  </div>
                )}
              </div>
            </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-5 pb-8 space-y-6">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Loading details...</span>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {business && !loading && !error && (
              <div className="space-y-6">
                <Section title="Business Information" icon={Building2}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Field label="Business Name" value={business.name} />
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Description" value={business.description} />
                    </div>
                    <Field label="Established Year" value={business.establishedYear?.toString()} />
                    <Field label="Working Hours" value={(() => {
                      const wh = business.workingHours;
                      if (!wh || typeof wh !== "object" || !wh.monday) return business.workingHours;
                      const days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
                      return days.map((d) => {
                        const day = wh[d];
                        const label = d.charAt(0).toUpperCase() + d.slice(1);
                        if (!day?.open) return `${label}: Closed`;
                        const fmt = (t) => { if (!t) return t; const [h,m] = t.split(":"); const hr = parseInt(h); const ampm = hr >= 12 ? "PM" : "AM"; const h12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr; return `${h12}:${m} ${ampm}`; };
                        return `${label}: ${fmt(day.openingTime)} – ${fmt(day.closingTime)}`;
                      }).join(", ");
                    })()} />
                  </div>
                </Section>

                <Separator />

                <Section title="Contact Details" icon={Phone}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Contact Name" value={business.contactName} />
                    <Field label="Phone" value={business.phone} mono />
                    <Field label="WhatsApp" value={business.whatsapp} mono />
                    <Field label="Email" value={business.contactEmail} />
                    <div className="sm:col-span-2">
                      <Field label="Website" value={business.website} link />
                    </div>
                  </div>
                </Section>

                <Separator />

                <Section title="Category & Location" icon={MapPin}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Field label="Category" value={business.categoryId?.name || business.category} />
                      {business.categoryId?.image && (
                        business.categoryId.image.trim().startsWith('<') ? <div className="h-8 w-8 [&>svg]:w-8 [&>svg]:h-8" dangerouslySetInnerHTML={{ __html: business.categoryId.image }} /> : <img src={business.categoryId.image} alt="" className="h-8 w-8 object-contain mt-1" />
                      )}
                    </div>
                    {business.serviceIds && business.serviceIds.length > 0 && (
                      <div className="sm:col-span-2">
                        <ArrayField
                          label="Services"
                          value={business.serviceIds.map((s) => s.name || s)}
                        />
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <ArrayField label="Tags" value={business.tags} />
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Full Address" value={business.address} />
                    </div>
                    <Field label="City" value={business.city} />
                    {coords.lat != null && coords.lng != null && (
                      <div className="sm:col-span-2">
                        <Field label="GPS Coordinates" value={`${coords.lat}, ${coords.lng}`} mono />
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <Field label="Google Business Profile" value={business.googleBusinessProfileLink} link />
                    </div>
                  </div>
                </Section>

                <Separator />

                <Section title="GST" icon={FileText}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <BoolField label="GST Available" value={business.gstAvailable} />
                    {business.gstAvailable && (
                      <Field label="GST Number" value={business.gstNumber} mono />
                    )}
                  </div>
                </Section>

                <Separator />

                <Section title="Order Limits" icon={Package}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Order Limits" value={ENUM_LABELS.orderLimits[business.orderLimits]} />
                  </div>
                </Section>

                <Separator />

                <Section title="Services" icon={Wrench}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Service Type" value={ENUM_LABELS.serviceType[business.serviceType]} />
                    <div className="sm:col-span-2">
                      <ArrayField label="Add-on Services" value={business.addonServices} />
                    </div>
                  </div>
                </Section>

                <Separator />

                <Section title="Customer Type" icon={Users}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Customer Type (Deal With)" value={ENUM_LABELS.customerType[business.customerType]} />
                  </div>
                </Section>

                <Separator />

                <Section title="Ordering Method" icon={ShoppingCart}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Ordering Method" value={ENUM_LABELS.orderingMethod[business.orderingMethod]} />
                  </div>
                </Section>

                <Separator />

                <Section title="Payment Modes" icon={CreditCard}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <ArrayField label="Payment Methods" value={business.paymentModes} />
                    </div>
                  </div>
                </Section>

                <Separator />

                <Section title="Social Media" icon={Globe}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Facebook" value={social.facebook} link />
                    <Field label="Instagram" value={social.instagram} link />
                    <Field label="YouTube" value={social.youtube} link />
                    <Field label="LinkedIn" value={social.linkedin} link />
                    <Field label="Twitter" value={social.twitter} link />
                  </div>
                </Section>

                <Separator />

                <Section title="Verification Media" icon={Camera}>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <VideoPlayer url={media.machineryWorkingVideo} label="Machinery Working Video" />
                      <VideoPlayer url={media.completeOutletVideo} label="Complete Outlet Video" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <ImageViewer url={media.outdoorStoreImage} label="Outdoor Store Image" />
                      <ImageViewer url={media.indoorStoreImage} label="Indoor Store Image" />
                    </div>
                    <SlideshowViewer urls={media.thumbnailImages || []} label="Thumbnail / Slideshow Images" />
                  </div>
                </Section>

                <Separator />

                <Section title="Communication Languages" icon={Languages}>
                  <ArrayField label="Languages" value={business.languages} />
                </Section>

                <Separator />

                <Section title="Policies & Additional Services" icon={Shield}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Field label="Return / Replacement Policy" value={business.returnReplacementPolicy} />
                    </div>
                    <BoolField label="In-house Designer Available" value={business.inHouseDesignerAvailable} />
                    <BoolField label="Customer Location Visit Available" value={business.customerLocationVisitAvailable} />
                  </div>
                </Section>

                <Separator />

                <Section title="Sample / Display & File Formats" icon={FileImage}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <BoolField label="Sample/Display Available" value={business.sampleDisplayAvailable} />
                    <div className="sm:col-span-2">
                      <ArrayField label="Preferred File Formats" value={business.preferredFileFormats} />
                    </div>
                  </div>
                </Section>

                <Separator />

                <Section title="Purchase Order" icon={ClipboardList}>
                  <BoolField label="Accepts Orders Without Advance (After Verification)" value={business.acceptsPurchaseOrder} />
                </Section>

                {showFraud && (
                  <>
                    <Separator />
                    <Section title="Fraudulent Contact Hotlist" icon={AlertTriangle}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Contact Name" value={fraud.contactName} />
                        <Field label="Designation" value={fraud.designation} />
                        <Field label="Contact Number" value={fraud.contactNumber} mono />
                        <Field label="Company Name" value={fraud.companyName} />
                      </div>
                    </Section>
                  </>
                )}

                {showSystemInfo && (
                  <>
                    <Separator />
                    <Section title="System Information" icon={Building2}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Business Status" value={business.status} />
                        <BoolField label="Active" value={business.isActive} />
                        {business.vendor && (
                          <>
                            <Field label="Vendor Name" value={business.vendor.fullName} />
                            <Field label="Vendor Email" value={business.vendor.email} />
                          </>
                        )}
                        <Field label="Created" value={business.createdAt ? new Date(business.createdAt).toLocaleString() : null} />
                        <Field label="Updated" value={business.updatedAt ? new Date(business.updatedAt).toLocaleString() : null} />
                      </div>
                    </Section>
                  </>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default BusinessViewDialog;
