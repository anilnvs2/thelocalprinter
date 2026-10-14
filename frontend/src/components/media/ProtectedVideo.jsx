"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, AlertTriangle } from "lucide-react";
import WatermarkLogo from "./WatermarkLogo";
import { toAutoVideoUrl } from "../../lib/cloudinary";

const formatTime = (sec) => {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  const m = Math.floor(sec / 60);
  return `${m}:${s}`;
};

/**
 * Protected player for vendor / worker videos.
 *
 * Why it exists: the native <video controls> menu ships a "Download" /
 * three-dot item and the browser allows right-click "Save video as". Here the
 * video is rendered WITHOUT native controls, its own context menu and drag are
 * cancelled, and the only UI left is play/pause, a seek bar and fullscreen.
 *
 * Fullscreen is requested on the wrapper (not the <video>) so the logo overlay
 * stays on screen while the video is fullscreen — the overlay lives inside that
 * wrapper.
 *
 * variant:
 *   "player" — full controls + website watermark (user-facing views)
 *   "thumb"  — silent preview tile (worker upload grid), right-click/drag blocked
 */
const ProtectedVideo = ({ src, label, variant = "player", className = "", videoClassName = "" }) => {
  const wrapRef = useRef(null);
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  // Transcoded MP4 first (plays MOV/HEVC uploads), raw file fallback —
  // without this the browser can't decode them and the player hangs.
  const autoSrc = useMemo(() => toAutoVideoUrl(src), [src]);

  useEffect(() => {
    setFailed(false);
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
  }, [src]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  useEffect(() => () => {
    if (wrapRef.current && document.fullscreenElement === wrapRef.current) {
      document.exitFullscreen?.().catch(() => {});
    }
    // Stop any decode/buffering so nothing survives the close.
    const v = videoRef.current;
    if (v) {
      try {
        v.pause();
        v.removeAttribute("src");
        v.load();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const block = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const togglePlay = (e) => {
    e?.stopPropagation?.();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      v.pause();
    }
  };

  const toggleMute = (e) => {
    e?.stopPropagation?.();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const toggleFullscreen = (e) => {
    e?.stopPropagation?.();
    const el = wrapRef.current;
    if (!el) return;
    const isFs = document.fullscreenElement === el;
    if (isFs) {
      document.exitFullscreen?.().catch(() => {});
      return;
    }
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) {
      try {
        const out = req.call(el);
        if (out && typeof out.catch === "function") out.catch(() => {});
      } catch (err) {
        /* ignore */
      }
    }
  };

  const seek = (e) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    v.currentTime = ratio * duration;
    setCurrent(v.currentTime);
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;
  const isThumb = variant === "thumb";
  const videoClass = isThumb
    ? "absolute inset-0 h-full w-full object-cover"
    : fullscreen
      ? "absolute inset-0 h-full w-full object-contain"
      : "w-full max-h-[300px] object-contain";

  return (
    <div
      ref={wrapRef}
      onContextMenu={block}
      onDragStart={block}
      style={fullscreen ? { backgroundColor: "#000" } : undefined}
      className={`relative overflow-hidden bg-black [user-select:none] [-webkit-user-select:none] ${
        fullscreen ? "h-screen w-screen" : ""
      } ${className}`}
    >
      <video
        ref={videoRef}
        playsInline
        preload="metadata"
        draggable={false}
        controlsList="nodownload noplaybackrate noremoteplayback"
        disablePictureInPicture
        onContextMenu={block}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        className={`block ${videoClass} ${videoClassName}`}
      >
        <source src={autoSrc} />
        {/* Error on the LAST source means every source failed. */}
        <source
          src={src}
          onError={() => {
            setPlaying(false);
            setFailed(true);
          }}
        />
        Your browser does not support the video tag.
      </video>

      {failed && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 bg-black/85 px-3 text-center">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <p className="text-[11px] font-medium text-white/90">
            This video can&apos;t be played here.
          </p>
        </div>
      )}

      {!isThumb && <WatermarkLogo position="top-right" size={fullscreen ? "lg" : "sm"} />}

      {!isThumb && (
        <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2.5 pt-6 pb-2">
          <button
            type="button"
            onClick={seek}
            aria-label={label ? `Seek ${label}` : "Seek"}
            className="mb-2 block h-1.5 w-full cursor-pointer rounded-full bg-white/30 transition-colors hover:bg-white/45"
          >
            <span
              className="block h-full rounded-full bg-white transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? (label ? `Pause ${label}` : "Pause video") : label ? `Play ${label}` : "Play video"}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>

            <span className="text-[11px] font-medium tabular-nums text-white/90">
              {formatTime(current)} / {formatTime(duration)}
            </span>

            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? "Unmute" : "Mute"}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
              >
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProtectedVideo;
