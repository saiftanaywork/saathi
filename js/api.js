import { supabase } from "./supabaseClient.js";

const CAREGIVER_COLUMNS = `
  id, headline, bio, city, languages, care_types, rate, experience_years,
  availability, initials, accent, created_at,
  profiles!caregiver_profiles_id_fkey ( full_name )
`;

// background_checks has no direct FK to caregiver_profiles (only to
// profiles), so PostgREST can't auto-embed it there -- fetch separately and
// merge the latest status per caregiver client-side.
async function latestBackgroundStatuses(ids) {
  if (!ids.length) return new Map();
  const { data, error } = await supabase
    .from("background_checks")
    .select("caregiver_id, status, requested_at")
    .in("caregiver_id", ids)
    .order("requested_at", { ascending: false });
  if (error) throw error;
  const map = new Map();
  for (const row of data || []) {
    if (!map.has(row.caregiver_id)) map.set(row.caregiver_id, row.status);
  }
  return map;
}

function normalizeCaregiver(row, backgroundStatus) {
  return {
    id: row.id,
    name: row.profiles?.full_name || "",
    headline: row.headline,
    bio: row.bio,
    city: row.city,
    languages: row.languages || [],
    careTypes: row.care_types || [],
    rate: row.rate,
    experienceYears: row.experience_years,
    availability: row.availability,
    initials: row.initials,
    accent: row.accent,
    backgroundStatus: backgroundStatus || "none",
  };
}

export async function fetchCaregivers() {
  const { data, error } = await supabase
    .from("caregiver_profiles")
    .select(CAREGIVER_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data || [];
  const statuses = await latestBackgroundStatuses(rows.map((r) => r.id));
  return rows.map((row) => normalizeCaregiver(row, statuses.get(row.id)));
}

export async function fetchCaregiverById(id) {
  const { data, error } = await supabase
    .from("caregiver_profiles")
    .select(CAREGIVER_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const statuses = await latestBackgroundStatuses([id]);
  return normalizeCaregiver(data, statuses.get(id));
}

export async function fetchMyCaregiverProfile(id) {
  const { data, error } = await supabase.from("caregiver_profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertCaregiverProfile(id, fields) {
  const { error } = await supabase.from("caregiver_profiles").upsert({ id, ...fields, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function logSearch({ familyId, languages, cities, careTypes, minRate, maxRate }) {
  if (!familyId) return;
  const { error } = await supabase.from("family_search_history").insert({
    family_id: familyId,
    languages,
    cities,
    care_types: careTypes,
    min_rate: minRate === "" ? null : minRate,
    max_rate: maxRate === "" ? null : maxRate,
  });
  if (error) throw error;
}

export async function matchCaregivers({ languages = [], cities = [], careTypes = [], minRate = null, maxRate = null, familyId = null }) {
  const { data, error } = await supabase.rpc("match_caregivers", {
    p_languages: languages,
    p_cities: cities,
    p_care_types: careTypes,
    p_min_rate: minRate === "" ? null : minRate,
    p_max_rate: maxRate === "" ? null : maxRate,
    p_family_id: familyId,
  });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.caregiver_id,
    name: row.full_name,
    headline: row.headline,
    city: row.city,
    languages: row.languages || [],
    careTypes: row.care_types || [],
    rate: row.rate,
    experienceYears: row.experience_years,
    availability: row.availability,
    initials: row.initials,
    accent: row.accent,
    backgroundStatus: row.background_status,
    score: Number(row.score),
  }));
}

export async function fetchMyBackgroundStatus(caregiverId) {
  const { data, error } = await supabase
    .from("background_checks")
    .select("status, requested_at")
    .eq("caregiver_id", caregiverId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.status || "none";
}

export async function requestBackgroundCheck(caregiverId) {
  const { error } = await supabase.from("background_checks").insert({ caregiver_id: caregiverId, status: "pending" });
  if (error) throw error;
}

export async function listPendingBackgroundChecks() {
  const { data, error } = await supabase
    .from("background_checks")
    .select("id, status, requested_at, caregiver_id, profiles!background_checks_caregiver_id_fkey ( full_name )")
    .eq("status", "pending")
    .order("requested_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function reviewBackgroundCheck(id, status) {
  const { error } = await supabase
    .from("background_checks")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function listAllUsers() {
  const { data, error } = await supabase.from("profiles").select("id, full_name, role, created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function sendContactRequest({ familyId, caregiverId, message }) {
  const { error } = await supabase.from("contact_requests").insert({ family_id: familyId, caregiver_id: caregiverId, message });
  if (error) throw error;
}

export async function isFavorite(familyId, caregiverId) {
  if (!familyId) return false;
  const { data } = await supabase.from("favorites").select("caregiver_id").eq("family_id", familyId).eq("caregiver_id", caregiverId).maybeSingle();
  return !!data;
}

export async function listFavoriteIds(familyId) {
  if (!familyId) return new Set();
  const { data, error } = await supabase.from("favorites").select("caregiver_id").eq("family_id", familyId);
  if (error) throw error;
  return new Set((data || []).map((r) => r.caregiver_id));
}

export async function toggleFavorite(familyId, caregiverId, shouldFavorite) {
  if (shouldFavorite) {
    const { error } = await supabase.from("favorites").insert({ family_id: familyId, caregiver_id: caregiverId });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("favorites").delete().eq("family_id", familyId).eq("caregiver_id", caregiverId);
    if (error) throw error;
  }
}
