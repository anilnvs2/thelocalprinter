const EARTH_RADIUS_KM = 6371;

/** Escape user text used inside $regex so ( ) [ ] + * cannot change meaning. */
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Great-circle distance in km. */
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Distance rounded to 0.1 km. */
const distanceKm = (lat, lng, pointLat, pointLng) =>
  Math.round(haversineKm(lat, lng, pointLat, pointLng) * 10) / 10;

/**
 * True when a usable geo query was supplied (lat + lng + radius > 0).
 * Mutates `query` with the bounding-box pre-filter on lat/lng fields.
 */
const applyGeoBounds = (query, lat, lng, radius, latField, lngField) => {
  const useGeo = lat !== null && lng !== null && radius > 0;
  if (!useGeo) return false;
  const latRad = (lat * Math.PI) / 180;
  const deltaLat = (radius / EARTH_RADIUS_KM) * (180 / Math.PI);
  const deltaLng = deltaLat / Math.cos(latRad);
  query[latField] = { $gte: lat - deltaLat, $lte: lat + deltaLat };
  query[lngField] = { $gte: lng - deltaLng, $lte: lng + deltaLng };
  return true;
};

/** The token a location display string carries as "the city" (before a comma). */
const cityToken = (value) =>
  (String(value).split(",")[0] || "").trim() || String(value).trim();

/**
 * All searchable tokens from a location display string like
 * "Bara Bazar, Kolkata, West Bengal, India" -> ["Bara Bazar", "Kolkata", "West Bengal", "India"].
 * A business stores only City ("Kolkata") + full address, so matching every
 * token (not just the first) lets a locality search find its parent city.
 */
const locationTokens = (value) => {
  const seen = new Set();
  const out = [];
  for (const part of String(value || "").split(",")) {
    const t = part.trim();
    if (t.length < 2) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
};

/**
 * Mongo $or matching ANY location token against `city` OR `address`
 * (case-insensitive substring). Used when there is no geo filter, and as a
 * fallback for documents without GPS coordinates when geo filtering.
 */
const locationTextOr = (tokens) => {
  const or = [];
  for (const t of tokens) {
    const rx = { $regex: escapeRegex(t), $options: "i" };
    or.push({ city: rx }, { address: rx });
  }
  return or;
};

/** JS fallback: does a city/address pair text-match any location token? */
const matchesLocationText = (docCity, docAddress, tokens) => {
  const hay = `${docCity || ""} ${docAddress || ""}`.toLowerCase();
  return tokens.some((t) => t && hay.includes(String(t).toLowerCase()));
};

/**
 * Bounding-box range for a radius search (same math as applyGeoBounds),
 * returned as a clause instead of mutating the query. Pair with the
 * no-GPS branch so documents without coordinates survive the Mongo
 * pre-filter and reach the JS text fallback.
 */
const geoBoundsClause = (lat, lng, radius, latField, lngField) => {
  const latRad = (lat * Math.PI) / 180;
  const deltaLat = (radius / EARTH_RADIUS_KM) * (180 / Math.PI);
  const deltaLng = deltaLat / Math.cos(latRad);
  return {
    [latField]: { $gte: lat - deltaLat, $lte: lat + deltaLat },
    [lngField]: { $gte: lng - deltaLng, $lte: lng + deltaLng },
  };
};

/** $or branch matching documents with missing/unusable GPS coordinates. */
const noGpsClause = (latField, lngField) => ({
  $or: [
    { [latField]: null },
    { [latField]: { $exists: false } },
    { [lngField]: null },
    { [lngField]: { $exists: false } },
  ],
});

module.exports = {
  escapeRegex,
  haversineKm,
  distanceKm,
  applyGeoBounds,
  cityToken,
  locationTokens,
  locationTextOr,
  matchesLocationText,
  geoBoundsClause,
  noGpsClause,
};
