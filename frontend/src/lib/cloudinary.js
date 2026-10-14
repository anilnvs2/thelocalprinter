import api from "../services/api";

const ALLOWED_FOLDERS = {
  machineryVideo: "local-printer/vendor-verification/machinery-videos",
  outletVideo: "local-printer/vendor-verification/outlet-videos",
  outdoorImage: "local-printer/vendor-verification/outdoor-images",
  indoorImage: "local-printer/vendor-verification/indoor-images",
  slideshowImage: "local-printer/vendor-verification/slideshow-images",
  posterBoyWorkMedia: "local-printer/posterboy/work-media",
};

const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "m4v"];
const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/bmp", "image/tiff"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "avif", "heic", "heif"];

const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

function extensionOf(file) {
  const name = typeof file?.name === "string" ? file.name : "";
  const match = name.toLowerCase().match(/\.([a-z0-9]+)(\?.*)?(#.*)?$/);
  return match ? match[1] : "";
}

function getFileCategory(file) {
  if (file?.type && VIDEO_TYPES.includes(file.type)) return "video";
  if (file?.type && IMAGE_TYPES.includes(file.type)) return "image";
  // Some phones/cameras report an empty or generic MIME type — fall back to
  // the file extension so valid files aren't rejected (or mislabelled).
  const ext = extensionOf(file);
  if (VIDEO_EXTENSIONS.includes(ext)) return "video";
  if (IMAGE_EXTENSIONS.includes(ext)) return "image";
  if (file?.type && file.type.startsWith("video/")) return "video";
  if (file?.type && file.type.startsWith("image/")) return "image";
  return null;
}

const PLAYABLE_VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "m4v"];

function validateFile(file, expectedType) {
  if (expectedType === "video") {
    // Only formats browsers can actually decode. AVI/MKV/3GP upload fine to
    // Cloudinary but can never play in a <video> tag — the player hangs on
    // them, so they are rejected up front with a clear message.
    const mimeOk = !!file?.type && VIDEO_TYPES.includes(file.type);
    const ext = extensionOf(file);
    const extOk = PLAYABLE_VIDEO_EXTENSIONS.includes(ext);
    if ((!mimeOk && !extOk) || (mimeOk && ext && !extOk)) {
      return "Please select a valid video file (MP4, WebM, MOV)";
    }
    if (file.size > MAX_VIDEO_SIZE) {
      return "Video file is too large. Maximum size is 100MB";
    }
  } else if (expectedType === "image") {
    if (getFileCategory(file) !== "image") {
      return "Please select a valid image file (JPG, PNG, WebP)";
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return "Image file is too large. Maximum size is 10MB";
    }
  }
  return null;
}

// ── Playback helpers (stored work media) ──────────────────────────────
// Cloudinary delivery URLs for videos that browsers cannot decode
// (MOV/AVI/MKV/3GP…) are rewritten to auto-transcode to MP4 on the fly.
// MP4/WebM already play natively and are left untouched.
const TRANSCODE_VIDEO_URL_RE = /\.(mov|m4v|avi|mkv|3gp|3gpp|ogv)(\?.*)?(#.*)?$/i;

function toPlayableVideoUrl(url) {
  const u = String(url || "");
  if (!TRANSCODE_VIDEO_URL_RE.test(u)) return u;
  return toAutoVideoUrl(u);
}

// Unconditional Cloudinary auto-format delivery for players: the browser
// tries the transcoded (MP4/H.264) source first and falls back to the raw
// file via a second <source> element. This also heals phone recordings
// saved as HEVC-in-MP4, which Chrome cannot decode natively.
function toAutoVideoUrl(url) {
  const u = String(url || "");
  if (u.includes("/video/upload/") && !u.includes("f_auto")) {
    return u.replace("/video/upload/", "/video/upload/f_auto,q_auto/");
  }
  return u;
}

const VIDEO_URL_RE = /\.(mp4|webm|mov|m4v|avi|mkv|3gp|3gpp|ogv|m3u8)(\?.*)?(#.*)?$/i;
const IMAGE_URL_RE = /\.(jpe?g|png|webp|gif|bmp|avif|svg|heic|heif)(\?.*)?(#.*)?$/i;

// The stored resourceType flag is trusted only when the URL itself gives no
// signal — the file extension wins on conflict, so legacy mislabelled rows
// (image flagged as video and vice versa) render correctly without a migration.
function isVideoMedia(m) {
  const url = typeof m === "string" ? m : m?.url || "";
  if (VIDEO_URL_RE.test(url)) return true;
  if (IMAGE_URL_RE.test(url)) return false;
  return (typeof m === "object" ? m?.resourceType : null) === "video";
}

function isImageMedia(m) {
  const url = typeof m === "string" ? m : m?.url || "";
  if (IMAGE_URL_RE.test(url)) return true;
  if (VIDEO_URL_RE.test(url)) return false;
  return (typeof m === "object" ? m?.resourceType : null) === "image";
}

function splitWorkMedia(list) {
  const arr = Array.isArray(list) ? list : [];
  return {
    videos: arr.filter((m) => m?.url && isVideoMedia(m)),
    images: arr.filter((m) => m?.url && isImageMedia(m)),
  };
}

async function getSignedUploadParams(folder, resourceType) {
  const res = await api.post("/upload/upload-signature", {
    folder,
    resource_type: resourceType,
  });
  return res.data;
}

async function uploadToCloudinary(file, folder, resourceType, onProgress) {
  const validationError = validateFile(file, resourceType);
  if (validationError) {
    throw new Error(validationError);
  }

  const signedParams = await getSignedUploadParams(folder, resourceType);

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signedParams.api_key);
    formData.append("timestamp", signedParams.timestamp);
    formData.append("signature", signedParams.signature);
    formData.append("folder", signedParams.folder);

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${signedParams.cloud_name}/${signedParams.resource_type}/upload`,
      true
    );

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && response.secure_url) {
          resolve({
            secure_url: response.secure_url,
            public_id: response.public_id,
            format: response.format,
            resource_type: response.resource_type,
          });
        } else {
          reject(new Error(response.error?.message || "Upload failed"));
        }
      } catch {
        reject(new Error("Upload failed - invalid response from Cloudinary"));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed - network error"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));

    xhr.send(formData);
  });
}

export {
  ALLOWED_FOLDERS,
  VIDEO_TYPES,
  IMAGE_TYPES,
  MAX_VIDEO_SIZE,
  MAX_IMAGE_SIZE,
  validateFile,
  uploadToCloudinary,
  getFileCategory,
  toPlayableVideoUrl,
  toAutoVideoUrl,
  isVideoMedia,
  isImageMedia,
  splitWorkMedia,
};
