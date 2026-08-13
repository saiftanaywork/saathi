import { LANGUAGES, CITIES, CARE_TYPES, escapeAttr, escapeHtml, shieldIcon, uploadIcon, initialsFor, accentFor } from "../constants.js";
import {
  fetchMyCaregiverProfile,
  upsertCaregiverProfile,
  requestBackgroundCheck,
  fetchMyBackgroundStatus,
  uploadAvatar,
  uploadVerificationDocument,
  listMyDocuments,
} from "../api.js";
import { getSession, getProfile } from "../auth.js";

let existing = null;
let photoUrl = null;

const STEPS = ["Basics", "Languages & care", "Experience", "About you", "Get verified"];
let step = 0;
let draft = {};

export function ListPage() {
  return `<div class="container" id="listArea" style="padding:40px 0 90px;">Loading...</div>`;
}

export async function mountListPage() {
  const area = document.getElementById("listArea");
  if (!area) return;
  const session = getSession();
  existing = await fetchMyCaregiverProfile(session.user.id).catch(() => null);

  if (existing) {
    photoUrl = existing.photo_url || null;
    mountEditForm(area, existing, session);
    return;
  }

  // First-time listing: a care.com-style guided, multi-step wizard.
  step = 0;
  draft = { languages: [], careTypes: [] };
  photoUrl = null;
  renderWizard(area, session);
}

/* ================= edit mode (existing listing) ================= */

function EditFormPage(cg) {
  const langs = new Set(cg?.languages || []);
  const cares = new Set(cg?.care_types || []);
  return `
    <div style="max-width:640px;">
    <h1 style="margin-bottom:6px;">Your listing</h1>
    <p style="color:var(--ink-soft);margin-bottom:26px;">This is what families see when they browse Saathi.</p>
    <div id="listError"></div>
    <form id="listingForm">
      <div class="field">
        <label>Photo</label>
        ${PhotoUploadField()}
      </div>
      <div class="field">
        <label for="headline">Headline</label>
        <input type="text" id="headline" value="${escapeAttr(cg?.headline || "")}" required>
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
          <input type="text" id="availability" value="${escapeAttr(cg?.availability || "")}" required>
        </div>
      </div>
      <div class="field">
        <label for="bio">About you</label>
        <textarea id="bio" required>${escapeHtml(cg?.bio || "")}</textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Save changes</button>
      </div>
    </form>
    <div id="bgCheckArea"></div>
    </div>
  `;
}

function PhotoUploadField() {
  return `
    <div class="photo-upload">
      <div class="photo-preview" id="photoPreview">${photoUrl ? `<img src="${escapeAttr(photoUrl)}" alt="">` : uploadIcon()}</div>
      <div>
        <label class="file-input-label">
          ${uploadIcon()} ${photoUrl ? "Change photo" : "Choose photo"}
          <input type="file" id="photoInput" accept="image/*">
        </label>
        <div class="photo-hint" id="photoHint">JPG or PNG, uploaded to your profile.</div>
      </div>
    </div>`;
}

function wirePhotoUpload(userId, onDone) {
  document.getElementById("photoInput")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const hint = document.getElementById("photoHint");
    if (hint) hint.textContent = "Uploading...";
    try {
      const url = await uploadAvatar(userId, file);
      photoUrl = url;
      const preview = document.getElementById("photoPreview");
      if (preview) preview.innerHTML = `<img src="${escapeAttr(url)}" alt="">`;
      if (hint) hint.textContent = "Photo updated.";
      onDone?.(url);
    } catch (err) {
      if (hint) hint.textContent = err.message || "Couldn't upload that photo.";
    }
  });
}

function BgCheckPanel(status) {
  if (status === "verified") {
    return `<div class="bg-check-panel"><h3 style="display:flex;align-items:center;gap:8px;">${shieldIcon()} Background check verified</h3><p>Your profile shows a Verified badge to families.</p></div>`;
  }
  if (status === "pending") {
    return `<div class="bg-check-panel"><h3>Background check pending</h3><p>An admin is reviewing your request and any documents you've uploaded.</p>${DocUploadArea()}</div>`;
  }
  return `
    <div class="bg-check-panel">
      <h3>Get a Verified badge</h3>
      <p>Request a Saathi background-check review. Upload a photo ID or certification so an admin has something to verify against, then request a review.</p>
      ${DocUploadArea()}
      <button class="btn btn-secondary" id="requestBgCheck" style="margin-top:14px;">Request background check</button>
    </div>`;
}

function DocUploadArea() {
  return `
    <div>
      <label class="file-input-label">
        ${uploadIcon()} Upload document
        <input type="file" id="docInput" accept="image/*,.pdf">
      </label>
      <div class="photo-hint">A photo ID or certification helps an admin verify you.</div>
      <ul class="doc-list" id="docList"></ul>
    </div>`;
}

async function refreshDocList(userId) {
  const list = document.getElementById("docList");
  if (!list) return;
  const docs = await listMyDocuments(userId).catch(() => []);
  list.innerHTML = docs.length
    ? docs.map((d) => `<li><span>${escapeHtml(d.file_name)}</span><span style="color:var(--ink-faint);">${new Date(d.uploaded_at).toLocaleDateString()}</span></li>`).join("")
    : `<li style="color:var(--ink-faint);border:none;background:none;padding:4px 0;">No documents uploaded yet.</li>`;
}

function wireBgCheckPanel(userId) {
  document.getElementById("requestBgCheck")?.addEventListener("click", async (e) => {
    e.target.disabled = true;
    try {
      await requestBackgroundCheck(userId);
      document.getElementById("bgCheckArea").innerHTML = BgCheckPanel("pending");
      wireBgCheckPanel(userId);
      refreshDocList(userId);
    } catch {
      e.target.disabled = false;
    }
  });
  document.getElementById("docInput")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await uploadVerificationDocument(userId, file);
      refreshDocList(userId);
    } catch (err) {
      alert(err.message || "Couldn't upload that document.");
    }
  });
  refreshDocList(userId);
}

async function mountEditForm(area, cg, session) {
  area.innerHTML = EditFormPage(cg);
  wirePhotoUpload(session.user.id);
  const bgStatus = await fetchMyBackgroundStatus(session.user.id).catch(() => "none");
  document.getElementById("bgCheckArea").innerHTML = BgCheckPanel(bgStatus);
  wireBgCheckPanel(session.user.id);

  document.getElementById("listingForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const languages = [...document.querySelectorAll("[data-lang]:checked")].map((i) => i.value);
    const careTypes = [...document.querySelectorAll("[data-care]:checked")].map((i) => i.value);
    const fullName = getProfile()?.full_name || "";
    try {
      await upsertCaregiverProfile(session.user.id, {
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
      });
      location.hash = `#/caregiver/${session.user.id}`;
    } catch (err) {
      const el = document.getElementById("listError");
      if (el) el.innerHTML = `<div class="auth-error">${escapeHtml(err.message || "Couldn't save that listing.")}</div>`;
    }
  });
}

/* ================= first-time wizard ================= */

function WizardShell(bodyHtml) {
  return `
    <div style="max-width:640px;">
      <h1 style="margin-bottom:6px;">Set up your listing</h1>
      <p style="color:var(--ink-soft);margin-bottom:26px;">A few short steps — families see this as your profile.</p>
      <div class="wizard-steps">
        ${STEPS.map((label, i) => `<div class="wizard-step ${i === step ? "is-active" : i < step ? "is-done" : ""}">${label}</div>`).join("")}
      </div>
      <div id="wizardError"></div>
      <div class="wizard-panel">${bodyHtml}</div>
    </div>`;
}

function renderWizard(area, session) {
  const bodies = [WizardBasics, WizardLanguagesCare, WizardExperience, WizardBio, WizardVerify];
  area.innerHTML = WizardShell(bodies[step](session));
  wireWizardStep(area, session);
}

function WizardBasics() {
  return `
    <div class="field">
      <label>Photo <span class="optional">(optional, add it anytime)</span></label>
      ${PhotoUploadField()}
    </div>
    <div class="field">
      <label for="w_headline">Headline</label>
      <input type="text" id="w_headline" value="${escapeAttr(draft.headline || "")}" placeholder="e.g. Patient elder care, especially for memory-related needs" required>
    </div>
    <div class="field-row">
      <div class="field">
        <label for="w_city">City</label>
        <select id="w_city" required>
          <option value="">Select a city</option>
          ${CITIES.map((c) => `<option value="${c}" ${draft.city === c ? "selected" : ""}>${c}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label for="w_rate">Hourly rate ($)</label>
        <input type="number" id="w_rate" min="0" value="${draft.rate ?? ""}" required>
      </div>
    </div>
    ${WizardNav(false)}`;
}

function WizardLanguagesCare() {
  const langs = new Set(draft.languages || []);
  const cares = new Set(draft.careTypes || []);
  return `
    <div class="field">
      <label>Languages you speak with clients</label>
      <div class="checkbox-grid">
        ${LANGUAGES.map((l) => `<label class="checkbox-tile"><input type="checkbox" data-w-lang value="${l}" ${langs.has(l) ? "checked" : ""}> ${l}</label>`).join("")}
      </div>
    </div>
    <div class="field">
      <label>Care types you offer</label>
      <div class="checkbox-grid">
        ${Object.entries(CARE_TYPES).map(([v, label]) => `<label class="checkbox-tile"><input type="checkbox" data-w-care value="${v}" ${cares.has(v) ? "checked" : ""}> ${label}</label>`).join("")}
      </div>
    </div>
    ${WizardNav(true)}`;
}

function WizardExperience() {
  return `
    <div class="field-row">
      <div class="field">
        <label for="w_experience">Years of experience</label>
        <input type="number" id="w_experience" min="0" value="${draft.experienceYears ?? ""}" required>
      </div>
      <div class="field">
        <label for="w_availability">Availability</label>
        <input type="text" id="w_availability" value="${escapeAttr(draft.availability || "")}" placeholder="e.g. Weekdays, 8am–6pm" required>
      </div>
    </div>
    ${WizardNav(true)}`;
}

function WizardBio() {
  return `
    <div class="field">
      <label for="w_bio">Tell families about yourself</label>
      <textarea id="w_bio" required placeholder="Share your experience, your approach to care, and anything families should know.">${escapeHtml(draft.bio || "")}</textarea>
    </div>
    ${WizardNav(true)}`;
}

function WizardVerify() {
  return `
    <p style="color:var(--ink-soft);margin-bottom:16px;">Optional, but listings with a Verified badge get noticed more. You can always come back to this later from your listing page.</p>
    ${DocUploadArea()}
    <div class="wizard-nav">
      <button type="button" class="btn btn-ghost" id="wizardBack">Back</button>
      <button type="button" class="btn btn-primary" id="wizardFinish">Publish listing</button>
    </div>`;
}

function WizardNav(showBack) {
  return `
    <div class="wizard-nav">
      ${showBack ? `<button type="button" class="btn btn-ghost" id="wizardBack">Back</button>` : `<span></span>`}
      <button type="button" class="btn btn-primary" id="wizardNext">Continue</button>
    </div>`;
}

function showWizardError(msg) {
  const el = document.getElementById("wizardError");
  if (el) el.innerHTML = `<div class="auth-error">${escapeHtml(msg)}</div>`;
}

function wireWizardStep(area, session) {
  wirePhotoUpload(session.user.id);

  document.getElementById("wizardBack")?.addEventListener("click", () => {
    saveStepDraft();
    step = Math.max(0, step - 1);
    renderWizard(area, session);
  });
  document.getElementById("wizardNext")?.addEventListener("click", () => {
    if (!saveStepDraft()) return;
    step = Math.min(STEPS.length - 1, step + 1);
    renderWizard(area, session);
  });

  if (step === 4) {
    refreshDocList(session.user.id);
    document.getElementById("docInput")?.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await uploadVerificationDocument(session.user.id, file);
        refreshDocList(session.user.id);
      } catch (err) {
        showWizardError(err.message || "Couldn't upload that document.");
      }
    });
    document.getElementById("wizardFinish")?.addEventListener("click", () => finishWizard(session));
  }
}

function saveStepDraft() {
  if (step === 0) {
    const headline = document.getElementById("w_headline").value.trim();
    const city = document.getElementById("w_city").value;
    const rate = document.getElementById("w_rate").value;
    if (!headline || !city || !rate) {
      showWizardError("Fill in a headline, city, and rate to continue.");
      return false;
    }
    draft.headline = headline;
    draft.city = city;
    draft.rate = Number(rate);
  } else if (step === 1) {
    draft.languages = [...document.querySelectorAll("[data-w-lang]:checked")].map((i) => i.value);
    draft.careTypes = [...document.querySelectorAll("[data-w-care]:checked")].map((i) => i.value);
    if (!draft.languages.length || !draft.careTypes.length) {
      showWizardError("Pick at least one language and one care type.");
      return false;
    }
  } else if (step === 2) {
    const experienceYears = document.getElementById("w_experience").value;
    const availability = document.getElementById("w_availability").value.trim();
    if (experienceYears === "" || !availability) {
      showWizardError("Fill in your experience and availability to continue.");
      return false;
    }
    draft.experienceYears = Number(experienceYears);
    draft.availability = availability;
  } else if (step === 3) {
    const bio = document.getElementById("w_bio").value.trim();
    if (!bio) {
      showWizardError("Add a short bio to continue.");
      return false;
    }
    draft.bio = bio;
  }
  return true;
}

async function finishWizard(session) {
  const btn = document.getElementById("wizardFinish");
  if (btn) btn.disabled = true;
  const fullName = getProfile()?.full_name || "";
  try {
    await upsertCaregiverProfile(session.user.id, {
      headline: draft.headline,
      city: draft.city,
      rate: draft.rate,
      languages: draft.languages,
      care_types: draft.careTypes,
      experience_years: draft.experienceYears,
      availability: draft.availability,
      bio: draft.bio,
      photo_url: photoUrl,
      initials: initialsFor(fullName),
      accent: accentFor(fullName),
    });
    location.hash = `#/caregiver/${session.user.id}`;
  } catch (err) {
    showWizardError(err.message || "Couldn't publish that listing.");
    if (btn) btn.disabled = false;
  }
}
