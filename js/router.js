// Simple hash router. Each route is { name, guard? } where guard(), if
// present, returns true (allow) or a redirect path string (deny).
import { isSignedIn, isAdmin, isCaregiver } from "./auth.js";
import { EMAIL_AUTH_ENABLED } from "./constants.js";

export function requireAuth() {
  return isSignedIn() ? true : "/login";
}
export function requireAdmin() {
  if (!isSignedIn()) return "/admin/login";
  return isAdmin() ? true : "/admin/login";
}
export function requireCaregiver() {
  if (!isSignedIn()) return "/login";
  return isCaregiver() ? true : "/browse";
}
export function requireBrowseAccess() {
  if (!EMAIL_AUTH_ENABLED) return true;
  return isSignedIn() ? true : "/get-started";
}

export function parseRoute() {
  const hash = location.hash || "#/";
  const rawFragment = hash.slice(1);

  // Supabase auth redirects (an expired/already-used confirmation or
  // password-reset link, etc.) land here with error info as URL-encoded
  // params directly in the hash, not as a normal app path.
  if (/(^|&)error=/.test(rawFragment)) {
    const params = new URLSearchParams(rawFragment);
    return { name: "authError", message: params.get("error_description")?.replace(/\+/g, " ") || params.get("error") };
  }

  const path = rawFragment || "/";
  const parts = path.split("/").filter(Boolean);

  if (parts.length === 0) return { name: "landing" };
  if (parts[0] === "browse") return { name: "browse", guard: requireBrowseAccess };
  if (parts[0] === "get-started") return EMAIL_AUTH_ENABLED ? { name: "getStarted" } : { name: "comingSoon" };
  if (parts[0] === "caregiver" && parts[1]) return { name: "profile", id: parts[1] };
  if (parts[0] === "list-your-services") return { name: "list", guard: requireCaregiver };
  if (parts[0] === "how-it-works") return { name: "about" };
  if (parts[0] === "privacy") return { name: "privacy" };
  if (parts[0] === "login") return EMAIL_AUTH_ENABLED ? { name: "login" } : { name: "comingSoon" };
  if (parts[0] === "signup") return EMAIL_AUTH_ENABLED ? { name: "signup" } : { name: "comingSoon" };
  if (parts[0] === "favorites") return { name: "favorites", guard: requireAuth };
  if (parts[0] === "onboarding") return { name: "onboarding", guard: requireAuth };
  if (parts[0] === "admin" && parts[1] === "login") return { name: "adminLogin" };
  if (parts[0] === "admin") return { name: "admin", guard: requireAdmin };
  return { name: "notfound" };
}

export function currentRoute() {
  const route = parseRoute();
  if (route.guard) {
    const result = route.guard();
    if (result !== true) return { name: "redirect", to: result };
  }
  return route;
}

export function navigate(path) {
  location.hash = `#${path}`;
}

export function initRouter(onChange) {
  window.addEventListener("hashchange", () => {
    window.scrollTo(0, 0);
    onChange();
  });
  onChange();
}
