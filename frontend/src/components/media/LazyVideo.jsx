"use client";

import { useEffect, useRef, useState } from "react";
import { Video as VideoIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Listing tile for a video file. The <video> element (media pipeline +
 * metadata fetch) only mounts once the tile scrolls near the viewport, so a
 * grid of dozens of videos no longer hammers the network/decoder at once —
 * that burst is what froze listing pages. Files that fail to decode are
 * swapped to a static placeholder instead of hanging on a spinner.
 */
const LazyVideo = ({
  src,
  className,
  placeholderClassName,
  muted = true,
  playsInline = true,
  preload = "metadata",
}) => {
  const boxRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <div
        ref={boxRef}
        className={cn(
          "flex h-full w-full items-center justify-center bg-black",
          placeholderClassName
        )}
      >
        <VideoIcon size={20} className="text-white/50" />
      </div>
    );
  }

  if (!visible) {
    return (
      <div
        ref={boxRef}
        className={cn("h-full w-full animate-pulse bg-muted", placeholderClassName)}
      />
    );
  }

  return (
    <div ref={boxRef} className="h-full w-full">
      <video
        src={src}
        muted={muted}
        playsInline={playsInline}
        preload={preload}
        onError={() => setFailed(true)}
        className={cn("pointer-events-none", className)}
      />
    </div>
  );
};

export default LazyVideo;
