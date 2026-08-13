import { starIcon } from "../constants.js";

// Static display: e.g. 4.3 (12 reviews)
export function RatingSummary(avg, count) {
  if (!count) return `<span style="color:var(--ink-faint);font-size:13.5px;">No reviews yet</span>`;
  const stars = Array.from({ length: 5 }, (_, i) => starIcon(i < Math.round(avg))).join("");
  return `<span style="display:inline-flex;align-items:center;gap:6px;">
    <span style="display:inline-flex;color:var(--ochre);">${stars}</span>
    <b>${avg.toFixed(1)}</b>
    <span style="color:var(--ink-faint);font-size:13.5px;">(${count} review${count === 1 ? "" : "s"})</span>
  </span>`;
}

// Interactive 1-5 star picker. Renders radio-like buttons; call
// attachStarInput() after inserting into the DOM.
export function StarInput(name, value = 0) {
  return `<div class="star-input" id="${name}Stars" data-value="${value}">
    ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" aria-label="${n} star${n === 1 ? "" : "s"}">${starIcon(n <= value)}</button>`).join("")}
  </div>`;
}

export function attachStarInput(name, onChange) {
  const el = document.getElementById(`${name}Stars`);
  if (!el) return;
  const paint = (val) => {
    el.querySelectorAll("[data-star]").forEach((btn) => {
      const n = Number(btn.getAttribute("data-star"));
      btn.innerHTML = starIcon(n <= val);
    });
  };
  el.querySelectorAll("[data-star]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = Number(btn.getAttribute("data-star"));
      el.setAttribute("data-value", String(val));
      paint(val);
      onChange(val);
    });
    btn.addEventListener("mouseenter", () => paint(Number(btn.getAttribute("data-star"))));
  });
  el.addEventListener("mouseleave", () => paint(Number(el.getAttribute("data-value"))));
}
