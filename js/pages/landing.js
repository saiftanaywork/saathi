import { LANGUAGES, LANGUAGE_SCRIPT, heartIcon, leafIcon, sunIcon, shieldIcon } from "../constants.js";

export function LandingPage() {
  return `
  <section class="hero">
    <div class="container hero-inner">
      <div>
        <span class="eyebrow">Serving Indian families across DFW</span>
        <h1>Find someone who feels like <em>family</em>, not a stranger.</h1>
        <p class="hero-sub">Saathi is a directory of caregivers for aging parents, new mothers, and anyone who'd rather explain themselves once — to someone who already understands the household.</p>
        <div class="hero-ctas">
          <a href="#/browse" class="btn btn-primary">Find a caregiver</a>
          <a href="#/list-your-services" class="btn btn-secondary">List your services</a>
        </div>
        <p class="hero-microcopy">Free to browse and list. No bookings, no fees — you connect directly.</p>
      </div>
      <div class="hero-panel">
        <div class="hero-panel-label">Caregivers on Saathi speak</div>
        <div class="hero-lang-grid">
          ${LANGUAGES.map((l) => `<div class="hero-lang-chip"><b>${l}</b><span>${LANGUAGE_SCRIPT[l]}</span></div>`).join("")}
        </div>
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
        <a href="#/browse" class="btn btn-primary">Find a caregiver</a>
        <a href="#/list-your-services" class="btn btn-secondary">List your services</a>
      </div>
    </div>
  </section>
  `;
}
