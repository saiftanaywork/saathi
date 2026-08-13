// Simple hash router. Each route is { name, guard? } where guard(), if
// present, returns true (allow) or a redirect path string (deny).
import { isSignedIn, isAdmin, isCaregiver } from "./auth.js";

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

export function parseRoute() {
  const hash = location.hash || "#/";
  const path = hash.slice(1) || "/";
  const parts = path.split("/").filter(Boolean);

  if (parts.length === 0) return { name: "landing" };
  if (parts[0] === "browse") return { name: "browse" };
  if (parts[0] === "caregiver" && parts[1]) return { name: "profile", id: parts[1] };
  if (parts[0] === "list-your-services") return { name: "list", guard: requireCaregiver };
  if (parts[0] === "how-it-works") return { name: "about" };
  if (parts[0] === "login") return { name: "login" };
  if (parts[0] === "signup") return { name: "signup" };
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
