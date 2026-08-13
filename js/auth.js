import { supabase } from "./supabaseClient.js";

let currentSession = null;
let currentProfile = null;
const listeners = new Set();

async function loadProfile(userId) {
  if (!userId) return null;
  const { data } = await supabase.from("profiles").select("id, role, full_name").eq("id", userId).maybeSingle();
  return data || null;
}

async function refresh(session) {
  currentSession = session;
  currentProfile = session ? await loadProfile(session.user.id) : null;
  for (const fn of listeners) fn({ session: currentSession, profile: currentProfile });
}

export async function initAuth() {
  const { data } = await supabase.auth.getSession();
  await refresh(data.session);
  supabase.auth.onAuthStateChange((_event, session) => {
    refresh(session);
  });
}

export function onAuthChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSession() {
  return currentSession;
}
export function getProfile() {
  return currentProfile;
}
export function isSignedIn() {
  return !!currentSession;
}
export function isAdmin() {
  return currentProfile?.role === "admin";
}
export function isCaregiver() {
  return currentProfile?.role === "caregiver";
}
export function isFamily() {
  return currentProfile?.role === "family";
}

export async function signUp({ email, password, fullName, role }) {
  const safeRole = role === "caregiver" ? "caregiver" : "family";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role: safeRole } },
  });
  if (error) throw error;
  if (data.session) await refresh(data.session);
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await refresh(data.session);
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
  await refresh(null);
}
