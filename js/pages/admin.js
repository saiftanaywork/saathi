import { escapeHtml } from "../constants.js";
import { listPendingBackgroundChecks, reviewBackgroundCheck, listAllUsers, listDocumentsForCaregiver, getDocumentSignedUrl, listRecentErrors } from "../api.js";

export function AdminPage() {
  return `
  <div class="container admin-page">
    <h1 style="margin-bottom:6px;">Admin dashboard</h1>
    <p style="color:var(--ink-soft);margin-bottom:10px;">Review background-check requests and see who's signed up.</p>

    <div class="admin-section">
      <h2>Pending background checks</h2>
      <div id="bgQueue">Loading...</div>
    </div>

    <div class="admin-section">
      <h2>Users</h2>
      <div id="userList">Loading...</div>
    </div>

    <div class="admin-section">
      <h2>Recent errors</h2>
      <p style="color:var(--ink-soft);font-size:13.5px;margin-bottom:10px;">Uncaught client-side errors, most recent first. Self-reported by the site — see js/errorTracking.js.</p>
      <div id="errorList">Loading...</div>
    </div>
  </div>`;
}

async function renderQueue() {
  const el = document.getElementById("bgQueue");
  if (!el) return;
  const rows = await listPendingBackgroundChecks().catch(() => []);
  if (!rows.length) {
    el.innerHTML = `<div class="admin-empty">No pending requests.</div>`;
    return;
  }
  el.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Caregiver</th><th>Requested</th><th>Documents</th><th></th></tr></thead>
      <tbody>
        ${rows
          .map(
            (r) => `
          <tr data-row="${r.id}">
            <td>${escapeHtml(r.profiles?.full_name || "Unknown")}</td>
            <td>${new Date(r.requested_at).toLocaleDateString()}</td>
            <td class="admin-doc-list" id="docs-${r.caregiver_id}">Loading...</td>
            <td>
              <button class="btn btn-primary btn-sm" data-verify="${r.id}">Verify</button>
              <button class="btn btn-ghost btn-sm" data-reject="${r.id}">Reject</button>
            </td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;

  el.querySelectorAll("[data-verify]").forEach((btn) =>
    btn.addEventListener("click", () => decide(btn.getAttribute("data-verify"), "verified"))
  );
  el.querySelectorAll("[data-reject]").forEach((btn) =>
    btn.addEventListener("click", () => decide(btn.getAttribute("data-reject"), "rejected"))
  );

  rows.forEach((r) => renderDocsCell(r.caregiver_id));
}

async function renderDocsCell(caregiverId) {
  const cell = document.getElementById(`docs-${caregiverId}`);
  if (!cell) return;
  const docs = await listDocumentsForCaregiver(caregiverId).catch(() => []);
  if (!docs.length) {
    cell.innerHTML = `<span style="color:var(--ink-faint);">None uploaded</span>`;
    return;
  }
  cell.innerHTML = docs.map((d) => `<a href="#" data-doc="${d.file_path}">${escapeHtml(d.file_name)}</a>`).join("");
  cell.querySelectorAll("[data-doc]").forEach((link) => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        const url = await getDocumentSignedUrl(link.getAttribute("data-doc"));
        window.open(url, "_blank", "noopener,noreferrer");
      } catch {
        alert("Couldn't open that document.");
      }
    });
  });
}

async function decide(id, status) {
  await reviewBackgroundCheck(id, status).catch(() => {});
  renderQueue();
}

async function renderUsers() {
  const el = document.getElementById("userList");
  if (!el) return;
  const users = await listAllUsers().catch(() => []);
  el.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Name</th><th>Role</th><th>Joined</th></tr></thead>
      <tbody>
        ${users
          .map(
            (u) => `
          <tr>
            <td>${escapeHtml(u.full_name || "—")}</td>
            <td><span class="status-pill ${u.role === "admin" ? "verified" : "pending"}">${escapeHtml(u.role)}</span></td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

async function renderErrors() {
  const el = document.getElementById("errorList");
  if (!el) return;
  const rows = await listRecentErrors().catch(() => []);
  if (!rows.length) {
    el.innerHTML = `<div class="admin-empty">No errors reported.</div>`;
    return;
  }
  el.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Message</th><th>Page</th><th>When</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (r) => `
          <tr>
            <td>${escapeHtml(r.message)}</td>
            <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(r.url || "")}</td>
            <td>${new Date(r.created_at).toLocaleString()}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

export async function mountAdminPage() {
  await Promise.all([renderQueue(), renderUsers(), renderErrors()]);
}
