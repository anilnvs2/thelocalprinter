"use client";

import { useState, useEffect } from "react";
import {
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
  Users,
  Mail,
  User,
  Eye,
  Calendar,
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

const ENUM_LABELS = {
  orderLimits: { single: "Single Order", minimum: "Minimum Order", bulk: "Bulk Orders", no_limit: "No Limit" },
  serviceType: { print_only: "Print Only", full_with_design: "Full Service (With Design)", full_without_design: "Full Service (Without Design)" },
  customerType: { b2b: "B2B", b2c: "B2C", both: "B2B and B2C" },
  orderingMethod: { on_call: "On Call", shop_visit: "Shop Visit", both: "On Call and Shop Visit" },
};

const ROLE_BADGE_COLORS = {
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  VENDOR: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  USER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  POSTER_BOY: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const BUSINESS_TYPE_LABELS = {
  PERSONAL_USE: "Personal Use",
  BUSINESS_PURPOSE: "Business Purpose",
  RESELLER: "Reseller",
};

const BUSINESS_TYPE_COLORS = {
  PERSONAL_USE: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  BUSINESS_PURPOSE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  RESELLER: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
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
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={url}
              alt={label}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <WatermarkLogo position="bottom-right-lg" size="lg" />
          </div>
        </div>
      )}
    </div>
  );
};

const UnifiedViewDialog = ({ open, onOpenChange, account }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [business, setBusiness] = useState(null);

  useEffect(() => {
    if (!open || !account?._id) return;
    setLoading(true);
    setError("");
    setBusiness(null);

    getAdminBusinessById(account._id)
      .then((res) => {
        setBusiness(res.data.business || null);
      })
      .catch((err) => {
        // 404 is expected for USER/ADMIN without businesses
        if (err.response?.status !== 404) {
          setError(err.response?.data?.message || "Failed to load details");
        }
      })
      .finally(() => setLoading(false));
  }, [open, account?._id]);

  if (!account) return null;

  const media = business?.verificationMedia || {};
  const social = business?.socialMedia || {};
  const fraud = business?.fraudReport || {};
  const coords = business?.gpsCoordinates || {};

  const displayName = business?.name || account.fullName;
  const isVendor = account.role === "VENDOR";
  const isUser = account.role === "USER";

  const getUserEffectiveStatus = (u) => u.approvalStatus || u.status || "pending";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-full max-h-[calc(100vh-40px)] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              {isVendor ? (
                <Building2 className="h-5 w-5 text-primary" />
              ) : (
                <Users className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg truncate">{displayName}</DialogTitle>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {business ? (
                  <StatusBadge status={business.status} />
                ) : (
                  <StatusBadge status={getUserEffectiveStatus(account)} />
                )}
                {isVendor && (
                  <Badge
                    variant="secondary"
                    className={`font-normal text-xs ${ROLE_BADGE_COLORS[account.role] || ""}`}
                  >
                    {account.role}
                  </Badge>
                )}
                {isUser && account.registrationType && (
                  <Badge
                    variant="secondary"
                    className={`text-xs font-normal ${BUSINESS_TYPE_COLORS[account.registrationType] || ""}`}
                  >
                    {BUSINESS_TYPE_LABELS[account.registrationType] || account.registrationType}
                  </Badge>
                )}
              </div>
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

            {!loading && !error && (
              <div className="space-y-6">
                {/* ── USER view: matches AdminUsers layout ── */}
                {isUser && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                          Account Information
                        </h3>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-xs text-muted-foreground">Full Name</p>
                            <p className="text-sm text-foreground break-words">{account.fullName}</p>
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-xs text-muted-foreground">Email</p>
                            <p className="text-sm text-foreground break-all">{account.email}</p>
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-xs text-muted-foreground">Public ID</p>
                            {account.publicId ? (
                              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-mono font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-400/30">
                                {account.publicId}
                              </span>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">Not set</p>
                            )}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <p className="text-sm text-foreground break-words">{account.phone || "Not provided"}</p>
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-xs text-muted-foreground">WhatsApp</p>
                            <p className="text-sm text-foreground break-words">{account.whatsappNumber || "Not provided"}</p>
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-xs text-muted-foreground">Role</p>
                            <p className="text-sm text-foreground">{account.role}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                          Business Type & Status
                        </h3>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-xs text-muted-foreground">Business Type</p>
                            {account.registrationType ? (
                              <Badge
                                variant="secondary"
                                className={`font-normal ${BUSINESS_TYPE_COLORS[account.registrationType] || ""}`}
                              >
                                {BUSINESS_TYPE_LABELS[account.registrationType] || account.registrationType}
                              </Badge>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">Not set</p>
                            )}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-xs text-muted-foreground">Approval Status</p>
                            <StatusBadge status={getUserEffectiveStatus(account)} />
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-xs text-muted-foreground">Account Active</p>
                            <Badge variant={account.isActive ? "default" : "secondary"}>
                              {account.isActive ? "Yes" : "No"}
                            </Badge>
                          </div>
                          {account.resellerApprovalStatus && (
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-xs text-muted-foreground">Reseller Approval</p>
                              <StatusBadge status={account.resellerApprovalStatus.toLowerCase()} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                          Timeline
                        </h3>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-xs text-muted-foreground">Created</p>
                            <p className="text-sm text-foreground break-words">
                              {account.createdAt
                                ? new Date(account.createdAt).toLocaleString()
                                : "Unknown"}
                            </p>
                          </div>
                          {account.updatedAt && (
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-xs text-muted-foreground">Updated</p>
                              <p className="text-sm text-foreground break-words">
                                {new Date(account.updatedAt).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ── VENDOR view: Account info + business details ── */}
                {isVendor && (
                  <>
                    <Section title="Account Information" icon={User}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <Field label="Full Name" value={account.fullName} />
                        </div>
                        <div className="sm:col-span-2">
                          <Field label="Email" value={account.email} />
                        </div>
                        <Field label="Public ID" value={account.publicId} />
                        <Field label="Phone" value={account.phone} />
                        <Field label="WhatsApp" value={account.whatsappNumber} />
                        <Field label="Role" value={account.role} />
                        {account.registrationType && (
                          <Field label="Registration Type" value={account.registrationType} />
                        )}
                        {account.approvalStatus && (
                          <Field label="Approval Status" value={account.approvalStatus} />
                        )}
                        <Field
                          label="Account Active"
                          value={account.isActive ? "Yes" : "No"}
                        />
                        <Field
                          label="Joined"
                          value={
                            account.createdAt
                              ? new Date(account.createdAt).toLocaleString()
                              : null
                          }
                        />
                      </div>
                    </Section>

                    <Separator />

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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <VideoPlayer url={media.machineryWorkingVideo} label="Machinery Working Video" />
                        <VideoPlayer url={media.completeOutletVideo} label="Complete Outlet Video" />
                        <ImageViewer url={media.outdoorStoreImage} label="Outdoor Store Image" />
                        <ImageViewer url={media.indoorStoreImage} label="Indoor Store Image" />
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

                    <Separator />

                    <Section title="Fraudulent Contact Hotlist" icon={AlertTriangle}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Contact Name" value={fraud.contactName} />
                        <Field label="Designation" value={fraud.designation} />
                        <Field label="Contact Number" value={fraud.contactNumber} mono />
                      </div>
                    </Section>
                  </>
                )}

                {/* ── Vendor without business ── */}
                {isVendor && !business && !loading && (
                  <>
                    <Separator />
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No business profile has been created by this vendor yet.
                    </div>
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

export default UnifiedViewDialog;
