import { escapeHtml, closeIcon, checkIcon } from "../constants.js";
import { isSignedIn, getSession } from "../auth.js";
import { sendContactRequest } from "../api.js";

let state = { open: false, caregiver: null, sent: false, error: null };

export function openContactModal(caregiver) {
  state = { open: true, caregiver, sent: false, error: null };
  render();
}
function closeModal() {
  state = { open: false, caregiver: null, sent: false, error: null };
  render();
}

function render() {
  const layer = document.getElementById("modalLayer");
  if (!layer) return;
  layer.innerHTML = ModalLayer();
  attachModalHandlers();
}

export function ModalLayer() {
  if (!state.open || !state.caregiver) return "";
  const cg = state.caregiver;
  return `
  <div class="modal-overlay" id="modalOverlay">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      ${state.sent ? ContactSentPanel(cg) : signedInPanelOrPrompt(cg)}
    </div>
  </div>`;
}

function signedInPanelOrPrompt(cg) {
  if (!isSignedIn()) {
    return `
    <div class="modal-head">
      <div><h3 id="modalTitle">Log in to contact ${escapeHtml(cg.name.split(" ")[0])}</h3></div>
      <button class="modal-close" id="modalClose" aria-label="Close">${closeIcon()}</button>
    </div>
    <p style="color:var(--ink-soft);margin-bottom:18px;">Create a free account so caregivers know who's reaching out.</p>
    <a class="btn btn-primary btn-block" href="#/login" id="modalLoginLink">Log in or sign up</a>
    `;
  }
  return ContactFormPanel(cg);
}

function ContactFormPanel(cg) {
  const firstName = escapeHtml(cg.name.split(" ")[0]);
  return `
    <div class="modal-head">
      <div>
        <h3 id="modalTitle">Contact ${escapeHtml(cg.name)}</h3>
        <p>Saathi passes your message along — everything else is between you two.</p>
      </div>
      <button class="modal-close" id="modalClose" aria-label="Close">${closeIcon()}</button>
    </div>
    ${state.error ? `<div class="auth-error">${escapeHtml(state.error)}</div>` : ""}
    <form id="contactForm">
      <div class="field">
        <label for="contactMessage">Message</label>
        <textarea id="contactMessage" name="contactMessage" required placeholder="Hi ${firstName}, I saw your listing on Saathi and wanted to ask about..."></textarea>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Send message</button>
    </form>
  `;
}

function ContactSentPanel(cg) {
  return `
    <div class="modal-head">
      <div></div>
      <button class="modal-close" id="modalClose" aria-label="Close">${closeIcon()}</button>
    </div>
    <div class="confirm-panel">
      <div class="confirm-icon">${checkIcon()}</div>
      <h3>Message sent</h3>
      <p>${escapeHtml(cg.name.split(" ")[0])} will see your message and can reach out directly.</p>
      <button class="btn btn-secondary" id="modalDone" style="margin-top:18px;">Done</button>
    </div>
  `;
}

function attachModalHandlers() {
  const overlay = document.getElementById("modalOverlay");
  if (!overlay) return;
  overlay.addEventListener("click", (e) => {
    if (e.target.id === "modalOverlay") closeModal();
  });
  const closeBtn = document.getElementById("modalClose");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  const doneBtn = document.getElementById("modalDone");
  if (doneBtn) doneBtn.addEventListener("click", closeModal);

  const form = document.getElementById("contactForm");
  if (form) form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = document.getElementById("contactMessage").value.trim();
    if (!message) return;
    try {
      await sendContactRequest({ familyId: getSession().user.id, caregiverId: state.caregiver.id, message });
      state.sent = true;
      render();
    } catch (err) {
      state.error = err.message || "Couldn't send that. Try again.";
      render();
    }
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && state.open) closeModal();
});

window.addEventListener("hashchange", () => {
  if (state.open) closeModal();
});
