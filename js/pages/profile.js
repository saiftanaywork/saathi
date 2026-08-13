import { escapeHtml, CARE_TYPES, pinIcon, clockIcon, shieldIcon, starIcon, chevronLeftIcon } from "../constants.js";
import { fetchCaregiverById, toggleFavorite, isFavorite, fetchReviews, fetchMyReview, submitReview } from "../api.js";
import { openContactModal } from "../components/modal.js";
import { avatarMarkup } from "../components/caregiverCard.js";
import { RatingSummary, StarInput, attachStarInput } from "../components/starRating.js";
import { isSignedIn, isFamily, getSession } from "../auth.js";

export function ProfilePage() {
  return `<div class="container" id="profileArea" style="padding:40px 0 80px;">Loading...</div>`;
}

export async function mountProfilePage(id) {
  const area = document.getElementById("profileArea");
  if (!area) return;
  const cg = await fetchCaregiverById(id).catch(() => null);
  if (!cg) {
    area.innerHTML = `<div class="empty-state"><h3>Caregiver not found</h3><p><a href="#/browse">Back to browse</a></p></div>`;
    return;
  }
  const session = getSession();
  const fav = isSignedIn() ? await isFavorite(session.user.id, cg.id).catch(() => false) : false;
  const reviews = await fetchReviews(cg.id).catch(() => []);
  const myReview = isSignedIn() && isFamily() ? await fetchMyReview(cg.id, session.user.id).catch(() => null) : null;

  area.innerHTML = `
    <a href="#/browse" style="display:inline-flex;align-items:center;gap:4px;color:var(--ink-soft);font-size:14px;font-weight:600;margin-bottom:18px;text-decoration:none;">${chevronLeftIcon()} Back to browse</a>
    <div class="profile-head">
      ${avatarMarkup(cg, "lg")}
      <div style="flex:1;">
        <h1 style="margin-bottom:4px;">${escapeHtml(cg.name)}</h1>
        <p style="color:var(--ink-soft);margin-bottom:10px;">${escapeHtml(cg.headline)}</p>
        <div style="margin-bottom:10px;">${RatingSummary(cg.ratingAvg, cg.ratingCount)}</div>
        <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;font-size:14px;color:var(--ink-soft);">
          <span style="display:inline-flex;align-items:center;gap:5px;">${pinIcon()} ${escapeHtml(cg.city)}</span>
          <span style="display:inline-flex;align-items:center;gap:5px;">${clockIcon()} ${escapeHtml(cg.availability)}</span>
          ${cg.backgroundStatus === "verified" ? `<span class="verified-badge">${shieldIcon()} Verified by Saathi</span>` : ""}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-end;">
        <div class="cg-rate" style="font-size:22px;">$${cg.rate}<span>/hr</span></div>
        <div style="display:flex;gap:8px;">
          <button class="fav-btn ${fav ? "is-fav" : ""}" id="profileFavBtn">${starIcon(fav)}</button>
          <button class="btn btn-primary" id="contactBtn">Contact</button>
        </div>
      </div>
    </div>

    <div class="tag-row" style="margin-bottom:24px;">
      ${cg.languages.map((l) => `<span class="tag tag-lang">${escapeHtml(l)}</span>`).join("")}
      ${cg.careTypes.map((t) => `<span class="tag tag-care">${escapeHtml(CARE_TYPES[t] || t)}</span>`).join("")}
    </div>

    <div style="max-width:70ch;">
      <h3 style="margin-bottom:10px;">About</h3>
      <p style="color:var(--ink-soft);line-height:1.7;">${escapeHtml(cg.bio)}</p>
      <p style="color:var(--ink-faint);font-size:14px;margin-top:14px;">${cg.experienceYears} years of experience</p>
    </div>

    <div class="reviews-section">
      <h3>Reviews${cg.ratingCount ? ` (${cg.ratingCount})` : ""}</h3>
      <div id="reviewFormArea"></div>
      <div id="reviewsList">
        ${
          reviews.length
            ? reviews.map((r) => Testimonial(r)).join("")
            : `<p style="color:var(--ink-faint);font-size:14px;">No reviews yet — be the first to share how it went.</p>`
        }
      </div>
    </div>
  `;

  document.getElementById("reviewFormArea").innerHTML = ReviewFormOrPrompt(cg, myReview);
  wireReviewForm(cg, myReview);

  document.getElementById("contactBtn")?.addEventListener("click", () => openContactModal(cg));
  document.getElementById("profileFavBtn")?.addEventListener("click", async (e) => {
    if (!isSignedIn()) {
      location.hash = "#/login";
      return;
    }
    const btn = e.currentTarget;
    const nowFav = !btn.classList.contains("is-fav");
    try {
      await toggleFavorite(session.user.id, cg.id, nowFav);
      btn.classList.toggle("is-fav", nowFav);
      btn.innerHTML = starIcon(nowFav);
    } catch {
      // ignore
    }
  });
}

function Testimonial(r) {
  return `
    <div class="testimonial-card">
      <div class="testimonial-head">
        <span class="testimonial-name">${escapeHtml(r.familyName)}</span>
        <span class="testimonial-date">${new Date(r.createdAt).toLocaleDateString()}</span>
      </div>
      <div style="color:var(--ochre);display:inline-flex;margin-bottom:6px;">${Array.from({ length: 5 }, (_, i) => (i < r.rating ? starIcon(true) : starIcon(false))).join("")}</div>
      <p class="testimonial-body">${escapeHtml(r.comment)}</p>
    </div>`;
}

function ReviewFormOrPrompt(cg, myReview) {
  if (!isSignedIn()) {
    return `<p style="color:var(--ink-faint);font-size:14px;margin-bottom:20px;"><a href="#/login">Log in</a> to leave a review.</p>`;
  }
  if (!isFamily()) return "";
  return `
    <div class="review-form">
      <h4 style="margin-bottom:12px;">${myReview ? "Update your review" : "Leave a review"}</h4>
      <div id="reviewError"></div>
      <form id="reviewForm">
        <div class="field">
          <label>Rating</label>
          ${StarInput("review", myReview?.rating || 0)}
        </div>
        <div class="field">
          <label for="reviewComment">Comment</label>
          <textarea id="reviewComment" placeholder="How did it go?">${myReview?.comment ? escapeHtml(myReview.comment) : ""}</textarea>
        </div>
        <button type="submit" class="btn btn-secondary">${myReview ? "Update review" : "Post review"}</button>
      </form>
    </div>`;
}

function wireReviewForm(cg, myReview) {
  if (!isSignedIn() || !isFamily()) return;
  let rating = myReview?.rating || 0;
  attachStarInput("review", (val) => (rating = val));

  document.getElementById("reviewForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const comment = document.getElementById("reviewComment").value.trim();
    const errEl = document.getElementById("reviewError");
    if (!rating) {
      errEl.innerHTML = `<div class="auth-error">Pick a star rating first.</div>`;
      return;
    }
    try {
      await submitReview({ caregiverId: cg.id, familyId: getSession().user.id, rating, comment });
      mountProfilePage(cg.id);
    } catch (err) {
      errEl.innerHTML = `<div class="auth-error">${escapeHtml(err.message || "Couldn't save that review.")}</div>`;
    }
  });
}
