const Category = require("../models/Category");

const POSTER_BOY_CATEGORY_NAME = "Poster Boy";
const POSTER_BOY_CATEGORY_SLUG = "poster-boy";

// Must stay in sync with the fixed skill options in the poster boy dashboard.
const POSTER_BOY_SKILLS = [
  "Newspaper Inserts",
  "Pasting Boy",
  "Safety Belt Worker",
  "Reckoning Boy",
  "Installation Boy",
  "Distribution Boy",
];

const POSTER_BOY_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><path d="M10 26v12a4 4 0 004 4h6l4 10h6l-4-10h6l14 6V16L26 22H14a4 4 0 00-4 4z" stroke="#F45116" stroke-width="3" stroke-linejoin="round"/><path d="M46 24a10 10 0 010 16" stroke="#F45116" stroke-width="3" stroke-linecap="round"/><path d="M52 18a18 18 0 010 28" stroke="#F45116" stroke-width="3" stroke-linecap="round"/></svg>`;

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Case-insensitive name -> Category id map for a parent's subcategories. */
const getSkillMap = async (parentId) => {
  const subs = await Category.find({ parentId, type: "subcategory" });
  const map = new Map();
  subs.forEach((s) => map.set(String(s.name).toLowerCase(), s._id));
  return map;
};

/** Resolve skill names to subcategory ids. Custom ("Others") skills get no id. */
const resolveSkillIds = (skills, skillMap) =>
  (Array.isArray(skills) ? skills : [])
    .map((name) => skillMap.get(String(name).toLowerCase()))
    .filter(Boolean);

/**
 * Best-effort city extraction used only when the poster boy skipped the GPS
 * button (which is what fills `city` through reverse geocoding).
 * Prefers the segment that carries the PIN code; falls back to the last part.
 */
const deriveCityFromAddress = (address) => {
  const parts = String(address || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";

  const pinIndex = parts.findIndex((p) => /\b\d{6}\b/.test(p));
  if (pinIndex >= 0) {
    const stripped = parts[pinIndex].replace(/\b\d{6}\b/g, "").replace(/\s+/g, " ").trim();
    if (stripped) {
      // "Karnataka 560038" -> the city is the previous segment.
      return parts[pinIndex - 1] || stripped;
    }
    return parts[pinIndex - 1] || "";
  }

  return parts.length >= 2 ? parts[parts.length - 1] : "";
};

module.exports = {
  POSTER_BOY_CATEGORY_NAME,
  POSTER_BOY_CATEGORY_SLUG,
  POSTER_BOY_SKILLS,
  POSTER_BOY_IMAGE,
  slugify,
  getSkillMap,
  resolveSkillIds,
  deriveCityFromAddress,
};
