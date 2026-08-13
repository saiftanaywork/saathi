import { LANGUAGES, CITIES, CARE_TYPES, escapeAttr, escapeHtml, shieldIcon, initialsFor, accentFor } from "../constants.js";
import { fetchMyCaregiverProfile, upsertCaregiverProfile, requestBackgroundCheck, fetchMyBackgroundStatus } from "../api.js";
import { getSession, getProfile } from "../auth.js";

let existing = null;

export function ListPage() {
  return `<div class="container" id="listArea" style="padding:40px 0 90px;max-width:640px;">Loading...</div>`;
}

function FormPage(cg) {
  const langs = new Set(cg?.languages || []);
  const cares = new Set(cg?.care_types || []);
  return `
    <h1 style="margin-bottom:6px;">List your services</h1>
    <p style="color:var(--ink-soft);margin-bottom:26px;">This is what families will see when they browse Saathi.</p>
    <div id="listError"></div>
    <form id="listingForm">
      <div class="field">
        <label for="headline">Headline</label>
        <input type="text" id="headline" value="${escapeAttr(cg?.headline || "")}" placeholder="e.g. Patient elder care, especially for memory-related needs" required>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="city">City</label>
          <select id="city" required>
            <option value="">Select a city</option>
            ${CITIES.map((c) => `<option value="${c}" ${cg?.city === c ? "selected" : ""}>${c}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="rate">Hourly rate ($)</label>
          <input type="number" id="rate" min="0" value="${cg?.rate ?? ""}" required>
        </div>
      </div>
      <div class="field">
        <label>Languages</label>
        <div class="filter-options" style="flex-direction:row;flex-wrap:wrap;gap:14px;">
          ${LANGUAGES.map((l) => `<label class="filter-check" style="width:auto;"><input type="checkbox" data-lang value="${l}" ${langs.has(l) ? "checked" : ""}> ${l}</label>`).join("")}
        </div>
      </div>
      <div class="field">
        <label>Care types</label>
        <div class="filter-options" style="flex-direction:row;flex-wrap:wrap;gap:14px;">
          ${Object.entries(CARE_TYPES).map(([v, label]) => `<label class="filter-check" style="width:auto;"><input type="checkbox" data-care value="${v}" ${cares.has(v) ? "checked" : ""}> ${label}</label>`).join("")}
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="experienceYears">Years of experience</label>
          <input type="number" id="experienceYears" min="0" value="${cg?.experience_years ?? ""}" required>
        </div>
        <div class="field">
          <label for="availability">Availability</label>
          <input type="text" id="availability" value="${escapeAttr(cg?.availability || "")}" placeholder="e.g. Weekdays, 8am–6pm" required>
        </div>
      </div>
      <div class="field">
        <label for="bio">About you</label>
        <textarea id="bio" required placeholder="Tell families about your experience...">${escapeHtml(cg?.bio || "")}</textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">${cg ? "Save changes" : "Publish listing"}</button>
      </div>
    </form>
    <div id="bgCheckArea"></div>
  `;
}

function BgCheckPanel(status) {
  if (status === "verified") {
    return `<div class="bg-check-panel"><h3 style="display:flex;align-items:center;gap:8px;">${shieldIcon()} Background check verified</h3><p>Your profile shows a Verified badge to families.</p></div>`;
  }
  if (status === "pending") {
    return `<div class="bg-check-panel"><h3>Background check pending</h3><p>An admin is reviewing your request.</p></div>`;
  }
  return `
    <div class="bg-check-panel">
      <h3>Get a Verified badge</h3>
      <p>Request a Saathi background-check review. An admin verifies your request and, once approved, a Verified badge appears on your public profile.</p>
      <button class="btn btn-secondary" id="requestBgCheck">Request background check</button>
    </div>`;
}

export async function mountListPage() {
  const area = document.getElementById("listArea");
  if (!area) return;
  const session = getSession();
  const profile = getProfile();
  existing = await fetchMyCaregiverProfile(session.user.id).catch(() => null);
  const bgStatus = existing ? await fetchMyBackgroundStatus(session.user.id).catch(() => "none") : "none";

  area.innerHTML = FormPage(existing);
  document.getElementById("bgCheckArea").innerHTML = BgCheckPanel(bgStatus);

  document.getElementById("requestBgCheck")?.addEventListener("click", async (e) => {
    e.target.disabled = true;
    try {
      await requestBackgroundCheck(session.user.id);
      document.getElementById("bgCheckArea").innerHTML = BgCheckPanel("pending");
    } catch (err) {
      e.target.disabled = false;
    }
  });

  document.getElementById("listingForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const languages = [...document.querySelectorAll("[data-lang]:checked")].map((i) => i.value);
    const careTypes = [...document.querySelectorAll("[data-care]:checked")].map((i) => i.value);
    const fullName = profile?.full_name || "";
    const fields = {
      headline: document.getElementById("headline").value.trim(),
      city: document.getElementById("city").value,
      rate: Number(document.getElementById("rate").value),
      languages,
      care_types: careTypes,
      experience_years: Number(document.getElementById("experienceYears").value),
      availability: document.getElementById("availability").value.trim(),
      bio: document.getElementById("bio").value.trim(),
      initials: initialsFor(fullName),
      accent: accentFor(fullName),
    };
    try {
      await upsertCaregiverProfile(session.user.id, fields);
      location.hash = `#/caregiver/${session.user.id}`;
    } catch (err) {
      const el = document.getElementById("listError");
      if (el) el.innerHTML = `<div class="auth-error">${escapeHtml(err.message || "Couldn't save that listing.")}</div>`;
    }
  });
}
