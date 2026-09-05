import { escapeHtml } from "../constants.js";
import { signIn, signUp, isAdmin } from "../auth.js";
import { navigate } from "../router.js";

export function LoginPage() {
  return `
  <div class="auth-page">
    <h1>Welcome back</h1>
    <p>Log in to message caregivers, save favorites, and get recommendations.</p>
    <div class="auth-card">
      <div id="authError"></div>
      <form id="loginForm">
        <div class="field">
          <label for="loginEmail">Email</label>
          <input type="email" id="loginEmail" required>
        </div>
        <div class="field">
          <label for="loginPassword">Password</label>
          <input type="password" id="loginPassword" required>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Log in</button>
      </form>
    </div>
    <p class="auth-switch">New to Saathi? <a href="#/signup">Create an account</a></p>
  </div>`;
}

export function mountLoginPage() {
  document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    try {
      await signIn({ email, password });
      navigate(isAdmin() ? "/admin" : "/browse");
    } catch (err) {
      showAuthError(err.message || "Couldn't log in.");
    }
  });
}

export function SignupPage() {
  return `
  <div class="auth-page">
    <h1>Create your account</h1>
    <div class="auth-card">
      <div class="auth-role-toggle" id="roleToggle">
        <button type="button" data-role="family" class="is-active">I'm looking for care</button>
        <button type="button" data-role="caregiver">I'm a caregiver</button>
      </div>
      <div id="authError"></div>
      <form id="signupForm">
        <input type="hidden" id="signupRole" value="family">
        <div class="field">
          <label for="signupName">Full name</label>
          <input type="text" id="signupName" required>
        </div>
        <div class="field">
          <label for="signupEmail">Email</label>
          <input type="email" id="signupEmail" required>
        </div>
        <div class="field">
          <label for="signupPassword">Password</label>
          <input type="password" id="signupPassword" minlength="6" required>
        </div>
        <div class="field">
          <label for="signupPasswordConfirm">Re-enter password</label>
          <input type="password" id="signupPasswordConfirm" minlength="6" required>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Create account</button>
      </form>
    </div>
    <p class="auth-switch">Already have an account? <a href="#/login">Log in</a></p>
  </div>`;
}

export function mountSignupPage() {
  const roleToggle = document.getElementById("roleToggle");
  const roleInput = document.getElementById("signupRole");
  roleToggle?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-role]");
    if (!btn) return;
    roleInput.value = btn.getAttribute("data-role");
    roleToggle.querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
  });

  document.getElementById("signupForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fullName = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const passwordConfirm = document.getElementById("signupPasswordConfirm").value;
    const role = roleInput.value;
    if (password !== passwordConfirm) {
      showAuthError("Those passwords don't match.");
      return;
    }
    try {
      const { session } = await signUp({ email, password, fullName, role });
      if (!session) {
        // Email confirmation is required on this project -- there's no
        // active session yet, so a guarded route would just bounce back
        // to /login (which would itself fail until they confirm).
        showConfirmEmailNotice(email);
        return;
      }
      navigate(role === "caregiver" ? "/list-your-services" : "/onboarding");
    } catch (err) {
      showAuthError(err.message || "Couldn't create that account.");
    }
  });
}

function showConfirmEmailNotice(email) {
  const card = document.querySelector(".auth-card");
  if (!card) return;
  card.innerHTML = `
    <div class="confirm-panel">
      <h3>Check your email</h3>
      <p>We sent a confirmation link to ${escapeHtml(email)}. Click it, then come back and log in.</p>
      <a class="btn btn-primary" href="#/login" style="margin-top:14px;">Go to login</a>
    </div>`;
}

export function AdminLoginPage() {
  return `
  <div class="auth-page">
    <h1>Admin login</h1>
    <p>Restricted to Saathi administrators.</p>
    <div class="auth-card">
      <div id="authError"></div>
      <form id="adminLoginForm">
        <div class="field">
          <label for="adminEmail">Email</label>
          <input type="email" id="adminEmail" required>
        </div>
        <div class="field">
          <label for="adminPassword">Password</label>
          <input type="password" id="adminPassword" required>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Log in</button>
      </form>
    </div>
  </div>`;
}

export function mountAdminLoginPage() {
  document.getElementById("adminLoginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value;
    try {
      await signIn({ email, password });
      if (!isAdmin()) {
        showAuthError("That account doesn't have admin access.");
        return;
      }
      navigate("/admin");
    } catch (err) {
      showAuthError(err.message || "Couldn't log in.");
    }
  });
}

function showAuthError(msg) {
  const el = document.getElementById("authError");
  if (el) el.innerHTML = `<div class="auth-error">${escapeHtml(msg)}</div>`;
}
