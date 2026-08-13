// Static reference data + small presentation helpers shared across pages.
// Kept close to the original artifact's data.js.

export const LANGUAGE_SCRIPT = {
  Hindi: "हिंदी",
  Telugu: "తెలుగు",
  Tamil: "தமிழ்",
  Gujarati: "ગુજરાતી",
  Punjabi: "ਪੰਜਾਬੀ",
  Malayalam: "മലയാളം",
  English: "English",
};

export const LANGUAGES = Object.keys(LANGUAGE_SCRIPT);

export const CITIES = ["Irving", "Plano", "Frisco", "Richardson", "Carrollton"];

// Approximate city-center coordinates for the map view. Caregiver listings
// only store a city, not a street address, so each pin is jittered
// deterministically (below) rather than placed at an exact address.
export const CITY_COORDS = {
  Irving: [32.814, -96.9489],
  Plano: [33.0198, -96.6989],
  Frisco: [33.1507, -96.8236],
  Richardson: [32.9483, -96.7299],
  Carrollton: [32.9756, -96.8899],
};

// Deterministic per-id jitter (~1-2km) so multiple caregivers in the same
// city don't stack on exactly one pin, but a given caregiver's pin stays
// put across reloads.
export function jitteredCoords(city, id) {
  const base = CITY_COORDS[city];
  if (!base) return null;
  let hash = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  const angle = (hash % 360) * (Math.PI / 180);
  const dist = 0.008 + ((hash >> 8) % 100) / 100 * 0.012; // ~0.9km-2.2km
  return [base[0] + Math.cos(angle) * dist, base[1] + Math.sin(angle) * dist];
}

export const CARE_TYPES = {
  elder: "Elder care",
  dementia: "Dementia care",
  postpartum: "Postpartum & newborn care",
  companionship: "Companionship",
  housekeeping: "Light housekeeping",
  driving: "Driving & errands",
  livein: "Live-in",
  hourly: "Hourly / flexible",
};

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
export const escapeAttr = escapeHtml;

export function icon(inner, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
export const searchIcon = () => icon(`<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>`);
export const filterIcon = () => icon(`<path d="M4 6h16M7 12h10M10 18h4"/>`);
export const menuIcon = () => icon(`<path d="M4 7h16M4 12h16M4 17h16"/>`);
export const closeIcon = () => icon(`<path d="M6 6l12 12M18 6L6 18"/>`);
export const checkIcon = () => icon(`<path d="M5 13l4 4L19 7"/>`);
export const chevronLeftIcon = () => icon(`<path d="M15 18l-6-6 6-6"/>`);
export const pinIcon = () => icon(`<path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.3"/>`);
export const clockIcon = () => icon(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>`);
export const shieldIcon = () => icon(`<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/>`, 22);
export const uploadIcon = () => icon(`<path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>`);
export const heartIcon = () => icon(`<path d="M12 20s-7-4.35-9.5-8.5C.8 8 2.2 4.5 5.6 4c2-.3 3.7.7 4.9 2.3C11.7 4.7 13.4 3.7 15.4 4c3.4.5 4.8 4 3.1 7.5C16 15.65 12 20 12 20z"/>`);
export const leafIcon = () => icon(`<path d="M5 20c8 0 14-6 14-14V4h-2C9 4 5 10 5 18v2z"/><path d="M5 20c2-4 4-7 8-10"/>`);
export const sunIcon = () => icon(`<circle cx="12" cy="12" r="4.3"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>`);
export const gridIcon = () => icon(`<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>`, 16);
export const listIcon = () => icon(`<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>`, 16);
export const starIcon = (filled) => icon(`<path d="M12 3.5l2.6 5.4 5.9.7-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9-4.3-4.1 5.9-.7z" ${filled ? 'fill="currentColor"' : ""}/>`, 17);

const AVATAR_ACCENTS = ["terracotta", "teal", "ochre", "rose", "moss"];

export function initialsFor(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

export function accentFor(name) {
  let hash = 0;
  const s = String(name || "");
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_ACCENTS[hash % AVATAR_ACCENTS.length];
}

export function BrandMark() {
  return `<svg class="brand-mark" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="20" r="13" fill="#BD5B39" opacity="0.9"/>
    <circle cx="26" cy="20" r="13" fill="#2F4A52" opacity="0.85"/>
  </svg>`;
}
