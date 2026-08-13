import { escapeHtml } from "../constants.js";
import { listPendingBackgroundChecks, reviewBackgroundCheck, listAllUsers } from "../api.js";

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
      <thead><tr><th>Caregiver</th><th>Requested</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${rows
          .map(
            (r) => `
          <tr data-row="${r.id}">
            <td>${escapeHtml(r.profiles?.full_name || "Unknown")}</td>
            <td>${new Date(r.requested_at).toLocaleDateString()}</td>
            <td><span class="status-pill pending">Pending</span></td>
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

export async function mountAdminPage() {
  await Promise.all([renderQueue(), renderUsers()]);
}
