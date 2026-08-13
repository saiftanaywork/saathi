// Public project URL + publishable (anon) key -- safe to expose client-side,
// this is how every buildless Supabase static site wires up auth/DB access.
// All access control lives in Postgres Row Level Security, not in this key.
const SUPABASE_URL = "https://mewxvenveejwxscsnnkw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_vn_fxMbyvP_lYYDEWhlhJg_XtDyNaR5";

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
