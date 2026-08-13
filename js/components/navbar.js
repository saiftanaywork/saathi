import { BrandMark, menuIcon } from "../constants.js";
import { isSignedIn, isAdmin, isCaregiver, getProfile, signOut } from "../auth.js";

export function NavBar(active) {
  const link = (href, label, key) =>
    `<a class="nav-link ${active === key ? "is-active" : ""}" href="#${href}">${label}</a>`;

  const signedIn = isSignedIn();
  const admin = isAdmin();
  const caregiver = isCaregiver();
  const profile = getProfile();

  const authLinks = admin
    ? `${link("/admin", "Admin dashboard", "admin")}<button class="btn btn-ghost btn-sm" id="signOutBtn">Sign out</button>`
    : signedIn
    ? `
      ${caregiver ? link("/list-your-services", "My listing", "list") : link("/favorites", "Saved", "favorites")}
      <span class="nav-link" style="cursor:default;opacity:.7;">${profile?.full_name ? `Hi, ${profile.full_name.split(" ")[0]}` : ""}</span>
      <button class="btn btn-ghost btn-sm" id="signOutBtn">Sign out</button>
    `
    : `${link("/login", "Log in", "login")}<a class="btn btn-primary btn-sm nav-cta" href="#/browse">Find a caregiver</a>`;

  return `
  <header class="site-nav">
    <div class="container">
      <a class="brand" href="#/">
        ${BrandMark()}
        <span>
          <span class="brand-word">Saathi</span>
          <span class="brand-tag">Caregiver directory · DFW</span>
        </span>
      </a>
      <nav class="nav-links">
        ${link("/browse", "Find a caregiver", "browse")}
        ${link("/list-your-services", "List your services", "list")}
        ${link("/how-it-works", "How it works", "about")}
        ${authLinks}
      </nav>
      <button class="nav-toggle" id="navToggle" aria-label="Open menu" aria-expanded="false">${menuIcon()}</button>
    </div>
    <div class="nav-mobile-panel" id="navMobilePanel">
      ${link("/browse", "Find a caregiver", "browse")}
      ${link("/list-your-services", "List your services", "list")}
      ${link("/how-it-works", "How it works", "about")}
      ${signedIn ? "" : link("/login", "Log in", "login")}
      ${signedIn ? '<button class="btn btn-ghost" id="signOutBtnMobile">Sign out</button>' : '<a class="btn btn-primary" href="#/browse">Find a caregiver</a>'}
    </div>
  </header>`;
}

export function attachNavHandlers(onSignedOut) {
  const toggle = document.getElementById("navToggle");
  const panel = document.getElementById("navMobilePanel");
  if (toggle && panel) {
    toggle.addEventListener("click", () => {
      const open = panel.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    panel.addEventListener("click", (e) => {
      if (e.target.tagName === "A") panel.classList.remove("is-open");
    });
  }
  for (const id of ["signOutBtn", "signOutBtnMobile"]) {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", async () => {
      await signOut();
      onSignedOut?.();
    });
  }
}
