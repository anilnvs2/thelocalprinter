// Saved (auto-detected or manually entered) location for the public site.
// Persisted in localStorage so it survives refresh, and only replaced by the
// user typing/clearing it themselves.

const LOCATION_KEY = "tlp_location";
const MANUAL_KEY = "tlp_location_manual";
const EVENT_NAME = "tlp-location-changed";

// Auto-detect happens at most once per page load. Kept in memory (NOT
// localStorage) on purpose: clearing the field blocks detection for the rest
// of this visit, while a reload/refresh starts fresh and detects again.
let geoAttempted = false;

const canUseDom = () => typeof window !== "undefined";

function emit(city, origin, reset) {
  if (!canUseDom()) return;
  try {
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, { detail: { city, origin: origin || "", reset: !!reset } })
    );
  } catch {
    /* noop */
  }
}

export function readSavedLocation() {
  if (!canUseDom()) return null;
  try {
    const raw = window.localStorage.getItem(LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const city = typeof parsed?.city === "string" ? parsed.city.trim() : "";
    if (!city) return null;
    return {
      city,
      lat: typeof parsed.lat === "number" ? parsed.lat : null,
      lng: typeof parsed.lng === "number" ? parsed.lng : null,
      source: parsed.source || "auto",
    };
  } catch {
    return null;
  }
}

export function getSavedCity() {
  return readSavedLocation()?.city || "";
}

export function saveLocation(city, meta = {}, origin = "") {
  if (!canUseDom()) return;
  const value = (city || "").trim();
  if (!value) {
    clearLocation(origin);
    return;
  }
  const payload = {
    city: value,
    lat: typeof meta.lat === "number" ? meta.lat : null,
    lng: typeof meta.lng === "number" ? meta.lng : null,
    source: meta.source || "auto",
    at: Date.now(),
  };
  try {
    window.localStorage.setItem(LOCATION_KEY, JSON.stringify(payload));
  } catch {
    /* storage full / blocked */
  }
  emit(value, origin);
}

// Called when the visitor types or picks a suggestion themselves: auto
// detection must never overwrite this afterwards.
export function saveManualLocation(city, origin = "") {
  if (!canUseDom()) return;
  try {
    window.localStorage.setItem(MANUAL_KEY, "1");
  } catch {
    /* noop */
  }
  saveLocation(city, { source: "manual" }, origin);
}

// Manual clear (visitor emptied the field / cleared filters): drop the saved
// location AND the manual flag. Auto-detection is blocked for the rest of this
// page load (geoAttempted), but a reload/refresh starts fresh and detects again.
export function clearLocation(origin = "") {
  if (!canUseDom()) return;
  geoAttempted = true;
  try {
    window.localStorage.removeItem(LOCATION_KEY);
    window.localStorage.removeItem(MANUAL_KEY);
  } catch {
    /* noop */
  }
  emit("", origin, true);
}

export function isManualLocation() {
  if (!canUseDom()) return false;
  try {
    return window.localStorage.getItem(MANUAL_KEY) === "1";
  } catch {
    return false;
  }
}

export function hasGeoAttempt() {
  return geoAttempted;
}

export function markGeoAttempt() {
  geoAttempted = true;
}

export function onSavedLocationChange(handler) {
  if (!canUseDom()) return () => {};
  const listener = (event) => handler(event?.detail || { city: "", origin: "" });
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}

export function cityFromAddress(address) {
  const a = address || {};
  return (
    a.city ||
    a.town ||
    a.village ||
    a.city_district ||
    a.district ||
    a.county ||
    a.state_district ||
    a.suburb ||
    a.state ||
    ""
  );
}

export async function fetchCityFromCoords(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}`
  );
  const data = await res.json();
  return cityFromAddress(data?.address);
}

// Requests browser geolocation once and resolves with a city name (or "").
export function requestCurrentCity() {
  return new Promise((resolve) => {
    if (!canUseDom() || !navigator.geolocation) {
      resolve("");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const city = await fetchCityFromCoords(
            position.coords.latitude,
            position.coords.longitude
          );
          resolve(city || "");
        } catch {
          resolve("");
        }
      },
      () => resolve(""),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  });
}
