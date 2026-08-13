import { escapeHtml, CARE_TYPES, shieldIcon, starIcon } from "../constants.js";

function tags(cg) {
  const langs = cg.languages.slice(0, 3).map((l) => `<span class="tag tag-lang">${escapeHtml(l)}</span>`).join("");
  const cares = cg.careTypes.slice(0, 2).map((t) => `<span class="tag tag-care">${escapeHtml(CARE_TYPES[t] || t)}</span>`).join("");
  return `<div class="tag-row">${langs}${cares}</div>`;
}

function verifiedBadge(cg) {
  if (cg.backgroundStatus !== "verified") return "";
  return `<span class="verified-badge">${shieldIcon()} Verified</span>`;
}

function matchChip(cg) {
  if (typeof cg.score !== "number") return "";
  return `<span class="match-chip">${starIcon(true)} Recommended for you</span>`;
}

function favButton(cg, isFav) {
  return `<button class="fav-btn ${isFav ? "is-fav" : ""}" data-fav-id="${cg.id}" aria-label="${isFav ? "Remove from saved" : "Save caregiver"}" title="${isFav ? "Saved" : "Save"}">${starIcon(isFav)}</button>`;
}

// mode: "grid" | "list"
export function CaregiverCard(cg, { mode = "grid", isFav = false, showFav = true } = {}) {
  return `
  <div class="cg-card" data-caregiver-card="${cg.id}">
    <a class="cg-card-top" href="#/caregiver/${cg.id}" style="text-decoration:none;color:inherit;flex:1;min-width:0;">
      <div class="avatar avatar-md avatar-${cg.accent}">${escapeHtml(cg.initials)}</div>
      <div style="min-width:0;">
        <div class="cg-name">${escapeHtml(cg.name)}</div>
        <div class="cg-city">${escapeHtml(cg.city)}</div>
      </div>
    </a>
    <div class="cg-card-body">
      ${matchChip(cg)}
      <p class="cg-headline">${escapeHtml(cg.headline)}</p>
      ${tags(cg)}
      ${verifiedBadge(cg)}
    </div>
    <div class="cg-card-foot">
      <div class="cg-rate">$${cg.rate}<span>/hr</span></div>
      <div style="display:flex;align-items:center;gap:10px;">
        ${showFav ? favButton(cg, isFav) : ""}
        <a class="cg-link" href="#/caregiver/${cg.id}">View profile →</a>
      </div>
    </div>
  </div>`;
}

export function attachFavoriteHandlers(container, onToggle) {
  container.querySelectorAll("[data-fav-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onToggle(btn.getAttribute("data-fav-id"), btn);
    });
  });
}
