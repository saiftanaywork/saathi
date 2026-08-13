import { escapeHtml, CARE_TYPES, pinIcon, clockIcon, shieldIcon, starIcon, chevronLeftIcon } from "../constants.js";
import { fetchCaregiverById, toggleFavorite, isFavorite } from "../api.js";
import { openContactModal } from "../components/modal.js";
import { isSignedIn, getSession } from "../auth.js";

export function ProfilePage() {
  return `<div class="container" id="profileArea" style="padding:40px 0 80px;">Loading...</div>`;
}

export async function mountProfilePage(id) {
  const area = document.getElementById("profileArea");
  if (!area) return;
  const cg = await fetchCaregiverById(id).catch(() => null);
  if (!cg) {
    area.innerHTML = `<div class="empty-state"><h3>Caregiver not found</h3><p><a href="#/browse">Back to browse</a></p></div>`;
    return;
  }
  const fav = isSignedIn() ? await isFavorite(getSession().user.id, cg.id).catch(() => false) : false;

  area.innerHTML = `
    <a href="#/browse" style="display:inline-flex;align-items:center;gap:4px;color:var(--ink-soft);font-size:14px;font-weight:600;margin-bottom:18px;text-decoration:none;">${chevronLeftIcon()} Back to browse</a>
    <div class="profile-head">
      <div class="avatar avatar-lg avatar-${cg.accent}">${escapeHtml(cg.initials)}</div>
      <div style="flex:1;">
        <h1 style="margin-bottom:4px;">${escapeHtml(cg.name)}</h1>
        <p style="color:var(--ink-soft);margin-bottom:10px;">${escapeHtml(cg.headline)}</p>
        <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;font-size:14px;color:var(--ink-soft);">
          <span style="display:inline-flex;align-items:center;gap:5px;">${pinIcon()} ${escapeHtml(cg.city)}</span>
          <span style="display:inline-flex;align-items:center;gap:5px;">${clockIcon()} ${escapeHtml(cg.availability)}</span>
          ${cg.backgroundStatus === "verified" ? `<span class="verified-badge">${shieldIcon()} Verified by Saathi</span>` : ""}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-end;">
        <div class="cg-rate" style="font-size:22px;">$${cg.rate}<span>/hr</span></div>
        <div style="display:flex;gap:8px;">
          <button class="fav-btn ${fav ? "is-fav" : ""}" id="profileFavBtn">${starIcon(fav)}</button>
          <button class="btn btn-primary" id="contactBtn">Contact</button>
        </div>
      </div>
    </div>

    <div class="tag-row" style="margin-bottom:24px;">
      ${cg.languages.map((l) => `<span class="tag tag-lang">${escapeHtml(l)}</span>`).join("")}
      ${cg.careTypes.map((t) => `<span class="tag tag-care">${escapeHtml(CARE_TYPES[t] || t)}</span>`).join("")}
    </div>

    <div style="max-width:70ch;">
      <h3 style="margin-bottom:10px;">About</h3>
      <p style="color:var(--ink-soft);line-height:1.7;">${escapeHtml(cg.bio)}</p>
      <p style="color:var(--ink-faint);font-size:14px;margin-top:14px;">${cg.experienceYears} years of experience</p>
    </div>
  `;

  document.getElementById("contactBtn")?.addEventListener("click", () => openContactModal(cg));
  document.getElementById("profileFavBtn")?.addEventListener("click", async (e) => {
    if (!isSignedIn()) {
      location.hash = "#/login";
      return;
    }
    const btn = e.currentTarget;
    const nowFav = !btn.classList.contains("is-fav");
    try {
      await toggleFavorite(getSession().user.id, cg.id, nowFav);
      btn.classList.toggle("is-fav", nowFav);
      btn.innerHTML = starIcon(nowFav);
    } catch {
      // ignore
    }
  });
}
