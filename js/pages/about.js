import { checkIcon, escapeHtml } from "../constants.js";

export function AboutPage() {
  return `
  <div class="container about-hero">
    <h1>A directory with a few real features — still not an agency</h1>
    <p>Saathi is a place to list, search, and now get matched. Here's exactly what that means.</p>
  </div>
  <div class="container" style="max-width:640px;padding:20px 0;">
    <div class="about-card">
      <h3>What Saathi does</h3>
      <ul>
        <li>Lets caregivers post a free listing describing their services, rate, and availability.</li>
        <li>Lets families search and filter listings by language, city, and care type — or sign in for a ranked "Recommended for you" list based on their filters and search history.</li>
        <li>Lets a caregiver request a Saathi admin review; if approved, a Verified badge appears on their profile.</li>
        <li>Gets you to a name, a story, and a way to reach out.</li>
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

export function PrivacyPage() {
  return `
  <div class="container about-hero">
    <h1>Privacy</h1>
    <p>Short version: we collect what's needed to run a directory, and nothing you list gets sold anywhere.</p>
  </div>
  <div class="container about-columns">
    <div class="about-card">
      <h3>What we collect</h3>
      <ul>
        <li>Your email and password, handled by Supabase Auth — we never see or store your password directly.</li>
        <li>Your name and role (family or caregiver).</li>
        <li>If you list services: your headline, bio, city, languages, rate, and the photo you upload.</li>
        <li>If you request a background-check review: the ID or certification document you upload, visible only to you and admins.</li>
        <li>Reviews and star ratings you leave for a caregiver, shown publicly with your name.</li>
        <li>Filters and searches you run, if you're signed in, so recommendations can improve.</li>
        <li>Messages you send through a caregiver's contact form.</li>
      </ul>
    </div>
    <div class="about-card">
      <h3>What we don't do</h3>
      <ul>
        <li>Sell or share your information with advertisers or third parties.</li>
        <li>Show your email, phone, or exact address to anyone browsing the directory — the map view jitters a caregiver's pin near their city, not their real location.</li>
        <li>Track you across other websites.</li>
      </ul>
    </div>
  </div>
  <div class="container" style="max-width:70ch;padding-bottom:80px;">
    <h3 style="margin-bottom:10px;">Questions or a deletion request?</h3>
    <p style="color:var(--ink-soft);line-height:1.7;">Saathi is a small, community-run directory, not a large company with a dedicated privacy team. If you'd like your account, listing, review, or uploaded documents removed, reach out through a caregiver's contact form or the admin login page and we'll take care of it directly.</p>
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

export function ComingSoonPage() {
  return `<div class="container" style="padding:110px 0 130px;text-align:center;">
    <h1>Accounts are coming soon</h1>
    <p style="color:var(--ink-soft);margin-bottom:24px;max-width:52ch;margin-left:auto;margin-right:auto;">We're finishing up a few things before turning on sign-ups. You can browse the full directory right now — check back soon to save favorites, leave reviews, or list your own services.</p>
    <a href="#/browse" class="btn btn-primary">Browse caregivers</a>
  </div>`;
}

export function AuthErrorPage(message) {
  return `<div class="container" style="padding:110px 0 130px;text-align:center;">
    <h1>That link didn't work</h1>
    <p style="color:var(--ink-soft);margin-bottom:24px;max-width:52ch;margin-left:auto;margin-right:auto;">
      ${escapeHtml(message || "This link is invalid or has expired.")}
      ${/expired|invalid/i.test(message || "") ? " Confirmation and reset links can only be used once — try signing up or requesting a new one." : ""}
    </p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
      <a href="#/signup" class="btn btn-primary">Create an account</a>
      <a href="#/login" class="btn btn-secondary">Log in</a>
    </div>
  </div>`;
}
