import { checkIcon } from "../constants.js";

export function AboutPage() {
  return `
  <div class="container about-hero">
    <h1>A directory with a few real features — still not an agency</h1>
    <p>Saathi is a place to list, search, and now get matched. Here's exactly what that means.</p>
  </div>
  <div class="container about-columns">
    <div class="about-card">
      <h3>What Saathi does</h3>
      <ul>
        <li>Lets caregivers post a free listing describing their services, rate, and availability.</li>
        <li>Lets families search and filter listings by language, city, and care type — or sign in for a ranked "Recommended for you" list based on their filters and search history.</li>
        <li>Lets a caregiver request a Saathi admin review; if approved, a Verified badge appears on their profile.</li>
        <li>Gets you to a name, a story, and a way to reach out.</li>
      </ul>
    </div>
    <div class="about-card">
      <h3>What Saathi doesn't do</h3>
      <ul>
        <li>Run a licensed third-party background check (like Checkr or Sterling) — the Verified badge reflects Saathi's own admin review, not a criminal-records search.</li>
        <li>Guarantee, vouch for, or take responsibility for any match the algorithm surfaces — it's a ranking, not a recommendation you should skip vetting.</li>
        <li>Handle messaging, scheduling, or payment — that all happens off-platform, directly between you.</li>
      </ul>
    </div>
  </div>
  <div class="container checklist">
    <h2>Before you hire — or accept a job</h2>
    <div class="checklist-grid">
      <div class="checklist-item">${checkIcon()}<div><b>Meet in person first.</b>A phone call is a start, not a decision.</div></div>
      <div class="checklist-item">${checkIcon()}<div><b>Check references.</b>Ask for two, and actually call them.</div></div>
      <div class="checklist-item">${checkIcon()}<div><b>Verify identity.</b>A photo ID goes both ways — families should show one too.</div></div>
      <div class="checklist-item">${checkIcon()}<div><b>Agree on terms upfront.</b>Rate, hours, and duties, ideally in writing.</div></div>
      <div class="checklist-item">${checkIcon()}<div><b>Trust your gut.</b>If something feels off in the first conversation, it's worth listening to.</div></div>
      <div class="checklist-item">${checkIcon()}<div><b>Start with a trial period.</b>A short paid trial tells you more than any interview.</div></div>
    </div>
  </div>
  `;
}

export function NotFoundPage() {
  return `<div class="container" style="padding:110px 0 130px;text-align:center;">
    <h1>Page not found</h1>
    <p style="color:var(--ink-soft);margin-bottom:24px;">That page doesn't exist.</p>
    <a href="#/" class="btn btn-primary">Back home</a>
  </div>`;
}
