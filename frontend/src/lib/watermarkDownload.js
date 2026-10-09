/**
 * Downloads a vendor-uploaded image with the website logo burned in.
 *
 * The on-screen watermark is a DOM overlay (see components/media/WatermarkLogo),
 * so it is NOT part of the original file. To hand the user the same picture they
 * see, the image is redrawn on a canvas together with /logo.png at the matching
 * position, then saved from the canvas.
 *
 * Videos are not handled here: burning a logo into a video needs server-side
 * transcoding (ffmpeg), a browser cannot do it reliably.
 */

const LOGO_SRC = "/logo.png";

const loadImage = (src, cors) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });

/** Fetches the bytes first so Cloudinary's CORS headers keep the canvas clean. */
const loadImageBytes = async (src) => {
  try {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (typeof createImageBitmap === "function") {
      return createImageBitmap(blob);
    }
    return loadImage(URL.createObjectURL(blob), false);
  } catch (err) {
    // Same-origin assets (/logo.png) or a host without CORS: try a plain image.
    return loadImage(src, true);
  }
};

const roundRect = (ctx, x, y, w, h, r) => {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const extensionOf = (url) => {
  const clean = String(url).split("?")[0].split("#")[0];
  const m = clean.match(/\.([a-z0-9]{2,5})$/i);
  return m ? m[1].toLowerCase() : "";
};

const baseNameOf = (url) => {
  const clean = String(url).split("?")[0].split("#")[0];
  const last = clean.split("/").pop() || "";
  return last.replace(/\.[a-z0-9]{2,5}$/i, "") || "image";
};

/**
 * Composes the image + logo on a canvas.
 * The logo is drawn in the middle of the image (centred horizontally and
 * vertically) with a low opacity, mirroring the on-screen overlay. A legacy
 * `position` option is still accepted and ignored.
 */
export const composeWatermarked = async (src, { logoSrc = LOGO_SRC } = {}) => {
  const [image, logo] = await Promise.all([loadImageBytes(src), loadImageBytes(logoSrc)]);

  const width = image.width || image.naturalWidth;
  const height = image.height || image.naturalHeight;
  if (!width || !height) throw new Error("Image has no dimensions");

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  // Mirror the overlay proportions: ~16% of the image width, with breathing room.
  const logoW = Math.min(Math.max(width * 0.16, 56), 180, width * 0.45);
  const logoH = (logo.height / logo.width) * logoW;
  const pad = Math.min(Math.max(width * 0.02, 8), 24);
  const platePad = pad * 0.75;

  // Exact centre of the media: horizontal + vertical.
  const x = (width - logoW) / 2;
  const y = (height - logoH) / 2;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = Math.max(2, width * 0.004);
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  roundRect(ctx, x - platePad, y - platePad, logoW + platePad * 2, logoH + platePad * 2, Math.max(4, logoW * 0.06));
  ctx.fill();
  ctx.restore();

  // Low opacity so the watermark stays subtle.
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.drawImage(logo, x, y, logoW, logoH);
  ctx.restore();
  return canvas;
};

const triggerDownload = (blob, filename) => {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 5000);
};

/**
 * Downloads `src` with the logo burned in.
 * Falls back to the original file if the canvas path fails (CORS, etc.) so the
 * button always delivers something.
 *
 * @returns {Promise<{watermarked: boolean}>}
 */
export const downloadImageWithWatermark = async (src, { filename, logoSrc = LOGO_SRC } = {}) => {
  const outName =
    filename ||
    `${baseNameOf(src)}-the-local-printer.${extensionOf(src) === "png" ? "png" : "jpg"}`;

  let watermarked = false;
  let canvas = null;
  try {
    canvas = await composeWatermarked(src, { logoSrc });
    watermarked = true;
  } catch (err) {
    console.warn("Watermark compose failed, downloading the original file:", err);
  }

  if (canvas) {
    const type = extensionOf(src) === "png" ? "image/png" : "image/jpeg";
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.95));
    if (blob) {
      const finalName =
        type === "image/png"
          ? outName.replace(/\.[a-z0-9]+$/i, "") + ".png"
          : outName.replace(/\.[a-z0-9]+$/i, "") + ".jpg";
      triggerDownload(blob, finalName);
      return { watermarked };
    }
  }

  const res = await fetch(src, { mode: "cors" });
  if (!res.ok) throw new Error(`Could not download ${src}`);
  triggerDownload(await res.blob(), outName);
  return { watermarked: false };
};

export default downloadImageWithWatermark;
