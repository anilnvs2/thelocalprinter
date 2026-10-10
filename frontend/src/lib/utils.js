import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const slugifySegment = (name) =>
  (name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Pretty business URL: /businesses/{name-slug}-{mongoId} (falls back to id only). */
export function businessHref(business, basePath = "/businesses") {
  const id = typeof business === "object" ? business?._id : business;
  if (!id) return basePath;
  const slug = typeof business === "object" ? slugifySegment(business?.name) : "";
  return slug ? `${basePath}/${slug}-${id}` : `${basePath}/${id}`;
}

/** Pull the real Mongo id out of a "{slug}-{id}" route param (or plain id). */
export function extractBusinessId(param) {
  const m = /([0-9a-fA-F]{24})$/.exec(String(param || ""));
  return m ? m[1] : param;
}
