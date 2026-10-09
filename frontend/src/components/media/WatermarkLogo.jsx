"use client";

const SIZES = {
  sm: "w-14",
  md: "w-16 sm:w-20",
  lg: "w-24 sm:w-32",
};

/**
 * Default website logo watermark overlay for vendor-uploaded media.
 * Absolutely positioned inside a `relative` media container and centred both
 * horizontally and vertically on the media, with a low opacity so it stays
 * subtle. `pointer-events-none` keeps underlying clicks/controls working.
 *
 * `position` is still accepted so existing callers keep working, but the
 * watermark is always rendered in the middle of the media.
 */
const WatermarkLogo = ({ position = "center", size = "md", className = "" }) => (
  <span
    aria-hidden="true"
    className={`pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 select-none rounded-md bg-white/70 px-1.5 py-1 opacity-60 shadow-sm ring-1 ring-black/5 backdrop-blur-[2px] ${
      SIZES[size] || SIZES.md
    } ${className}`}
  >
    <img
      src="/logo.png"
      alt="The Local Printer"
      draggable={false}
      className="h-auto w-full object-contain"
    />
  </span>
);

export default WatermarkLogo;
