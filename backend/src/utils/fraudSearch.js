const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toDigits = (value) => String(value || "").replace(/\D/g, "");

// Canonical phone form: formatting (spaces, hyphens, parentheses, dots) is
// stripped and a leading country / trunk prefix is dropped by keeping only
// the last 10 digits when the number is longer. Comparisons always use this
// form so "+91 98765-43210", "09876543210" and "98765 43210" all line up,
// while unrelated numbers can never match on a few shared digits alone.
const canonicalPhone = (value) => {
  const digits = toDigits(value);
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const phoneMatches = (storedNumber, query) => {
  const stored = canonicalPhone(storedNumber);
  const queryDigits = toDigits(query);
  if (!stored || !queryDigits) return false;
  const target = canonicalPhone(query);
  if (!target) return false;
  if (stored === target) return true;
  // Partial tail match is allowed only once enough digits are typed (>= 6)
  // so short fragments never flag unrelated numbers.
  if (queryDigits.length >= 6 && stored.endsWith(target)) return true;
  return false;
};

const nameMatches = (storedName, query) => {
  const name = String(storedName || "").trim().toLowerCase();
  const q = String(query || "").trim().toLowerCase();
  return !!name && !!q && name.includes(q);
};

const escapeRegExp = escapeRegex;

// Decides how the UI should phrase its verdict: a query made of digits and
// common phone punctuation is a number search, anything else is a name search.
const classifyQuery = (query) => {
  const q = String(query || "").trim();
  if (!q) return null;
  const digits = toDigits(q);
  if (digits.length >= 4 && /^\+?[\d\s\-().]+$/.test(q)) return "number";
  return "name";
};

const matchesSearch = (entry, query) =>
  nameMatches(entry?.contactName, query) || phoneMatches(entry?.contactNumber, query);

// Flattens the embedded fraudReport arrays of Business documents into one
// list of report entries. Only this dataset is ever searched — never users,
// vendors, business contacts or any other collection.
const flattenFraudEntries = (businesses) => {
  const entries = [];
  (businesses || []).forEach((business) => {
    const raw = business?.fraudReport;
    const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : [];
    list.forEach((entry, idx) => {
      if (!entry || typeof entry !== "object") return;
      const contactName = String(entry.contactName || "").trim();
      const designation = String(entry.designation || "").trim();
      const contactNumber = String(entry.contactNumber || "").trim();
      if (!contactName && !designation && !contactNumber) return;
      entries.push({
        reportId: `${business._id}:${idx}`,
        businessId: business._id,
        businessName: business.name || "",
        contactName,
        designation,
        contactNumber,
        createdAt: business.createdAt,
      });
    });
  });
  return entries;
};

const filterFraudEntries = (entries, query) => {
  const q = String(query || "").trim();
  if (!q) return entries;
  return (entries || []).filter((entry) => matchesSearch(entry, q));
};

// Standard pagination used by the fraud report list. Limit is capped at 10
// (the product requirement for this screen).
const paginateFraudEntries = (entries, page, limit = 10) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 10);
  const total = (entries || []).length;
  const pages = Math.max(Math.ceil(total / safeLimit), 1);
  const safePage = Math.min(Math.max(parseInt(page, 10) || 1, 1), pages);
  const start = (safePage - 1) * safeLimit;
  return {
    items: (entries || []).slice(start, start + safeLimit),
    pagination: { page: safePage, limit: safeLimit, total, pages },
  };
};

module.exports = {
  escapeRegex,
  escapeRegExp,
  toDigits,
  canonicalPhone,
  phoneMatches,
  nameMatches,
  matchesSearch,
  classifyQuery,
  flattenFraudEntries,
  filterFraudEntries,
  paginateFraudEntries,
};
