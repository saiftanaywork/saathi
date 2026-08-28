// One-shot handoff from the pre-signup "get started" wizard into the
// existing post-signup family quiz (pages/onboarding.js), so a freshly
// signed-up family doesn't have to re-answer the care-type/city question
// they already picked before creating their account.

let seed = null;

export function setOnboardingSeed(value) {
  seed = value;
}

export function takeOnboardingSeed() {
  const value = seed;
  seed = null;
  return value;
}

// Same idea, one step earlier: the landing page's city search hands its pick
// to the get-started wizard so the city step opens pre-selected.
let startCity = null;

export function setStartCity(city) {
  startCity = city;
}

export function takeStartCity() {
  const city = startCity;
  startCity = null;
  return city;
}

// Same idea again: a CTA that already declares intent ("List your
// services", the hero search) can skip the get-started wizard's fork
// screen instead of asking a question it already knows the answer to.
let startRole = null;

export function setStartRole(role) {
  startRole = role;
}

export function takeStartRole() {
  const role = startRole;
  startRole = null;
  return role;
}
