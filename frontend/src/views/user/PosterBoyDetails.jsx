"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Eye,
  Languages,
  Loader2,
  MapPin,
  Megaphone,
  MessageCircle,
  Phone,
  Play,
  ShieldCheck,
  Video,
  X,
} from "lucide-react";
import { getPublicPosterBoy, revealPosterBoyContact } from "../../services/userService";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import CopyableId from "../../components/admin/CopyableId";
import WatermarkLogo from "../../components/media/WatermarkLogo";
import ProtectedVideo from "../../components/media/ProtectedVideo";

/**
 * Public worker boy (poster boy) profile page — the counterpart of the
 * business details page. Only allowlisted public fields are shown; phone /
 * WhatsApp stay hidden until the visitor presses Contact.
 */
const PosterBoyDetails = () => {
  const { id } = useParams();
  const router = useRouter();

  const [pb, setPb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contact, setContact] = useState(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [preview, setPreview] = useState(null); // { type: "image"|"video", url, list, index }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getPublicPosterBoy(id)
      .then((res) => { if (!cancelled) setPb(res?.data?.posterBoy || null); })
      .catch((err) => { if (!cancelled) setError(err?.response?.data?.message || "Could not load this profile."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const handleContact = async () => {
    if (contact || contactLoading) return;
    setContactLoading(true);
    setError("");
    try {
      const res = await revealPosterBoyContact(id);
      const data = res?.data || {};
      setContact(data.whatsappNumber || data.phone || "");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not fetch contact. Try again.");
    } finally {
      setContactLoading(false);
    }
  };

  const skills = Array.isArray(pb?.skills) ? pb.skills : [];
  const languages = Array.isArray(pb?.languages) ? pb.languages : [];
  const workMedia = Array.isArray(pb?.workMedia) ? pb.workMedia : [];
  const workImages = workMedia.filter((m) => m && m.resourceType === "image" && m.url).map((m) => m.url);
  const workVideos = workMedia.filter((m) => m && m.resourceType === "video" && m.url);
  if (workImages.length === 0 && pb?.coverImage) workImages.push(pb.coverImage);

  const isGpsVerified = !!(
    pb?.gpsCoordinates &&
    pb.gpsCoordinates.lat !== null &&
    pb.gpsCoordinates.lng !== null &&
    Number.isFinite(Number(pb.gpsCoordinates.lat)) &&
    Number.isFinite(Number(pb.gpsCoordinates.lng))
  );
  const directionsHref = isGpsVerified
    ? `https://www.google.com/maps/dir/?api=1&destination=${Number(pb.gpsCoordinates.lat)},${Number(pb.gpsCoordinates.lng)}`
    : "";

  const currentImage = workImages.length ? workImages[imgIndex % workImages.length] : "";
  const stepImage = (dir) => {
    if (workImages.length < 2) return;
    setImgIndex((i) => (i + dir + workImages.length) % workImages.length);
  };

  const openImagePreview = (index) => setPreview({ type: "image", list: workImages, index });
  const openVideoPreview = (index) =>
    setPreview({ type: "video", list: workVideos.map((v) => v.url), index });
  const stepPreview = (dir) => {
    if (!preview) return;
    const len = preview.list.length;
    if (len < 2) return;
    setPreview((p) => ({ ...p, index: (p.index + dir + len) % len }));
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  if (!pb) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <Megaphone className="h-12 w-12 text-gray-300" />
        <p className="text-lg font-semibold text-brand-navy">
          {error || "This worker boy profile could not be found."}
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[110px] pb-16 px-4 md:px-6 bg-[#F7F8FA] dark:bg-gray-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-bold text-brand-navy dark:text-gray-200 hover:text-brand-orange transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to results
        </button>

        <Card className="overflow-hidden">
          <div className="relative h-44 sm:h-56 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950/30 dark:to-amber-950/30 flex items-center justify-center text-brand-orange">
            {currentImage ? (
              <img src={currentImage} alt={pb.fullName || "Worker Boy"} className="h-full w-full object-cover" />
            ) : (
              <Megaphone className="h-12 w-12" />
            )}
            {currentImage && <WatermarkLogo position="top-right" size="sm" />}
            {currentImage && (
              <button
                type="button"
                onClick={() => openImagePreview(imgIndex % workImages.length)}
                aria-label="View full image"
                className="absolute top-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <Eye size={15} />
              </button>
            )}
            {workImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => stepImage(-1)}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => stepImage(1)}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  ›
                </button>
                <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold tabular-nums text-white">
                  {(imgIndex % workImages.length) + 1}/{workImages.length}
                </span>
              </>
            )}
          </div>

          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-extrabold text-foreground break-words">
                  {pb.fullName || "Worker Boy"}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 bg-emerald-600/95 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full">
                    <ShieldCheck size={12} /> Verified
                  </span>
                  {isGpsVerified && (
                    <span className="inline-flex items-center gap-1 bg-slate-700 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full">
                      <BadgeCheck size={12} /> GPS Verified
                    </span>
                  )}
                  <Badge variant="secondary" className="text-[10px]">Worker Boy</Badge>
                </div>
              </div>
              {pb.publicId && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground shrink-0">Worker ID:</span>
                  <CopyableId id={pb.publicId} />
                </div>
              )}
            </div>

            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <Badge key={skill} variant="outline" className="text-[11px]">{skill}</Badge>
                ))}
              </div>
            )}

            {languages.length > 0 && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Languages size={14} className="shrink-0" />
                {languages.join(", ")}
              </p>
            )}

            {(pb.workRadius || pb.strength || pb.bookingTimeline || pb.workTiming || (pb.orderAccepted || []).length > 0) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {pb.workRadius && (
                  <div className="rounded-lg border border-border bg-muted/40 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Travel Radius</p>
                    <p className="text-sm font-semibold">{pb.workRadius}</p>
                  </div>
                )}
                {pb.strength && (
                  <div className="rounded-lg border border-border bg-muted/40 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Strength</p>
                    <p className="text-sm font-semibold">{pb.strength}</p>
                  </div>
                )}
                {(pb.orderAccepted || []).length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/40 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Order Sizes</p>
                    <p className="text-sm font-semibold">{pb.orderAccepted.join(", ")}</p>
                  </div>
                )}
                {pb.bookingTimeline && (
                  <div className="rounded-lg border border-border bg-muted/40 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Booking</p>
                    <p className="text-sm font-semibold">{pb.bookingTimeline}</p>
                  </div>
                )}
                {pb.workTiming && (
                  <div className="rounded-lg border border-border bg-muted/40 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Timings</p>
                    <p className="text-sm font-semibold">{pb.workTiming}</p>
                  </div>
                )}
              </div>
            )}

            {(pb.city || pb.address) && (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin size={14} className="mt-0.5 shrink-0" />
                {directionsHref ? (
                  <a
                    href={directionsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary hover:underline underline-offset-2"
                  >
                    {pb.city}{pb.address ? `, ${pb.address}` : ""}
                  </a>
                ) : (
                  <span>{pb.city}{pb.address ? `, ${pb.address}` : ""}</span>
                )}
              </p>
            )}

            <div className="pt-2 border-t border-border">
              {contact ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={`https://wa.me/${String(contact).replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors"
                  >
                    <MessageCircle size={16} /> WhatsApp {contact}
                  </a>
                  <a
                    href={`tel:${contact}`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-brand-border bg-background hover:bg-brand-light text-sm font-bold text-brand-navy transition-colors"
                  >
                    <Phone size={16} /> Call {contact}
                  </a>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <Button
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleContact}
                    disabled={contactLoading}
                  >
                    {contactLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                    {contactLoading ? "Fetching..." : "Show Contact Details"}
                  </Button>
                  {pb.contactHint && (
                    <p className="text-xs text-muted-foreground">{pb.contactHint}</p>
                  )}
                </div>
              )}
              {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            </div>
          </CardContent>
        </Card>

        {workVideos.length > 0 && (
          <Card>
            <CardContent className="p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <Video size={16} className="text-brand-orange" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Work Videos</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {workVideos.map((v, i) => (
                  <button
                    key={v.url + i}
                    type="button"
                    onClick={() => openVideoPreview(i)}
                    className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                  >
                    <video
                      src={v.url}
                      className="h-full w-full object-cover pointer-events-none"
                      muted
                      playsInline
                      preload="metadata"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play size={22} className="text-white" fill="currentColor" />
                    </span>
                    <span className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white">
                      <Eye size={13} />
                    </span>
                    <WatermarkLogo size="sm" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {workImages.length > 1 && (
          <Card>
            <CardContent className="p-5 sm:p-6">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Work Pics</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {workImages.map((url, i) => (
                  <button
                    key={url + i}
                    type="button"
                    onClick={() => { setImgIndex(i); openImagePreview(i); }}
                    className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-colors ${i === imgIndex % workImages.length ? "border-brand-orange" : "border-transparent hover:border-brand-orange/40"}`}
                  >
                    <img src={url} alt={`Work ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                      <Eye size={18} className="text-white opacity-0 group-hover:opacity-100" />
                    </span>
                    <WatermarkLogo position="bottom-right" size="sm" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fullscreen media lightbox */}
        {preview && preview.list[preview.index] && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setPreview(null)}
          >
            <button
              type="button"
              className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => setPreview(null)}
              aria-label="Close"
            >
              <X size={20} />
            </button>
            {preview.list.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); stepPreview(-1); }}
                  aria-label="Previous"
                  className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); stepPreview(1); }}
                  aria-label="Next"
                  className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  ›
                </button>
              </>
            )}
            <span className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-bold tabular-nums text-white">
              {preview.index + 1}/{preview.list.length}
            </span>
            {(() => {
              const url = preview.list[preview.index];
              return preview.type === "video" ? (
                <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
                  <ProtectedVideo src={url} variant="player" />
                </div>
              ) : (
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="max-h-[85vh] max-w-[92vw] rounded-lg object-contain"
                  />
                  <WatermarkLogo size="lg" />
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default PosterBoyDetails;
