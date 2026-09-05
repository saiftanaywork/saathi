// Pre-signup "get started" flow, shared by both audiences: one tap per
// question, then a live, real preview before any signup is asked for
// (matching caregivers for a family; real search demand for a caregiver),
// then the lightest possible account creation. Ends by handing what was
// already answered to wherever the app asks next -- the existing family
// quiz (pages/onboarding.js) or the existing caregiver listing wizard
// (pages/listYourServices.js) -- so neither one re-asks the same question.
import { CARE_TYPES, CITIES, escapeHtml, escapeAttr, chevronLeftIcon, attachPasswordToggles } from "../constants.js";
import { avatarMarkup } from "../components/caregiverCard.js";
import { fetchCaregivers, countFamilyInterest } from "../api.js";
import { signUp } from "../auth.js";
import { navigate } from "../router.js";
import { setOnboardingSeed, takeStartCity, takeStartRole } from "../onboardingState.js";

const STEP_ORDER = ["fork", "careType", "city", "teaser", "email", "name", "password"];

const state = {
  step: "fork",
  role: null,
  forkSkipped: false,
  careType: null,
  city: null,
  teaserResults: [],
  teaserAllCount: 0,
  teaserLoading: false,
  teaserFallback: false,
  demandCount: 0,
  demandLoading: false,
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

function ForkStep() {
  return shell(
    `
    <h1 style="margin-bottom:16px;">I'd like to...</h1>
    <div class="tile-grid">
      <button type="button" class="tile-button ${state.role === "family" ? "is-selected" : ""}" data-role="family">Find care</button>
      <button type="button" class="tile-button ${state.role === "caregiver" ? "is-selected" : ""}" data-role="caregiver">Offer care</button>
    </div>`,
    { showBack: false }
  );
}

function CareTypeStep() {
  const isCaregiver = state.role === "caregiver";
  return shell(`
    <h1 style="margin-bottom:6px;">${isCaregiver ? "What kind of care do you offer?" : "What kind of care do you need?"}</h1>
    <p style="color:var(--ink-soft);margin-bottom:20px;">${isCaregiver ? "We'll show you real demand right away." : "We'll show you who's available right away."}</p>
    <div class="tile-grid">
      ${Object.entries(CARE_TYPES)
        .map(([v, label]) => `<button type="button" class="tile-button ${state.careType === v ? "is-selected" : ""}" data-caretype="${v}">${label}</button>`)
        .join("")}
    </div>`);
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

function FamilyTeaserStep() {
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

function CaregiverDemandStep() {
  const careLabel = (CARE_TYPES[state.careType] || "").toLowerCase();
  const heading = state.demandLoading
    ? "Checking demand…"
    : state.demandCount > 0
    ? `${state.demandCount} famil${state.demandCount === 1 ? "y has" : "ies have"} searched for ${escapeHtml(careLabel)} in ${escapeHtml(state.city || "")}`
    : `Be one of the first caregivers families in ${escapeHtml(state.city || "")} will see`;
  return shell(`
    <h1 style="margin-bottom:6px;">${heading}</h1>
    <p style="color:var(--ink-soft);margin-bottom:20px;">Publish a free listing and families searching for ${escapeHtml(careLabel)} can find you.</p>
    <div class="form-actions" style="justify-content:stretch;">
      <button type="button" class="btn btn-primary btn-block" id="teaserContinue" ${state.demandLoading ? "disabled" : ""}>Continue</button>
    </div>`);
}

function TeaserStep() {
  return state.role === "caregiver" ? CaregiverDemandStep() : FamilyTeaserStep();
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
  const unlocks = state.role === "caregiver" ? "This publishes your listing." : "This unlocks the full directory.";
  return shell(`
    <h1 style="margin-bottom:6px;">Set a password</h1>
    <p style="color:var(--ink-soft);margin-bottom:16px;">Minimum 6 characters. ${unlocks}</p>
    <div id="wizardError"></div>
    <form id="passwordForm">
      <div class="field"><input type="password" id="wizardPassword" minlength="6" placeholder="Password" required autofocus></div>
      <div class="form-actions" style="justify-content:stretch;"><button type="submit" class="btn btn-primary btn-block" id="wizardSubmit">Create account</button></div>
    </form>`);
}

function ConfirmPendingStep() {
  return `
  <div class="confirm-panel">
    <h3>Check your email</h3>
    <p>We sent a confirmation link to ${escapeHtml(state.email)}. Click it, then come back and log in to continue.</p>
    <a class="btn btn-primary" href="#/login" style="margin-top:14px;">Go to login</a>
  </div>`;
}

function stepHtml() {
  switch (state.step) {
    case "fork": return ForkStep();
    case "careType": return CareTypeStep();
    case "city": return CityStep();
    case "teaser": return TeaserStep();
    case "email": return EmailStep();
    case "name": return NameStep();
    case "password": return PasswordStep();
    case "confirmPending": return ConfirmPendingStep();
    default: return ForkStep();
  }
}

function showWizardError(msg) {
  const el = document.getElementById("wizardError");
  if (el) el.innerHTML = `<div class="auth-error">${escapeHtml(msg)}</div>`;
}

function goBack() {
  if (state.step === "careType" && state.forkSkipped) {
    navigate("/");
    return;
  }
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

async function loadDemand() {
  state.demandLoading = true;
  renderStep();
  try {
    state.demandCount = await countFamilyInterest({ city: state.city, careType: state.careType });
  } catch {
    state.demandCount = 0;
  }
  state.demandLoading = false;
  if (state.step === "teaser") renderStep();
}

function attachHandlers() {
  document.getElementById("wizardBack")?.addEventListener("click", goBack);

  if (state.step === "fork") {
    document.querySelectorAll("[data-role]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.role = btn.getAttribute("data-role");
        state.step = "careType";
        renderStep();
      });
    });
  }

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
        if (state.role === "caregiver") loadDemand();
        else loadTeaser();
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
        const { session } = await signUp({ email: state.email, password, fullName: state.name, role: state.role });
        setOnboardingSeed({ careTypes: [state.careType], city: state.city });
        if (session) {
          navigate(state.role === "caregiver" ? "/list-your-services" : "/onboarding");
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
  attachPasswordToggles(area);
}

export function GetStartedPage() {
  state.step = "fork";
  state.forkSkipped = false;
  const startCity = takeStartCity();
  if (startCity && CITIES.includes(startCity)) state.city = startCity;
  const startRole = takeStartRole();
  if (startRole === "family" || startRole === "caregiver") {
    state.role = startRole;
    state.forkSkipped = true;
    state.step = "careType";
  }
  return `<div class="onboarding-page" id="getStartedArea">${stepHtml()}</div>`;
}

export function mountGetStartedPage() {
  attachHandlers();
}
