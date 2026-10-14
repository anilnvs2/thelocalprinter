"use client";

import { useState } from "react";
import {
  Megaphone,
  User,
  MapPin,
  Wrench,
  Camera,
  Eye,
} from "lucide-react";
import { StatusBadge } from "../../components/shared/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import { ScrollArea } from "../../components/ui/scroll-area";
import { VideoPlayer, ImageViewer } from "../../components/media/MediaViewers";
import {
  splitWorkMedia,
  isVideoMedia,
  isImageMedia,
  toAutoVideoUrl,
} from "../../lib/cloudinary";

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

const Field = ({ label, value, mono }) => {
  const display = value || "Not provided";
  const isNA = !value;
  return (
    <div className="space-y-0.5 min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`text-sm break-all ${
          mono ? "font-mono" : ""
        } ${isNA ? "text-muted-foreground italic" : "text-foreground"}`}
      >
        {display}
      </p>
    </div>
  );
};

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

// ── Submitted-changes diff (mirrors the vendor Approvals review) ──
const CHANGE_FIELD_LABELS = {
  aadhaarNumber: "Aadhaar",
  languages: "Languages",
  address: "Address",
  city: "City",
  skills: "Skills",
  workRadius: "Work Radius",
  strength: "Strength",
  orderAccepted: "Order Accepted",
  bookingTimeline: "Booking Timeline",
  workTiming: "Timings",
  workMedia: "Work Media",
};

const humanizeChangeKey = (key) =>
  CHANGE_FIELD_LABELS[key] ||
  String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());

const mediaToUrls = (value) =>
  (Array.isArray(value) ? value : [])
    .map((m) => (typeof m === "string" ? m : m?.url))
    .filter(Boolean);

const mediaItems = (value) =>
  (Array.isArray(value) ? value : [])
    .map((m) => (typeof m === "string" ? { url: m } : m))
    .filter((m) => m?.url);

// Human summary — never raw Cloudinary URLs in the review UI.
const describeMedia = (value) => {
  const arr = mediaItems(value);
  if (!arr.length) return "No files";
  const photos = arr.filter((m) => isImageMedia(m)).length;
  const videos = arr.filter((m) => isVideoMedia(m)).length;
  const parts = [];
  if (photos) parts.push(`${photos} photo${photos !== 1 ? "s" : ""}`);
  if (videos) parts.push(`${videos} video${videos !== 1 ? "s" : ""}`);
  return parts.length ? parts.join(" + ") : `${arr.length} files`;
};

const MediaDiffThumbs = ({ items }) => {
  const arr = mediaItems(items);
  if (!arr.length) {
    return <p className="text-xs text-muted-foreground italic">No files</p>;
  }
  const photos = arr.filter((m) => isImageMedia(m));
  // Videos render as real mini players (transcoded source first, raw
  // fallback) so the admin can actually watch what was submitted.
  const videos = arr.filter((m) => isVideoMedia(m) && !isImageMedia(m));
  return (
    <div className="space-y-2">
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {photos.map((m, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={(m.url || "") + i}
              src={m.url}
              alt=""
              className="h-12 w-12 rounded-md border object-cover"
              loading="lazy"
            />
          ))}
        </div>
      )}
      {videos.map((m, i) => (
        <video
          key={(m.url || "") + i}
          controls
          playsInline
          preload="metadata"
          className="h-24 w-full max-w-[260px] rounded-md border bg-black object-contain"
        >
          <source src={toAutoVideoUrl(m.url)} />
          <source src={m.url} />
        </video>
      ))}
    </div>
  );
};

const formatChangeValue = (key, value) => {
  if (key === "workMedia") return describeMedia(value);
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) {
    if (!value.length) return "—";
    return value.map((v) => (v && typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    const text = JSON.stringify(value);
    return text.length > 160 ? `${text.slice(0, 160)}…` : text;
  }
  return String(value);
};

const normalizeForCompare = (key, value) => {
  if (key === "workMedia") return mediaToUrls(value);
  return value ?? null;
};

const computeProfileChanges = (profile) => {
  const pending = profile?.pendingChangeData || {};
  return Object.keys(pending)
    .filter((key) => !["categoryId", "skillIds", "gpsCoordinates"].includes(key))
    .map((key) => ({
      field: key,
      before: profile[key],
      after: pending[key],
    }))
    .filter(
      (c) =>
        JSON.stringify(normalizeForCompare(c.field, c.before) ?? null) !==
        JSON.stringify(normalizeForCompare(c.field, c.after) ?? null)
    );
};

/**
 * Shared admin dialog for a poster/worker boy registration or profile,
 * styled like the vendor BusinessViewDialog (fixed header + ScrollArea body
 * + fixed footer, sectioned cards separated by Separators).
 *
 * `worker` shape: { _id, fullName, email, phone, whatsappNumber, publicId,
 *   approvalStatus, isActive, createdAt, profile: { status, skills,
 *   languages, address, city, aadhaarNumber, workRadius, strength,
 *   orderAccepted, bookingTimeline, workTiming, workMedia,
 *   hasPendingChange, pendingChangeAt } | null }
 */
const PosterBoyViewDialog = ({
  open,
  onOpenChange,
  worker,
  showActions = false,
  actionLoading = false,
  onApprove,
  onReject,
  title,
  description,
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const profile = worker?.profile || null;
  const { videos: workVideos, images: workImages } = splitWorkMedia(
    profile?.workMedia
  );
  const hasPendingReview =
    !!profile?.hasPendingChange && !!profile?.pendingChangeData;
  const pendingChanges = profile ? computeProfileChanges(profile) : [];

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-full sm:max-w-2xl lg:max-w-4xl h-full max-h-[calc(100vh-40px)] p-0 overflow-hidden"
          onInteractOutside={(e) => {
            if (lightboxOpen) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (lightboxOpen) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (lightboxOpen) e.preventDefault();
          }}
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg truncate">
                  {title || worker?.fullName || "Worker Boy Details"}
                </DialogTitle>
                <DialogDescription className="truncate">
                  {description ||
                    "Registration details submitted by the poster/worker boy for approval."}
                </DialogDescription>
                {worker && (
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <StatusBadge status={worker.approvalStatus || "pending"} />
                    <Badge variant="secondary" className="font-normal text-xs">
                      WORKER BOY
                    </Badge>
                    {worker.publicId && (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {worker.publicId}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-5 pb-8 space-y-6">
              {!worker ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No details to show.
                </p>
              ) : (
                <div className="space-y-6">
                  <Section title="Account Information" icon={User}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Full Name" value={worker.fullName} />
                      <Field label="Email" value={worker.email} />
                      <Field label="Phone" value={worker.phone} mono />
                      <Field label="WhatsApp" value={worker.whatsappNumber} mono />
                      <Field
                        label="Registered On"
                        value={
                          worker.createdAt
                            ? new Date(worker.createdAt).toLocaleString()
                            : null
                        }
                      />
                      <Field
                        label="Account Status"
                        value={worker.approvalStatus || "pending"}
                      />
                    </div>
                  </Section>

                  <Separator />

                  {!profile ? (
                    <Section title="Work Profile" icon={Wrench}>
                      <p className="text-sm text-muted-foreground italic">
                        No work profile submitted yet — only the account details
                        above are available for review.
                      </p>
                    </Section>
                  ) : (
                    <>
                      <Section title="Work Profile" icon={MapPin}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                            <StatusBadge status={profile.status} />
                            {profile.hasPendingChange && (
                              <Badge
                                variant="outline"
                                className="bg-amber-500/10 text-amber-600 border-amber-500/30"
                              >
                                change pending
                              </Badge>
                            )}
                          </div>
                          <Field label="Aadhaar" value={profile.aadhaarNumber} mono />
                          <Field label="City" value={profile.city} />
                          <div className="sm:col-span-2">
                            <Field label="Full Address" value={profile.address} />
                          </div>
                          <div className="sm:col-span-2">
                            <ArrayField label="Languages" value={profile.languages} />
                          </div>
                          <div className="sm:col-span-2">
                            <ArrayField label="Skills" value={profile.skills} />
                          </div>
                          <Field label="Work Radius" value={profile.workRadius} />
                          <Field label="Strength" value={profile.strength} />
                          <div className="sm:col-span-2">
                            <ArrayField
                              label="Order Accepted"
                              value={profile.orderAccepted}
                            />
                          </div>
                          <Field
                            label="Booking Timeline"
                            value={profile.bookingTimeline}
                          />
                          <Field label="Timings" value={profile.workTiming} />
                          {profile.pendingChangeAt && (
                            <div className="sm:col-span-2">
                              <Field
                                label="Changes Submitted At"
                                value={new Date(
                                  profile.pendingChangeAt
                                ).toLocaleString()}
                              />
                            </div>
                          )}
                        </div>
                      </Section>

                      <Separator />

                      {hasPendingReview && (
                        <>
                          <Section title="Submitted Changes" icon={Eye}>
                            <div className="space-y-3">
                              <p className="text-xs text-muted-foreground">
                                What the worker boy submitted
                                {profile.pendingChangeAt
                                  ? ` on ${new Date(
                                      profile.pendingChangeAt
                                    ).toLocaleString()}`
                                  : ""}
                                . Approve applies these, Discard keeps the live
                                profile as it is.
                              </p>
                              {pendingChanges.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">
                                  No field-level differences found.
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  {pendingChanges.map((c) => (
                                    <div
                                      key={c.field}
                                      className="rounded-lg border border-border bg-background p-3"
                                    >
                                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                                        {humanizeChangeKey(c.field)}
                                      </p>
                                      {c.field === "workMedia" ? (
                                        <div className="mt-2 space-y-2">
                                          <div className="flex flex-wrap items-center gap-2 text-sm">
                                            <span className="max-w-full break-words rounded-md bg-red-50 px-2 py-1 text-red-700 dark:bg-red-950 dark:text-red-400">
                                              {describeMedia(c.before)}
                                            </span>
                                            <span className="text-muted-foreground">→</span>
                                            <span className="max-w-full break-words rounded-md bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                              {describeMedia(c.after)}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div className="rounded-md bg-red-50/60 p-2 dark:bg-red-950/40">
                                              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-red-700/80 dark:text-red-400/80">
                                                Current
                                              </p>
                                              <MediaDiffThumbs items={c.before} />
                                            </div>
                                            <div className="rounded-md bg-emerald-50/60 p-2 dark:bg-emerald-950/40">
                                              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700/80 dark:text-emerald-400/80">
                                                Submitted
                                              </p>
                                              <MediaDiffThumbs items={c.after} />
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                                          <span className="max-w-full break-words rounded-md bg-red-50 px-2 py-1 text-red-700 line-through dark:bg-red-950 dark:text-red-400">
                                            {formatChangeValue(c.field, c.before)}
                                          </span>
                                          <span className="text-muted-foreground">→</span>
                                          <span className="max-w-full break-words rounded-md bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                            {formatChangeValue(c.field, c.after)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </Section>

                          <Separator />
                        </>
                      )}

                      <Section title="Work Media" icon={Camera}>
                        {workVideos.length === 0 && workImages.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">
                            No work photos or videos submitted.
                          </p>
                        ) : (
                          <div className="space-y-6">
                            {workVideos.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {workVideos.map((m, i) => (
                                  <VideoPlayer
                                    key={(m.url || "") + i}
                                    url={m.url}
                                    label={`Work Video ${i + 1}`}
                                  />
                                ))}
                              </div>
                            )}
                            {workImages.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {workImages.map((m, i) => (
                                  <ImageViewer
                                    key={(m.url || "") + i}
                                    url={m.url}
                                    label={`Work Photo ${i + 1}`}
                                    onOpenChange={setLightboxOpen}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </Section>
                    </>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="px-6 py-4 border-t shrink-0 bg-background">
            <DialogFooter className="flex-row items-center justify-end gap-2 space-x-0">
              {showActions && worker ? (
                <>
                  <Button
                    variant="outline"
                    className="min-w-[96px]"
                    onClick={() => onOpenChange(false)}
                    disabled={actionLoading}
                  >
                    Close
                  </Button>
                  <div className="flex-1" />
                  <Button
                    className="min-w-[96px]"
                    variant="destructive"
                    onClick={() => onReject?.(worker)}
                    disabled={actionLoading}
                  >
                    Reject
                  </Button>
                  <Button
                    className="min-w-[96px]"
                    onClick={() => onApprove?.(worker)}
                    disabled={actionLoading}
                  >
                    Approve
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  className="min-w-[96px]"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
  );
};

export default PosterBoyViewDialog;
export { computeProfileChanges, humanizeChangeKey };
