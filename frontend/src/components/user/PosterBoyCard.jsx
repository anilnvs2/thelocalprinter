"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Loader2,
  Languages,
  Megaphone,
  Phone,
  ShieldCheck,
  MessageCircle,
  BadgeCheck,
  Video,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import CopyableId from "../admin/CopyableId";
import WatermarkLogo from "../media/WatermarkLogo";
import { Play } from "lucide-react";
import { splitWorkMedia } from "../../lib/cloudinary";
import { revealPosterBoyContact } from "@/services/userService";

/**
 * Public poster boy card. Shows only allowlisted public fields — never the
 * Aadhaar number, email or raw phone number (contact is revealed on demand).
 */
const PosterBoyCard = ({ posterBoy: p, detailHref }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contact, setContact] = useState(null);
  const [imgIndex, setImgIndex] = useState(0);

  if (!p) return null;

  const goToProfile = () => {
    if (detailHref) router.push(detailHref);
  };

  const skills = Array.isArray(p.skills) ? p.skills : [];
  const languages = Array.isArray(p.languages) ? p.languages : [];
  const { videos: workVideos, images: workImageObjs } = splitWorkMedia(p.workMedia);
  const workImages = workImageObjs.map((m) => m.url);
  if (workImages.length === 0 && p.coverImage) workImages.push(p.coverImage);

  const activeIndex = workImages.length ? imgIndex % workImages.length : 0;
  const currentImage = workImages[activeIndex] || "";
  const hasMultipleImages = workImages.length > 1;

  const stepImage = (dir) => {
    if (!hasMultipleImages) return;
    setImgIndex((i) => (i + dir + workImages.length) % workImages.length);
  };

  const isGpsVerified = !!(
    p.gpsCoordinates &&
    p.gpsCoordinates.lat !== null &&
    p.gpsCoordinates.lng !== null &&
    Number.isFinite(Number(p.gpsCoordinates.lat)) &&
    Number.isFinite(Number(p.gpsCoordinates.lng))
  );

  const directionsHref = isGpsVerified
    ? `https://www.google.com/maps/dir/?api=1&destination=${Number(p.gpsCoordinates.lat)},${Number(p.gpsCoordinates.lng)}`
    : "";

  const handleContact = async (e) => {
    e?.stopPropagation?.();
    if (contact || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await revealPosterBoyContact(p._id);
      const data = res?.data || {};
      setContact(data.whatsappNumber || data.phone || "");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not fetch contact. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      className={`overflow-hidden flex flex-col ${detailHref ? "cursor-pointer transition-shadow hover:shadow-lg" : ""}`}
      onClick={goToProfile}
    >
      <div className="h-40 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950/30 dark:to-amber-950/30 flex items-center justify-center text-brand-orange relative overflow-hidden shrink-0">
        {currentImage ? (
          <img
            src={currentImage}
            alt={p.fullName || "Poster Boy"}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <Megaphone size={36} />
        )}
        {currentImage && <WatermarkLogo position="bottom-right" size="sm" />}
        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); stepImage(-1); }}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 z-30 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-sm transition-colors hover:bg-black/80"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); stepImage(1); }}
              aria-label="Next image"
              className="absolute right-2 top-1/2 z-30 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-sm transition-colors hover:bg-black/80"
            >
              <ChevronRight size={18} />
            </button>
            <span className="absolute top-2 right-2 z-30 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold tabular-nums text-white shadow-sm">
              {activeIndex + 1}/{workImages.length}
            </span>
          </>
        )}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col items-start gap-1.5">
          <span className="inline-flex items-center gap-1 bg-emerald-600/95 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full backdrop-blur-sm shadow-sm">
            <ShieldCheck size={12} className="shrink-0" />
            Verified
          </span>
          {isGpsVerified && (
            <span className="inline-flex items-center gap-1 bg-black/65 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full backdrop-blur-sm">
              <BadgeCheck size={12} className="shrink-0" />
              GPS Verified
            </span>
          )}
        </div>
      </div>

      {workVideos.length > 0 && (
        <div className="px-4 pt-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Video size={13} className="text-brand-orange" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Work Videos
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {workVideos.slice(0, 4).map((v, i) => (
              <div
                key={v.url + i}
                className="relative w-44 shrink-0 aspect-video overflow-hidden rounded-lg border bg-muted"
              >
                {/* Lightweight thumb only — the full ProtectedVideo player
                    mounts in the profile lightbox. Mounting players inline
                    here hung the page on undecodable files. */}
                <video
                  src={v.url}
                  className="h-full w-full object-cover pointer-events-none"
                  muted
                  playsInline
                  preload="metadata"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                  <Play size={22} className="text-white" fill="currentColor" />
                </span>
                <WatermarkLogo size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      <CardContent className="p-4 flex flex-col gap-1.5 flex-1">
        <h3 className="text-sm font-bold text-foreground truncate">
          {p.fullName || "Poster Boy"}
        </h3>

        {p.publicId && (
          <div className="flex items-center gap-1.5 min-w-0 text-xs" onClick={(e) => e.stopPropagation()}>
            <span className="text-muted-foreground shrink-0">Poster ID:</span>
            <CopyableId id={p.publicId} />
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-[10px]">
            Poster Boy
          </Badge>
          {skills.slice(0, 3).map((skill) => (
            <Badge key={skill} variant="outline" className="text-[9px]">
              {skill}
            </Badge>
          ))}
          {skills.length > 3 && (
            <Badge variant="outline" className="text-[9px]">
              +{skills.length - 3} more
            </Badge>
          )}
        </div>

        {languages.length > 0 && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Languages size={12} className="shrink-0" />
            <span className="truncate">{languages.slice(0, 3).join(", ")}</span>
            {languages.length > 3 && <span>+{languages.length - 3} more</span>}
          </p>
        )}

        {(p.city || p.address) && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin size={12} className="shrink-0" />
            {directionsHref ? (
              <a
                href={directionsHref}
                target="_blank"
                rel="noopener noreferrer"
                title="Get directions"
                onClick={(e) => e.stopPropagation()}
                className="truncate hover:text-primary hover:underline underline-offset-2"
              >
                {p.city}
                {p.address ? `, ${p.address}` : ""}
              </a>
            ) : (
              <span className="truncate">
                {p.city}
                {p.address ? `, ${p.address}` : ""}
              </span>
            )}
            {p.distance != null && (
              <span className="inline-flex items-center gap-0.5 shrink-0 text-primary font-medium">
                {p.distance} km
              </span>
            )}
          </p>
        )}

        <div className="pt-1 mt-auto" onClick={(e) => e.stopPropagation()}>
          {detailHref && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-1 text-xs font-semibold text-primary hover:text-primary/80 mb-2"
              onClick={goToProfile}
            >
              <Eye size={14} />
              View Profile
            </Button>
          )}
          {contact ? (
            <div className="flex flex-col gap-2">
              <a
                href={`https://wa.me/${String(contact).replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center gap-1 w-full px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
              >
                <MessageCircle size={14} /> WhatsApp {contact}
              </a>
              <a
                href={`tel:${contact}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center gap-1 w-full px-3 py-2 rounded-lg border border-brand-border bg-background hover:bg-brand-light text-xs font-bold text-brand-navy transition-colors"
              >
                <Phone size={14} /> Call {contact}
              </a>
            </div>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1 text-xs font-semibold hover:text-primary hover:border-primary/40"
                disabled={loading}
                onClick={handleContact}
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Phone size={14} />
                )}
                {loading ? "Fetching..." : "Contact"}
              </Button>
              {p.contactHint && (
                <p className="mt-1 text-center text-[11px] text-muted-foreground">
                  {p.contactHint}
                </p>
              )}
              {error && (
                <p className="mt-1 text-center text-[11px] text-red-500">{error}</p>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PosterBoyCard;
