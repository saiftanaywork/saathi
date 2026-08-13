import { fetchCaregivers, listFavoriteIds, toggleFavorite } from "../api.js";
import { CaregiverCard, attachFavoriteHandlers } from "../components/caregiverCard.js";
import { getSession } from "../auth.js";

export function FavoritesPage() {
  return `
  <div class="container" style="padding:40px 0 90px;">
    <h1 style="margin-bottom:6px;">Saved caregivers</h1>
    <p style="color:var(--ink-soft);margin-bottom:24px;">Caregivers you've starred while browsing.</p>
    <div id="favArea">Loading...</div>
  </div>`;
}

export async function mountFavoritesPage() {
  const area = document.getElementById("favArea");
  if (!area) return;
  const session = getSession();
  const [all, favIds] = await Promise.all([fetchCaregivers().catch(() => []), listFavoriteIds(session.user.id).catch(() => new Set())]);
  const favs = all.filter((cg) => favIds.has(cg.id));

  render(favs, favIds);

  function render(list, ids) {
    if (!list.length) {
      area.innerHTML = `<div class="empty-state"><h3>No saved caregivers yet</h3><p>Star a caregiver from browse or their profile to save them here.</p></div>`;
      return;
    }
    area.innerHTML = `<div class="results-grid">${list.map((cg) => CaregiverCard(cg, { mode: "grid", isFav: ids.has(cg.id) })).join("")}</div>`;
    attachFavoriteHandlers(area, async (caregiverId) => {
      await toggleFavorite(session.user.id, caregiverId, false).catch(() => {});
      const nextList = list.filter((cg) => cg.id !== caregiverId);
      ids.delete(caregiverId);
      render(nextList, ids);
    });
  }
}
