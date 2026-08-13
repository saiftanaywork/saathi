import { LANGUAGES, CITIES, CARE_TYPES, escapeAttr } from "../constants.js";
import { logSearch } from "../api.js";
import { getSession } from "../auth.js";
import { navigate } from "../router.js";

let step = 0;
const draft = { languages: [], careTypes: [], city: "", maxRate: "" };

export function OnboardingPage() {
  step = 0;
  return `<div class="onboarding-page" id="onboardingArea"></div>`;
}

export function mountOnboardingPage() {
  render();
}

function render() {
  const area = document.getElementById("onboardingArea");
  if (!area) return;
  area.innerHTML = step === 0 ? StepOne() : StepTwo();
  wire();
}

function StepOne() {
  return `
    <h1>What kind of care are you looking for?</h1>
    <p>This helps us recommend the right caregivers first — you can change it anytime from browse.</p>
    <div class="onboarding-card">
      <div class="field">
        <label>Care type</label>
        <div class="checkbox-grid">
          ${Object.entries(CARE_TYPES).map(([v, label]) => `<label class="checkbox-tile"><input type="checkbox" data-care value="${v}" ${draft.careTypes.includes(v) ? "checked" : ""}> ${label}</label>`).join("")}
        </div>
      </div>
      <div class="field">
        <label>Preferred languages</label>
        <div class="checkbox-grid">
          ${LANGUAGES.map((l) => `<label class="checkbox-tile"><input type="checkbox" data-lang value="${l}" ${draft.languages.includes(l) ? "checked" : ""}> ${l}</label>`).join("")}
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-primary" id="onbNext">Continue</button>
      </div>
    </div>
    <p class="onboarding-skip"><a href="#/browse">Skip for now</a></p>`;
}

function StepTwo() {
  return `
    <h1>Where, and what's your budget?</h1>
    <p>Last step — this is just a starting point for recommendations.</p>
    <div class="onboarding-card">
      <div class="field">
        <label for="onbCity">City</label>
        <select id="onbCity">
          <option value="">Any city</option>
          ${CITIES.map((c) => `<option value="${c}" ${draft.city === c ? "selected" : ""}>${c}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label for="onbMaxRate">Budget (max $/hr)</label>
        <input type="number" id="onbMaxRate" min="0" placeholder="e.g. 25" value="${escapeAttr(draft.maxRate)}">
      </div>
      <div class="form-actions" style="justify-content:space-between;">
        <button type="button" class="btn btn-ghost" id="onbBack">Back</button>
        <button type="button" class="btn btn-primary" id="onbFinish">See recommendations</button>
      </div>
    </div>`;
}

function wire() {
  document.getElementById("onbNext")?.addEventListener("click", () => {
    draft.careTypes = [...document.querySelectorAll("[data-care]:checked")].map((i) => i.value);
    draft.languages = [...document.querySelectorAll("[data-lang]:checked")].map((i) => i.value);
    step = 1;
    render();
  });
  document.getElementById("onbBack")?.addEventListener("click", () => {
    step = 0;
    render();
  });
  document.getElementById("onbFinish")?.addEventListener("click", async () => {
    draft.city = document.getElementById("onbCity").value;
    draft.maxRate = document.getElementById("onbMaxRate").value;
    const session = getSession();
    try {
      await logSearch({
        familyId: session.user.id,
        languages: draft.languages,
        cities: draft.city ? [draft.city] : [],
        careTypes: draft.careTypes,
        minRate: "",
        maxRate: draft.maxRate,
      });
    } catch {
      // non-fatal -- still send them to browse
    }
    navigate("/browse");
  });
}
