import { BrandMark, menuIcon } from "../constants.js";
import { isSignedIn, isAdmin, isCaregiver, getProfile, signOut } from "../auth.js";

export function NavBar(active) {
  const link = (href, label, key) =>
    `<a class="nav-link ${active === key ? "is-active" : ""}" href="#${href}">${label}</a>`;

  const signedIn = isSignedIn();
  const admin = isAdmin();
  const caregiver = isCaregiver();
  const profile = getProfile();

  const accountArea = admin
    ? `${link("/admin", "Admin dashboard", "admin")}<button class="btn btn-ghost btn-sm" id="signOutBtn">Sign out</button>`
    : signedIn
    ? `
      ${caregiver ? link("/list-your-services", "My listing", "list") : link("/favorites", "Saved", "favorites")}
      <span class="nav-link" style="cursor:default;opacity:.7;">${profile?.full_name ? `Hi, ${profile.full_name.split(" ")[0]}` : ""}</span>
      <button class="btn btn-ghost btn-sm" id="signOutBtn">Sign out</button>
    `
    : `${link("/login", "Log in", "login")}<a class="btn btn-primary btn-sm" href="#/get-started">Get started</a>`;

  return `
  <header class="site-nav">
    <div class="container">
      <div class="nav-left">
        <button class="nav-toggle" id="navToggle" aria-label="Open menu" aria-expanded="false">${menuIcon()}</button>
        <a class="brand" href="#/">
          ${BrandMark()}
          <span class="brand-word">Saathi</span>
        </a>
      </div>
      <div class="nav-actions">${accountArea}</div>
    </div>
    <div class="nav-dropdown" id="navDropdown">
      ${signedIn ? link("/browse", "Find a caregiver", "browse") : link("/get-started", "Find a caregiver", "getStarted")}
      ${caregiver && signedIn ? "" : link("/list-your-services", "List your services", "list")}
      ${link("/how-it-works", "How it works", "about")}
      ${link("/privacy", "Privacy", "privacy")}
      ${signedIn ? "" : link("/login", "Log in", "login")}
    </div>
  </header>`;
}

export function attachNavHandlers(onSignedOut) {
  const toggle = document.getElementById("navToggle");
  const panel = document.getElementById("navDropdown");
  if (toggle && panel) {
    toggle.addEventListener("click", () => {
      const open = panel.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    panel.addEventListener("click", (e) => {
      if (e.target.tagName === "A") {
        panel.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }
  for (const id of ["signOutBtn"]) {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", async () => {
      await signOut();
      onSignedOut?.();
    });
  }
}
