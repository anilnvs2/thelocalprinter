/**
 * The 9 core categories (+ their sub-categories) that must ALWAYS be visible in
 * the vendor/admin business forms and the admin category section — even when
 * the API is down or the database has been wiped.
 *
 * Single source of truth: ./categoryDetails.js (same data as the
 * /category-guides/* pages). Nothing is fetched for these.
 *
 * mergeCategories(apiCategories) layers live DB categories on top:
 *   - the 9 static categories always come first, in the order below
 *   - if the DB also has a category with the same name, the DB _id wins and
 *     its sub-categories are merged with the static ones (DB first)
 *   - DB-only categories are appended after the 9
 *   - entries that only exist in this static list carry `isStatic: true`
 *     (they have no DB document, so nothing may edit/delete them)
 */
import { categoryDetails } from "./categoryDetails";

/** Same rule the backend uses (backend/src/models/Category.js pre-save hook). */
export const slugify = (name) =>
  (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Deterministic 24-hex pseudo-ObjectId so static entries work with forms
 *  expecting Mongo-style ids. Never stored as real Category documents. */
const hash32 = (str) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
};

const staticId = (key) => {
  let out = "";
  for (let i = 0; i < 3; i += 1) out += hash32(`${key}:${i}`).toString(16).padStart(8, "0");
  return out.slice(0, 24);
};

const subNames = (detail) =>
  detail.type === "comparison"
    ? detail.columns.slice(1)
    : detail.items || [];

/** The 9 categories, always available, no network needed. */
export const STATIC_CATEGORIES = Object.entries(categoryDetails).map(([slug, detail]) => ({
  _id: staticId(`cat:${slug}`),
  name: detail.label,
  slug,
  description: "",
  image: "",
  isActive: true,
  isStatic: true,
  services: subNames(detail).map((name) => ({
    _id: staticId(`sub:${slug}:${name}`),
    name,
    slug: slugify(name),
    isActive: true,
    isStatic: true,
  })),
}));

const norm = (s) => (s || "").trim().toLowerCase();

/** Slugs of the 9 core categories. DB-backed core categories are fully
 * editable/deletable from the admin; static-only entries (no DB document)
 * carry isStatic:true so they cannot be edited or deleted. */
export const CORE_CATEGORY_SLUGS = Object.keys(categoryDetails);

/** T shirt keeps its hardcoded comparison table, so nothing may be added. */
export const LOCKED_CATEGORY_SLUG = "t-shirt";

export const isCoreCategory = (slug) => CORE_CATEGORY_SLUGS.includes(slug);

/** Static 9 + live API categories, deduped by name. Safe on API failure. */
export function mergeCategories(apiCategories) {
  const api = Array.isArray(apiCategories) ? apiCategories : [];
  const apiByName = new Map();
  api.forEach((cat) => {
    if (cat && cat.name && !apiByName.has(norm(cat.name))) apiByName.set(norm(cat.name), cat);
  });

  const usedApiIds = new Set();
  const merged = STATIC_CATEGORIES.map((stat) => {
    const remote = apiByName.get(norm(stat.name));
    if (!remote || !remote._id) return { ...stat, services: [...stat.services] };
    usedApiIds.add(remote._id);
    const remoteServices = Array.isArray(remote.services) ? remote.services : [];
    const remoteNames = new Set(remoteServices.map((s) => norm(s && s.name)));
    const extraServices = stat.services.filter((s) => !remoteNames.has(norm(s.name)));
    return {
      ...stat,
      ...remote,
      _id: remote._id,
      isStatic: false,
      services: [...remoteServices, ...extraServices],
    };
  });

  const extras = api.filter((cat) => cat && cat._id && !usedApiIds.has(cat._id));
  return [...merged, ...extras];
}
