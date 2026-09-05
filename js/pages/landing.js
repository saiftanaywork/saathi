import { LANGUAGES, LANGUAGE_SCRIPT, CITIES, escapeHtml, escapeAttr, heartIcon, leafIcon, sunIcon, shieldIcon, starIcon, pinIcon, searchIcon } from "../constants.js";
import { fetchRecentReviews } from "../api.js";
import { setStartRole } from "../onboardingState.js";
import { navigate } from "../router.js";
import { isSignedIn } from "../auth.js";

export function LandingPage() {
  return `
  <section class="hero hero-minimal">
    <div class="container hero-inner-minimal">
      <span class="eyebrow">South Asian caregiver directory · DFW</span>
      <h1>Find someone who feels like <em>family</em>, not a stranger.</h1>
      <p class="hero-sub">Elder care, postpartum support, and companionship — from caregivers who already understand the household.</p>
      <form class="hero-search" id="heroSearchForm">
        ${pinIcon()}
        <select id="heroCity" required aria-label="City">
          <option value="">Choose your city</option>
          ${CITIES.map((c) => `<option value="${escapeAttr(c)}">${c}</option>`).join("")}
        </select>
        <button type="submit" class="btn btn-primary">${searchIcon()} Search</button>
      </form>
      <p class="hero-microcopy">Free to browse and list. No bookings, no fees — you connect directly.</p>
      <a class="hero-caregiver-link" href="${isSignedIn() ? "#/list-your-services" : "#/get-started"}" ${isSignedIn() ? "" : 'data-preset-role="caregiver"'}>Are you a caregiver? →</a>
    </div>
  </section>

  <section class="section section-alt hero-lang-band">
    <div class="container hero-lang-band-inner">
      <div class="hero-panel-label">Caregivers on Saathi speak</div>
      <div class="hero-lang-grid">
        ${LANGUAGES.map((l) => `<div class="hero-lang-chip"><b>${l}</b><span>${LANGUAGE_SCRIPT[l]}</span></div>`).join("")}
      </div>
    </div>
  </section>

  <section class="section section-alt">
    <div class="container">
      <div class="section-head">
        <h2>Built for the moments that are hard to hand to a stranger</h2>
        <p>Three kinds of care families come to Saathi looking for.</p>
      </div>
      <div class="care-grid">
        <div class="care-card">
          <div class="care-icon accent-terracotta">${heartIcon()}</div>
          <h3>Elder care</h3>
          <p>For parents who worked hard their whole lives and deserve someone patient, capable, and easy to talk to — in the language they still dream in.</p>
        </div>
        <div class="care-card">
          <div class="care-icon accent-teal">${leafIcon()}</div>
          <h3>Postpartum &amp; newborn care</h3>
          <p>The first forty days matter. Caregivers experienced in the rest, routines, and small rituals many families here grew up with.</p>
        </div>
        <div class="care-card">
          <div class="care-icon accent-ochre">${sunIcon()}</div>
          <h3>Companionship care</h3>
          <p>Someone to share a meal, a walk, or a rerun of an old serial with — and make a quiet house feel a little less quiet.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section section-alt">
    <div class="container testimonial-rail">
      <div class="section-head">
        <h2>What families are saying</h2>
        <p>Real reviews left after real caregiving relationships.</p>
      </div>
      <div id="testimonialArea" class="testimonial-grid"></div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head">
        <h2>How Saathi works</h2>
        <p>A directory, not an agency — three simple steps.</p>
      </div>
      <div class="steps">
        <div class="step"><div class="step-num">1</div><h3>Browse or post a listing</h3><p>Families search by language, city, and care type — or sign in and let our matching algorithm rank caregivers for them.</p></div>
        <div class="step"><div class="step-num">2</div><h3>Message and meet</h3><p>Reach out, talk it through, and meet in person before deciding anything.</p></div>
        <div class="step"><div class="step-num">3</div><h3>Arrange the rest yourselves</h3><p>Rate, schedule, and payment are between you two — Saathi doesn't touch any of it.</p></div>
      </div>
      <div class="trust-note">
        ${shieldIcon()}
        <p>Caregivers can request a Saathi background-check review, shown as a Verified badge on their profile once approved by an admin. Saathi doesn't run bookings or payments — that part's still on you. <a href="#/how-it-works">Read how it works →</a></p>
      </div>
    </div>
  </section>

  <section class="cta-band">
    <div class="container">
      <h2>Ready to take a look?</h2>
      <p>Browse caregivers by language, city, and care type — or list your own services in a few minutes.</p>
      <div class="hero-ctas">
        <a href="${isSignedIn() ? "#/browse" : "#/get-started"}" class="btn btn-primary" ${isSignedIn() ? "" : 'data-preset-role="family"'}>Find a caregiver</a>
        <a href="${isSignedIn() ? "#/list-your-services" : "#/get-started"}" class="btn btn-secondary" ${isSignedIn() ? "" : 'data-preset-role="caregiver"'}>List your services</a>
      </div>
    </div>
  </section>
  `;
}

export async function mountLandingPage() {
  document.getElementById("heroSearchForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    // Browsing is open to everyone now, so this goes straight to the
    // directory instead of through account creation.
    navigate("/browse");
  });

  document.querySelectorAll("[data-preset-role]").forEach((el) => {
    el.addEventListener("click", () => setStartRole(el.getAttribute("data-preset-role")));
  });

  const area = document.getElementById("testimonialArea");
  if (!area) return;
  const reviews = await fetchRecentReviews(3).catch(() => []);
  if (!reviews.length) {
    area.innerHTML = `<p style="color:var(--ink-faint);">Reviews from families will show up here once caregivers start getting booked.</p>`;
    return;
  }
  area.innerHTML = reviews
    .map(
      (r) => `
    <div class="testimonial-tile">
      <div style="color:var(--ochre);display:inline-flex;margin-bottom:8px;">${Array.from({ length: 5 }, (_, i) => starIcon(i < r.rating)).join("")}</div>
      <p class="testimonial-body">"${escapeHtml(r.comment)}"</p>
      <div class="testimonial-name">${escapeHtml(r.familyName)}</div>
    </div>`
    )
    .join("");
}
