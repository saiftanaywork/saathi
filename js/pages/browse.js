import { LANGUAGES, LANGUAGE_SCRIPT, CITIES, CARE_TYPES, escapeAttr, searchIcon, filterIcon, gridIcon, listIcon } from "../constants.js";
import { CaregiverCard, attachFavoriteHandlers } from "../components/caregiverCard.js";
import { fetchCaregivers, matchCaregivers, logSearch, listFavoriteIds, toggleFavorite } from "../api.js";
import { isSignedIn, isFamily, getSession } from "../auth.js";

const state = {
  caregivers: [],
  loading: true,
  filters: { q: "", languages: new Set(), cities: new Set(), careTypes: new Set(), minRate: "", maxRate: "" },
  view: "grid",
  favorites: new Set(),
  recommended: [],
  recommendedLoading: false,
};
let searchLogTimer = null;

function filteredCaregivers() {
  const f = state.filters;
  const q = f.q.trim().toLowerCase();
  return state.caregivers.filter((cg) => {
    if (f.languages.size && ![...f.languages].some((l) => cg.languages.includes(l))) return false;
    if (f.cities.size && !f.cities.has(cg.city)) return false;
    if (f.careTypes.size && ![...f.careTypes].some((t) => cg.careTypes.includes(t))) return false;
    if (f.minRate !== "" && cg.rate < Number(f.minRate)) return false;
    if (f.maxRate !== "" && cg.rate > Number(f.maxRate)) return false;
    if (q) {
      const hay = [cg.name, cg.headline, cg.bio, cg.city].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function scheduleSearchLog() {
  if (!isSignedIn() || !isFamily()) return;
  clearTimeout(searchLogTimer);
  searchLogTimer = setTimeout(() => {
    const f = state.filters;
    if (!f.languages.size && !f.cities.size && !f.careTypes.size && f.minRate === "" && f.maxRate === "") return;
    logSearch({
      familyId: getSession().user.id,
      languages: [...f.languages],
      cities: [...f.cities],
      careTypes: [...f.careTypes],
      minRate: f.minRate,
      maxRate: f.maxRate,
    }).then(refreshRecommended).catch(() => {});
  }, 900);
}

async function refreshRecommended() {
  if (!isSignedIn() || !isFamily()) {
    state.recommended = [];
    return;
  }
  state.recommendedLoading = true;
  renderResults();
  const f = state.filters;
  try {
    state.recommended = await matchCaregivers({
      languages: [...f.languages],
      cities: [...f.cities],
      careTypes: [...f.careTypes],
      minRate: f.minRate === "" ? null : Number(f.minRate),
      maxRate: f.maxRate === "" ? null : Number(f.maxRate),
      familyId: getSession().user.id,
    });
    state.recommended = state.recommended.slice(0, 6);
  } catch {
    state.recommended = [];
  }
  state.recommendedLoading = false;
  renderResults();
}

export function BrowsePage() {
  return `
  <section class="browse-head">
    <div class="container">
      <h1>Browse caregivers</h1>
      <p id="resultsCount">${state.caregivers.length} listings across the Dallas–Fort Worth area.</p>
      <div class="search-row">
        <div class="search-input-wrap">
          ${searchIcon()}
          <input type="text" class="search-input" id="searchInput" placeholder="Search by name, specialty, or keyword..." value="${escapeAttr(state.filters.q)}">
        </div>
        <button class="btn btn-ghost filters-toggle-btn" id="filtersToggle">${filterIcon()} Filters</button>
      </div>
    </div>
  </section>
  <section class="container browse-layout">
    <aside class="filters-panel" id="filtersPanel">
      ${FilterGroup("Language", LANGUAGES.map((l) => ({ value: l, label: l, script: LANGUAGE_SCRIPT[l] })), state.filters.languages, "language")}
      ${FilterGroup("City", CITIES.map((c) => ({ value: c, label: c })), state.filters.cities, "city")}
      ${FilterGroup("Care type", Object.entries(CARE_TYPES).map(([v, label]) => ({ value: v, label })), state.filters.careTypes, "careType")}
      <div class="filter-group">
        <div class="filter-group-title">Hourly rate</div>
        <div class="rate-inputs">
          <input type="number" min="0" id="minRate" placeholder="Min" value="${escapeAttr(state.filters.minRate)}">
          <span>–</span>
          <input type="number" min="0" id="maxRate" placeholder="Max" value="${escapeAttr(state.filters.maxRate)}">
        </div>
      </div>
      <button class="filters-clear" id="clearFilters">Clear all filters</button>
    </aside>
    <div>
      <div class="results-bar">
        <span id="resultsBarCount"></span>
        <div class="view-toggle" id="viewToggle">
          <button data-view="grid" class="${state.view === "grid" ? "is-active" : ""}">${gridIcon()} Gallery</button>
          <button data-view="list" class="${state.view === "list" ? "is-active" : ""}">${listIcon()} List</button>
        </div>
      </div>
      <div id="resultsArea"></div>
    </div>
  </section>
  `;
}

function FilterGroup(title, options, selectedSet, dataKey) {
  return `
  <div class="filter-group">
    <div class="filter-group-title">${title}</div>
    <div class="filter-options">
      ${options
        .map(
          (opt) => `
        <label class="filter-check">
          <input type="checkbox" data-filter="${dataKey}" value="${escapeAttr(opt.value)}" ${selectedSet.has(opt.value) ? "checked" : ""}>
          ${opt.label}
          ${opt.script ? `<span class="script">${opt.script}</span>` : ""}
        </label>`
        )
        .join("")}
    </div>
  </div>`;
}

function RecommendedRail() {
  if (!isSignedIn() || !isFamily()) return "";
  if (state.recommendedLoading) {
    return `<div class="recommended-rail"><div class="recommended-rail-head"><h2>Recommended for you</h2></div><p style="color:var(--ink-faint);">Finding matches...</p></div>`;
  }
  if (!state.recommended.length) return "";
  return `
  <div class="recommended-rail">
    <div class="recommended-rail-head">
      <h2>Recommended for you</h2>
      <p>Ranked by your filters and search history</p>
    </div>
    <div class="recommended-scroll">
      ${state.recommended.map((cg) => CaregiverCard(cg, { mode: "grid", isFav: state.favorites.has(cg.id) })).join("")}
    </div>
  </div>`;
}

function renderResults() {
  const area = document.getElementById("resultsArea");
  if (!area) return;
  const results = filteredCaregivers();
  const countEl = document.getElementById("resultsBarCount");
  if (countEl) countEl.textContent = state.loading ? "Loading..." : `${results.length} result${results.length === 1 ? "" : "s"}`;

  const rail = RecommendedRail();
  const body = state.loading
    ? `<p style="padding:40px 0;color:var(--ink-faint);">Loading caregivers...</p>`
    : results.length === 0
    ? `<div class="empty-state"><h3>No caregivers match those filters</h3><p>Try widening your search or clearing a filter.</p></div>`
    : state.view === "grid"
    ? `<div class="results-grid">${results.map((cg) => CaregiverCard(cg, { mode: "grid", isFav: state.favorites.has(cg.id) })).join("")}</div>`
    : `<div class="results-list">${results.map((cg) => CaregiverCard(cg, { mode: "list", isFav: state.favorites.has(cg.id) })).join("")}</div>`;

  area.innerHTML = rail + body;
  attachFavoriteHandlers(area, handleFavoriteToggle);
}

async function handleFavoriteToggle(caregiverId, btn) {
  if (!isSignedIn()) {
    location.hash = "#/login";
    return;
  }
  const isFav = state.favorites.has(caregiverId);
  try {
    await toggleFavorite(getSession().user.id, caregiverId, !isFav);
    if (isFav) state.favorites.delete(caregiverId);
    else state.favorites.add(caregiverId);
    renderResults();
  } catch {
    // ignore transient failures
  }
}

export async function mountBrowsePage() {
  state.loading = true;
  renderResults();

  const [caregivers, favorites] = await Promise.all([
    fetchCaregivers().catch(() => []),
    isSignedIn() ? listFavoriteIds(getSession().user.id).catch(() => new Set()) : Promise.resolve(new Set()),
  ]);
  state.caregivers = caregivers;
  state.favorites = favorites;
  state.loading = false;

  const totalEl = document.getElementById("resultsCount");
  if (totalEl) totalEl.textContent = `${state.caregivers.length} listings across the Dallas–Fort Worth area.`;
  renderResults();
  refreshRecommended();

  document.getElementById("searchInput")?.addEventListener("input", (e) => {
    state.filters.q = e.target.value;
    renderResults();
  });
  document.getElementById("minRate")?.addEventListener("input", (e) => {
    state.filters.minRate = e.target.value;
    renderResults();
    scheduleSearchLog();
  });
  document.getElementById("maxRate")?.addEventListener("input", (e) => {
    state.filters.maxRate = e.target.value;
    renderResults();
    scheduleSearchLog();
  });
  document.querySelectorAll("[data-filter]").forEach((input) => {
    input.addEventListener("change", (e) => {
      const key = e.target.getAttribute("data-filter");
      const set = key === "language" ? state.filters.languages : key === "city" ? state.filters.cities : state.filters.careTypes;
      if (e.target.checked) set.add(e.target.value);
      else set.delete(e.target.value);
      renderResults();
      scheduleSearchLog();
    });
  });
  document.getElementById("clearFilters")?.addEventListener("click", () => {
    state.filters = { q: "", languages: new Set(), cities: new Set(), careTypes: new Set(), minRate: "", maxRate: "" };
    document.getElementById("filtersPanel").querySelectorAll("input[type=checkbox]").forEach((i) => (i.checked = false));
    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.value = "";
    const minRate = document.getElementById("minRate");
    if (minRate) minRate.value = "";
    const maxRate = document.getElementById("maxRate");
    if (maxRate) maxRate.value = "";
    renderResults();
  });
  document.getElementById("filtersToggle")?.addEventListener("click", () => {
    document.getElementById("filtersPanel")?.classList.toggle("is-open");
  });
  document.getElementById("viewToggle")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-view]");
    if (!btn) return;
    state.view = btn.getAttribute("data-view");
    document.querySelectorAll("#viewToggle button").forEach((b) => b.classList.toggle("is-active", b === btn));
    renderResults();
  });
}
