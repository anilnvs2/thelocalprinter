// Shared validation for business payloads (vendor create/update and the
// Print Shop single-selection rule used by the admin edit endpoint).
// Keeps the same rules as the frontend registration form so a required field
// can never be UI-only.
const Category = require("../models/Category");

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const ORDER_LIMIT_VALUES = ["single", "minimum", "bulk", "no_limit"];
const SERVICE_TYPE_VALUES = ["print_only", "full_with_design", "full_without_design"];
const CUSTOMER_TYPE_VALUES = ["b2b", "b2c", "both"];
const ORDERING_METHOD_VALUES = ["on_call", "shop_visit", "both"];

// Same option lists as the registration form (frontend).
const LANGUAGE_OPTIONS = [
  "English", "Hindi", "Telugu", "Tamil", "Kannada",
  "Malayalam", "Marathi", "Gujarati", "Bengali", "Punjabi", "Other",
];

const FILE_FORMAT_OPTIONS = [
  "PDF", "EPS", "CDR", "Open Source", "JPEG", "TIFF", "PNG",
  "AI (Adobe Illustrator)", "PSD (Adobe Photoshop)", "Other",
];

const ADDON_SERVICE_OPTIONS = [
  "Banner Printing", "Visiting Cards", "Pamphlets", "Brochures",
  "Posters", "Stickers", "Vinyl Printing", "Sublimation",
  "Embroidery", "Screen Printing", "Digital Printing", "Offset Printing",
  "3D Printing", "Laser Cutting", "Engraving", "Other",
];

const DESCRIPTION_MIN = 150;
const DESCRIPTION_MAX = 250;

const PRINT_SHOP_NAME_RE = /^print\s*shop$/i;
const PRINT_SHOP_SLUG = "print-shop";

const isString = (v) => typeof v === "string";
const hasText = (v) => isString(v) && v.trim().length > 0;
const isHttpUrl = (v) => isString(v) && /^https?:\/\/\S+$/i.test(v.trim());
const isBoolean = (v) => typeof v === "boolean";

const isPhoneLike = (v) => {
  if (!hasText(v)) return false;
  if (!/^\+?[\d\s\-()]+$/.test(v.trim())) return false;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
};

const isEmailLike = (v) => hasText(v) && /^\S+@\S+\.\S+$/.test(v.trim());

const normalizeName = (v) => (hasText(v) ? v.trim().replace(/\s+/g, " ").toLowerCase() : "");

const looksLikePrintShop = (name, slug) =>
  normalizeName(name) === "print shop" ||
  (hasText(slug) && slug.trim().toLowerCase() === PRINT_SHOP_SLUG);

/**
 * Print Shop allows only one selected service. Everything else keeps the
 * multi-select behaviour.
 */
async function isPrintShopCategory(categoryName, categoryId) {
  if (normalizeName(categoryName) === "print shop") return true;
  if (!categoryId) return false;
  try {
    const cat = await Category.findById(categoryId).select("name slug");
    if (cat && looksLikePrintShop(cat.name, cat.slug)) return true;
  } catch (err) {
    // Invalid id / db unavailable → cannot be the Print Shop rule.
  }
  return false;
}

/**
 * Validates a business payload.
 *  - mode "create": every mandatory field must be present and valid.
 *  - mode "update": only the fields present in `data` are validated, so
 *    partial payloads keep working while any submitted value is still checked.
 * `existing` is the current business (used to resolve the category when the
 * payload does not carry it).
 * Returns an array of human readable error messages (empty when valid).
 */
async function validateBusinessPayload(data, { mode = "create", existing = null } = {}) {
  if (!data || typeof data !== "object") return ["Request body is required"];

  const errors = [];
  const strict = mode === "create";
  const present = (key) => (strict ? true : data[key] !== undefined);

  if (present("name") && !hasText(data.name)) {
    errors.push("Business name is required");
  }

  if (present("description")) {
    const desc = isString(data.description) ? data.description : "";
    const len = desc.trim().length;
    if (len === 0) {
      errors.push("Business description is required");
    } else if (len < DESCRIPTION_MIN) {
      errors.push(`Business description must be at least ${DESCRIPTION_MIN} characters`);
    } else if (len > DESCRIPTION_MAX) {
      errors.push(`Business description must be at most ${DESCRIPTION_MAX} characters`);
    }
  }

  if (present("establishedYear")) {
    const raw = data.establishedYear;
    const year = raw === "" || raw === null || raw === undefined ? NaN : Number(raw);
    const maxYear = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 1900 || year > maxYear) {
      errors.push(`Established year is required and must be between 1900 and ${maxYear}`);
    }
  }

  if (present("workingHours")) {
    const wh = data.workingHours;
    if (!wh || typeof wh !== "object" || Array.isArray(wh)) {
      errors.push("Working hours are required");
    } else {
      const missingDay = DAY_KEYS.some((d) => !wh[d] || typeof wh[d] !== "object");
      if (missingDay) {
        errors.push("Working hours are required for all seven days");
      } else {
        const openDays = DAY_KEYS.filter((d) => wh[d].open === true || wh[d].open === "true");
        if (openDays.length === 0) {
          errors.push("Working hours must mark at least one day as open");
        } else {
          const incomplete = openDays.some(
            (d) => !hasText(wh[d].openingTime) || !hasText(wh[d].closingTime)
          );
          if (incomplete) {
            errors.push("Opening and closing times are required for every open day");
          }
        }
      }
    }
  }

  if (present("contactName") && !hasText(data.contactName)) {
    errors.push("Contact name is required");
  }

  if (present("phone")) {
    if (!hasText(data.phone)) errors.push("Phone number is required");
    else if (!isPhoneLike(data.phone)) errors.push("Please provide a valid phone number");
  }

  if (present("whatsapp")) {
    if (!hasText(data.whatsapp)) errors.push("WhatsApp number is required");
    else if (!isPhoneLike(data.whatsapp)) errors.push("Please provide a valid WhatsApp number");
  }

  if (present("contactEmail")) {
    if (!hasText(data.contactEmail)) errors.push("Email is required");
    else if (!isEmailLike(data.contactEmail)) errors.push("Please provide a valid email address");
  }

  if (present("category") && !hasText(data.category)) {
    errors.push("Business category is required");
  }

  if (present("address") && !hasText(data.address)) {
    errors.push("Address is required");
  }

  if (present("city") && !hasText(data.city)) {
    errors.push("City is required");
  }

  if (present("orderLimits") && !ORDER_LIMIT_VALUES.includes(data.orderLimits)) {
    errors.push("Order quantity preference is required");
  }

  if (present("serviceType") && !SERVICE_TYPE_VALUES.includes(data.serviceType)) {
    errors.push("Service type is required");
  }

  if (present("customerType") && !CUSTOMER_TYPE_VALUES.includes(data.customerType)) {
    errors.push("Target customers is required");
  }

  if (present("orderingMethod") && !ORDERING_METHOD_VALUES.includes(data.orderingMethod)) {
    errors.push("Order acceptance method is required");
  }

  if (present("paymentModes")) {
    const modes = Array.isArray(data.paymentModes) ? data.paymentModes.filter(hasText) : [];
    if (modes.length === 0) errors.push("Accepted payment methods are required");
  }

  if (present("verificationMedia")) {
    const vm = data.verificationMedia && typeof data.verificationMedia === "object"
      ? data.verificationMedia
      : {};
    const requiredMedia = [
      ["machineryWorkingVideo", "Machinery working video"],
      ["completeOutletVideo", "Complete outlet video"],
      ["outdoorStoreImage", "Outdoor store image"],
      ["indoorStoreImage", "Indoor store image"],
    ];
    requiredMedia.forEach(([key, label]) => {
      if (!isHttpUrl(vm[key])) errors.push(`${label} is required`);
    });
    const thumbs = Array.isArray(vm.thumbnailImages) ? vm.thumbnailImages.filter(isHttpUrl) : [];
    if (thumbs.length === 0) errors.push("Thumbnail / slideshow images are required");
  }

  if (present("languages")) {
    const langs = Array.isArray(data.languages) ? data.languages.filter(hasText) : [];
    if (langs.length === 0) {
      errors.push("Communication languages are required");
    } else if (langs.includes("Other") && langs.filter((l) => l.trim() !== "Other").length === 0) {
      errors.push("Please enter your custom communication language");
    } else if (
      langs.some((l) => !LANGUAGE_OPTIONS.includes(l.trim())) &&
      !langs.includes("Other")
    ) {
      errors.push('Please select "Other" to save a custom communication language');
    }
  }

  if (present("replaceMistakesAtNoCharge")) {
    const answer = isString(data.replaceMistakesAtNoCharge)
      ? data.replaceMistakesAtNoCharge.trim()
      : "";
    if (answer !== "Yes" && answer !== "No") {
      errors.push(
        'If any mistakes happen from your end, after approval of the customer will you replace them on with no charge? Please answer "Yes" or "No"'
      );
    }
  }

  if (present("inHouseDesignerAvailable") && !isBoolean(data.inHouseDesignerAvailable)) {
    errors.push("In-house designer availability is required (Yes / No)");
  }

  if (present("customerLocationVisitAvailable") && !isBoolean(data.customerLocationVisitAvailable)) {
    errors.push("Customer location visit availability is required (Yes / No)");
  }

  if (present("sampleDisplayAvailable") && !isBoolean(data.sampleDisplayAvailable)) {
    errors.push("Sample / display availability is required (Yes / No)");
  }

  if (present("acceptsPurchaseOrder") && !isBoolean(data.acceptsPurchaseOrder)) {
    errors.push("Accept purchase orders preference is required (Yes / No)");
  }

  if (present("addonServices")) {
    const list = Array.isArray(data.addonServices) ? data.addonServices : [];
    const custom = list.filter(
      (v) => hasText(v) && v.trim() !== "Other" && !ADDON_SERVICE_OPTIONS.includes(v.trim())
    );
    if (list.includes("Other") && custom.length === 0) {
      errors.push("Please enter your custom add-on service");
    }
  }

  if (present("preferredFileFormats")) {
    const list = Array.isArray(data.preferredFileFormats)
      ? data.preferredFileFormats.filter(hasText)
      : [];
    if (list.length === 0) {
      errors.push("Preferred file formats are required");
    } else if (list.includes("Other") && list.filter((v) => v.trim() !== "Other").length === 0) {
      errors.push("Please enter your custom file format");
    } else if (
      list.some((v) => !FILE_FORMAT_OPTIONS.includes(v.trim())) &&
      !list.includes("Other")
    ) {
      errors.push('Please select "Other" to save a custom file format');
    }
  }

  // Print Shop: a business may hold only one selected service.
  if (present("serviceIds")) {
    const ids = Array.isArray(data.serviceIds) ? data.serviceIds : [];
    if (ids.length > 1) {
      const categoryName = data.category !== undefined
        ? data.category
        : existing
        ? existing.category
        : "";
      const categoryId = data.categoryId !== undefined
        ? data.categoryId
        : existing
        ? existing.categoryId
        : null;
      if (await isPrintShopCategory(categoryName, categoryId)) {
        errors.push(
          "Print Shop businesses can select only one service. Please choose a single service."
        );
      }
    }
  }

  return errors;
}

/**
 * Narrow rule used by the admin business edit endpoint: the admin form must
 * not be able to store a Print Shop selection state that contradicts the
 * vendor registration form / backend rule.
 */
async function validatePrintShopSelection(data, existing = null) {
  if (!data || typeof data !== "object" || data.serviceIds === undefined) return [];
  const ids = Array.isArray(data.serviceIds) ? data.serviceIds : [];
  if (ids.length <= 1) return [];

  const categoryName = data.category !== undefined ? data.category : existing ? existing.category : "";
  const categoryId = data.categoryId !== undefined ? data.categoryId : existing ? existing.categoryId : null;

  if (await isPrintShopCategory(categoryName, categoryId)) {
    return [
      "Print Shop businesses can select only one service. Please choose a single service.",
    ];
  }
  return [];
}

module.exports = {
  validateBusinessPayload,
  validatePrintShopSelection,
  isPrintShopCategory,
  DESCRIPTION_MIN,
  DESCRIPTION_MAX,
};
