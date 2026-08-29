import { supabase } from "./supabaseClient.js";

const CAREGIVER_COLUMNS = `
  id, headline, bio, city, languages, care_types, rate, experience_years,
  availability, initials, accent, photo_url, extra_photo_urls, created_at,
  profiles!caregiver_profiles_id_fkey ( full_name )
`;

// background_checks and reviews have no direct FK to caregiver_profiles
// (only to profiles), so PostgREST can't auto-embed them there -- fetch
// separately and merge client-side.
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

async function ratingSummaries(ids) {
  if (!ids.length) return new Map();
  const { data, error } = await supabase.from("reviews").select("caregiver_id, rating").in("caregiver_id", ids);
  if (error) throw error;
  const map = new Map();
  for (const row of data || []) {
    const entry = map.get(row.caregiver_id) || { sum: 0, count: 0 };
    entry.sum += row.rating;
    entry.count += 1;
    map.set(row.caregiver_id, entry);
  }
  const result = new Map();
  for (const [id, { sum, count }] of map) result.set(id, { avg: sum / count, count });
  return result;
}

function normalizeCaregiver(row, backgroundStatus, rating) {
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
    photoUrl: row.photo_url || null,
    extraPhotoUrls: row.extra_photo_urls || [],
    backgroundStatus: backgroundStatus || "none",
    ratingAvg: rating?.avg || 0,
    ratingCount: rating?.count || 0,
  };
}

export async function fetchCaregivers() {
  const { data, error } = await supabase
    .from("caregiver_profiles")
    .select(CAREGIVER_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data || [];
  const ids = rows.map((r) => r.id);
  const [statuses, ratings] = await Promise.all([latestBackgroundStatuses(ids), ratingSummaries(ids)]);
  return rows.map((row) => normalizeCaregiver(row, statuses.get(row.id), ratings.get(row.id)));
}

export async function fetchCaregiverById(id) {
  const { data, error } = await supabase
    .from("caregiver_profiles")
    .select(CAREGIVER_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [statuses, ratings] = await Promise.all([latestBackgroundStatuses([id]), ratingSummaries([id])]);
  return normalizeCaregiver(data, statuses.get(id), ratings.get(id));
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

// A genuine UPDATE, not an upsert: Postgres validates a table's not-null
// constraints against the row an INSERT ... ON CONFLICT DO UPDATE *would*
// insert before it even checks for a conflict, so upsertCaregiverProfile()
// with a partial field set (e.g. just photo_url) fails against an existing
// row with "null value in column city" even though city is never touched.
// UPDATE only validates the columns it actually sets, so this is the right
// call for patching one or two fields on a listing known to already exist.
export async function updateCaregiverProfile(id, fields) {
  const { error } = await supabase.from("caregiver_profiles").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", id);
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

export async function countFamilyInterest({ city, careType }) {
  const { data, error } = await supabase.rpc("count_family_interest", { p_city: city, p_care_type: careType });
  if (error) throw error;
  return data || 0;
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

// ---------------------------------------------------------------------
// Reviews / testimonials
// ---------------------------------------------------------------------

export async function fetchReviews(caregiverId) {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, family_id, profiles!reviews_family_id_fkey ( full_name )")
    .eq("caregiver_id", caregiverId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
    familyId: r.family_id,
    familyName: r.profiles?.full_name || "A Saathi family",
  }));
}

export async function fetchRecentReviews(limit = 3) {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, family_id, caregiver_id, profiles!reviews_family_id_fkey ( full_name )")
    .gte("rating", 4)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
    familyName: r.profiles?.full_name || "A Saathi family",
    caregiverId: r.caregiver_id,
  }));
}

export async function fetchMyReview(caregiverId, familyId) {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment")
    .eq("caregiver_id", caregiverId)
    .eq("family_id", familyId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function submitReview({ caregiverId, familyId, rating, comment }) {
  const { error } = await supabase
    .from("reviews")
    .upsert({ caregiver_id: caregiverId, family_id: familyId, rating, comment, updated_at: new Date().toISOString() }, { onConflict: "family_id,caregiver_id" });
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Photo upload (Supabase Storage: public "avatars" bucket)
// ---------------------------------------------------------------------

export async function uploadAvatar(userId, file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/avatar.${ext}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  // Only patch an existing listing immediately (edit mode). For a caregiver
  // still in the first-time wizard, caregiver_profiles has no row yet --
  // city is not-null with no default, so an upsert here would fail. The
  // wizard's own finishWizard() already sends photo_url as part of its
  // full upsert once the listing is actually created.
  const { data: existing } = await supabase.from("caregiver_profiles").select("id").eq("id", userId).maybeSingle();
  if (existing) {
    await updateCaregiverProfile(userId, { photo_url: url });
  }
  return url;
}

const MAX_EXTRA_PHOTOS = 3;

export async function addExtraPhoto(userId, file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/extra_${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  const { data: row, error: fetchError } = await supabase.from("caregiver_profiles").select("extra_photo_urls").eq("id", userId).maybeSingle();
  if (fetchError) throw fetchError;
  const updated = [...(row?.extra_photo_urls || []), url].slice(0, MAX_EXTRA_PHOTOS);
  await updateCaregiverProfile(userId, { extra_photo_urls: updated });
  return updated;
}

export async function removeExtraPhoto(userId, url) {
  const { data: row, error: fetchError } = await supabase.from("caregiver_profiles").select("extra_photo_urls").eq("id", userId).maybeSingle();
  if (fetchError) throw fetchError;
  const updated = (row?.extra_photo_urls || []).filter((u) => u !== url);
  await updateCaregiverProfile(userId, { extra_photo_urls: updated });
  return updated;
}

// ---------------------------------------------------------------------
// Verification documents (Supabase Storage: private "verification-docs")
// ---------------------------------------------------------------------

export async function uploadVerificationDocument(userId, file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${Date.now()}_${safeName}`;
  const { error: uploadError } = await supabase.storage.from("verification-docs").upload(path, file, { contentType: file.type });
  if (uploadError) throw uploadError;
  const { error } = await supabase.from("verification_documents").insert({ caregiver_id: userId, file_path: path, file_name: file.name });
  if (error) throw error;
}

export async function listMyDocuments(userId) {
  const { data, error } = await supabase
    .from("verification_documents")
    .select("id, file_path, file_name, uploaded_at")
    .eq("caregiver_id", userId)
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listDocumentsForCaregiver(caregiverId) {
  const { data, error } = await supabase
    .from("verification_documents")
    .select("id, file_path, file_name, uploaded_at")
    .eq("caregiver_id", caregiverId)
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getDocumentSignedUrl(filePath) {
  const { data, error } = await supabase.storage.from("verification-docs").createSignedUrl(filePath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export async function listRecentErrors(limit = 20) {
  const { data, error } = await supabase
    .from("error_logs")
    .select("id, message, url, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
