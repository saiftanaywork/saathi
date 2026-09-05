import { initAuth, onAuthChange } from "./auth.js";
import { initErrorTracking } from "./errorTracking.js";
import { currentRoute, navigate, initRouter } from "./router.js";
import { NavBar, attachNavHandlers } from "./components/navbar.js";
import { Footer } from "./components/footer.js";
import { ModalLayer } from "./components/modal.js";
import { LandingPage, mountLandingPage } from "./pages/landing.js";
import { BrowsePage, mountBrowsePage, cleanupBrowsePage } from "./pages/browse.js";
import { ProfilePage, mountProfilePage } from "./pages/profile.js";
import { LoginPage, mountLoginPage, SignupPage, mountSignupPage, AdminLoginPage, mountAdminLoginPage } from "./pages/auth-pages.js";
import { ListPage, mountListPage } from "./pages/listYourServices.js";
import { AdminPage, mountAdminPage } from "./pages/admin.js";
import { FavoritesPage, mountFavoritesPage } from "./pages/favorites.js";
import { OnboardingPage, mountOnboardingPage } from "./pages/onboarding.js";
import { GetStartedPage, mountGetStartedPage } from "./pages/getStarted.js";
import { AboutPage, PrivacyPage, NotFoundPage, AuthErrorPage } from "./pages/about.js";

function routeBody(route) {
  switch (route.name) {
    case "landing": return LandingPage();
    case "browse": return BrowsePage();
    case "profile": return ProfilePage();
    case "list": return ListPage();
    case "about": return AboutPage();
    case "authError": return AuthErrorPage(route.message);
    case "privacy": return PrivacyPage();
    case "login": return LoginPage();
    case "signup": return SignupPage();
    case "adminLogin": return AdminLoginPage();
    case "admin": return AdminPage();
    case "favorites": return FavoritesPage();
    case "onboarding": return OnboardingPage();
    case "getStarted": return GetStartedPage();
    default: return NotFoundPage();
  }
}

async function mountRoute(route) {
  switch (route.name) {
    case "landing": return mountLandingPage();
    case "browse": return mountBrowsePage();
    case "profile": return mountProfilePage(route.id);
    case "list": return mountListPage();
    case "login": return mountLoginPage();
    case "signup": return mountSignupPage();
    case "adminLogin": return mountAdminLoginPage();
    case "admin": return mountAdminPage();
    case "favorites": return mountFavoritesPage();
    case "onboarding": return mountOnboardingPage();
    case "getStarted": return mountGetStartedPage();
  }
}

function render() {
  const route = currentRoute();
  if (route.name === "redirect") {
    navigate(route.to);
    return;
  }
  cleanupBrowsePage();
  const root = document.getElementById("app");
  root.innerHTML = NavBar(route.name) + `<main>${routeBody(route)}</main>` + Footer() + `<div id="modalLayer">${ModalLayer()}</div>`;
  attachNavHandlers(() => navigate("/"));
  mountRoute(route);
}

async function boot() {
  initErrorTracking();
  await initAuth();
  onAuthChange(() => render());
  initRouter(render);
}

boot();
