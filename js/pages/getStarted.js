// Pre-signup "get started" flow for first-time families: one tap per
// question, then a live preview of real matching caregivers before any
// signup is asked for, then the lightest possible account creation. Ends
// by handing the picked care type/city to the existing post-signup quiz
// (pages/onboarding.js) so that page doesn't have to ask again.
import { CARE_TYPES, CITIES, escapeHtml, escapeAttr, chevronLeftIcon } from "../constants.js";
import { avatarMarkup } from "../components/caregiverCard.js";
import { fetchCaregivers } from "../api.js";
import { signUp } from "../auth.js";
import { navigate } from "../router.js";
import { setOnboardingSeed, takeStartCity } from "../onboardingState.js";

const STEP_ORDER = ["careType", "city", "teaser", "email", "name", "password"];

const state = {
  step: "careType",
  careType: null,
  city: null,
  teaserResults: [],
  teaserAllCount: 0,
  teaserLoading: false,
  teaserFallback: false,
  email: "",
  name: "",
};

function shell(inner, { showBack = true } = {}) {
  return `
  <div class="onboarding-card">
    ${showBack ? `<button type="button" class="wizard-back" id="wizardBack">${chevronLeftIcon()} Back</button>` : ""}
    ${inner}
  </div>`;
}

function CareTypeStep() {
  return shell(
    `
    <h1 style="margin-bottom:6px;">What kind of care do you need?</h1>
    <p style="color:var(--ink-soft);margin-bottom:20px;">We'll show you who's available right away.</p>
    <div class="tile-grid">
      ${Object.entries(CARE_TYPES)
        .map(([v, label]) => `<button type="button" class="tile-button ${state.careType === v ? "is-selected" : ""}" data-caretype="${v}">${label}</button>`)
        .join("")}
    </div>`,
    { showBack: false }
  );
}

function CityStep() {
  return shell(`
    <h1 style="margin-bottom:16px;">Which city?</h1>
    <div class="tile-grid">
      ${CITIES.map((c) => `<button type="button" class="tile-button ${state.city === c ? "is-selected" : ""}" data-city="${escapeAttr(c)}">${escapeHtml(c)}</button>`).join("")}
    </div>`);
}

function teaserCardHtml(cg) {
  return `
  <div class="teaser-card">
    ${avatarMarkup(cg, "md")}
    <div>
      <div class="teaser-name">${escapeHtml(cg.name)}</div>
      <div class="teaser-meta">${escapeHtml(cg.city)} · $${cg.rate}/hr</div>
    </div>
  </div>`;
}

function TeaserStep() {
  const heading = state.teaserLoading
    ? "Finding caregivers…"
    : state.teaserFallback
    ? `${state.teaserAllCount} caregiver${state.teaserAllCount === 1 ? "" : "s"} across DFW`
    : `${state.teaserAllCount} caregiver${state.teaserAllCount === 1 ? "" : "s"} match what you're looking for`;
  return shell(`
    <h1 style="margin-bottom:6px;">${heading}</h1>
    <p style="color:var(--ink-soft);margin-bottom:20px;">${escapeHtml(CARE_TYPES[state.careType] || "")} in ${escapeHtml(state.city || "")}</p>
    <div class="teaser-list">
      ${state.teaserLoading ? `<p style="color:var(--ink-faint);">Looking...</p>` : state.teaserResults.map(teaserCardHtml).join("")}
    </div>
    <div class="form-actions" style="justify-content:stretch;">
      <button type="button" class="btn btn-primary btn-block" id="teaserContinue" ${state.teaserLoading ? "disabled" : ""}>See my matches</button>
    </div>`);
}

function EmailStep() {
  return shell(`
    <h1 style="margin-bottom:16px;">What's your email?</h1>
    <div id="wizardError"></div>
    <form id="emailForm">
      <div class="field"><input type="email" id="wizardEmail" value="${escapeAttr(state.email)}" placeholder="Email address" required autofocus></div>
      <div class="form-actions" style="justify-content:stretch;"><button type="submit" class="btn btn-primary btn-block">Next</button></div>
    </form>`);
}

function NameStep() {
  return shell(`
    <h1 style="margin-bottom:16px;">What's your name?</h1>
    <div id="wizardError"></div>
    <form id="nameForm">
      <div class="field"><input type="text" id="wizardName" value="${escapeAttr(state.name)}" placeholder="Full name" required autofocus></div>
      <div class="form-actions" style="justify-content:stretch;"><button type="submit" class="btn btn-primary btn-block">Next</button></div>
    </form>`);
}

function PasswordStep() {
  return shell(`
    <h1 style="margin-bottom:6px;">Set a password</h1>
    <p style="color:var(--ink-soft);margin-bottom:16px;">Minimum 6 characters. This unlocks the full directory.</p>
    <div id="wizardError"></div>
    <form id="passwordForm">
      <div class="field"><input type="password" id="wizardPassword" minlength="6" placeholder="Password" required autofocus></div>
      <div class="form-actions" style="justify-content:stretch;"><button type="submit" class="btn btn-primary btn-block" id="wizardSubmit">Create account &amp; see matches</button></div>
    </form>`);
}

function ConfirmPendingStep() {
  return `
  <div class="confirm-panel">
    <h3>Check your email</h3>
    <p>We sent a confirmation link to ${escapeHtml(state.email)}. Click it, then come back and log in to see the full directory.</p>
    <a class="btn btn-primary" href="#/login" style="margin-top:14px;">Go to login</a>
  </div>`;
}

function stepHtml() {
  switch (state.step) {
    case "careType": return CareTypeStep();
    case "city": return CityStep();
    case "teaser": return TeaserStep();
    case "email": return EmailStep();
    case "name": return NameStep();
    case "password": return PasswordStep();
    case "confirmPending": return ConfirmPendingStep();
    default: return CareTypeStep();
  }
}

function showWizardError(msg) {
  const el = document.getElementById("wizardError");
  if (el) el.innerHTML = `<div class="auth-error">${escapeHtml(msg)}</div>`;
}

function goBack() {
  const idx = STEP_ORDER.indexOf(state.step);
  if (idx <= 0) {
    navigate("/");
    return;
  }
  state.step = STEP_ORDER[idx - 1];
  renderStep();
}

async function loadTeaser() {
  state.teaserLoading = true;
  renderStep();
  try {
    const all = await fetchCaregivers();
    const relevant = all.filter((cg) => cg.city === state.city || cg.careTypes.includes(state.careType));
    const bothMatch = (cg) => (cg.city === state.city ? 1 : 0) + (cg.careTypes.includes(state.careType) ? 1 : 0);
    const pool = relevant.length ? relevant : all;
    const sorted = [...pool].sort((a, b) => bothMatch(b) - bothMatch(a) || (b.ratingCount || 0) - (a.ratingCount || 0) || b.experienceYears - a.experienceYears);
    state.teaserResults = sorted.slice(0, 3);
    state.teaserAllCount = pool.length;
    state.teaserFallback = !relevant.length;
  } catch {
    state.teaserResults = [];
    state.teaserAllCount = 0;
    state.teaserFallback = true;
  }
  state.teaserLoading = false;
  if (state.step === "teaser") renderStep();
}

function attachHandlers() {
  document.getElementById("wizardBack")?.addEventListener("click", goBack);

  if (state.step === "careType") {
    document.querySelectorAll("[data-caretype]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.careType = btn.getAttribute("data-caretype");
        state.step = "city";
        renderStep();
      });
    });
  }

  if (state.step === "city") {
    document.querySelectorAll("[data-city]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.city = btn.getAttribute("data-city");
        state.step = "teaser";
        renderStep();
        loadTeaser();
      });
    });
  }

  if (state.step === "teaser") {
    document.getElementById("teaserContinue")?.addEventListener("click", () => {
      state.step = "email";
      renderStep();
    });
  }

  if (state.step === "email") {
    document.getElementById("emailForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      state.email = document.getElementById("wizardEmail").value.trim();
      state.step = "name";
      renderStep();
    });
  }

  if (state.step === "name") {
    document.getElementById("nameForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      state.name = document.getElementById("wizardName").value.trim();
      state.step = "password";
      renderStep();
    });
  }

  if (state.step === "password") {
    document.getElementById("passwordForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const password = document.getElementById("wizardPassword").value;
      const btn = document.getElementById("wizardSubmit");
      btn.disabled = true;
      try {
        const { session } = await signUp({ email: state.email, password, fullName: state.name, role: "family" });
        setOnboardingSeed({ careTypes: [state.careType], city: state.city });
        if (session) {
          navigate("/onboarding");
        } else {
          state.step = "confirmPending";
          renderStep();
        }
      } catch (err) {
        showWizardError(err.message || "Couldn't create that account.");
        btn.disabled = false;
      }
    });
  }
}

function renderStep() {
  const area = document.getElementById("getStartedArea");
  if (!area) return;
  area.innerHTML = stepHtml();
  attachHandlers();
}

export function GetStartedPage() {
  const startCity = takeStartCity();
  if (startCity && CITIES.includes(startCity)) state.city = startCity;
  return `<div class="onboarding-page" id="getStartedArea">${stepHtml()}</div>`;
}

export function mountGetStartedPage() {
  attachHandlers();
}
