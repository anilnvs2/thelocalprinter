"use client";

import { useState } from "react";
import { X, Eye } from "lucide-react";
import WatermarkLogo from "./WatermarkLogo";
import { toAutoVideoUrl } from "../../lib/cloudinary";

/**
 * Shared vendor-style media viewers — the exact same UI/behaviour as the
 * vendor BusinessViewDialog ("Verification Media" section):
 * native <video controls> (no custom player) + thumbnail grid with a
 * click-to-open lightbox for images. Poster-boy views reuse these so a
 * worker's photos/videos open identically to a vendor's.
 */
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
          controls
          controlsList="nodownload noplaybackrate noremoteplayback"
          disablePictureInPicture
          playsInline
          preload="metadata"
          className="w-full max-h-[300px] object-contain"
        >
          {/* Transcoded MP4 first (plays MOV/HEVC uploads), raw file fallback. */}
          <source src={toAutoVideoUrl(url)} />
          <source src={url} />
          Your browser does not support the video tag.
        </video>
        <WatermarkLogo position="top-right" size="sm" />
      </div>
    </div>
  );
};

const ImageViewer = ({ url, label, onOpenChange }) => {
  const [open, setOpen] = useState(false);

  if (!url) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-muted-foreground italic">Not provided</p>
      </div>
    );
  }

  const set = (v) => {
    setOpen(v);
    onOpenChange?.(v);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div
        className="relative group cursor-pointer rounded-lg overflow-hidden border"
        onClick={() => set(true)}
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
          onClick={() => set(false)}
          data-media-lightbox="true"
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-white/80 z-10"
            onClick={() => set(false)}
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

export { VideoPlayer, ImageViewer };
