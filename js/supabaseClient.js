// Resolves Supabase config from the /api/config serverless function, which
// reads SUPABASE_URL / SUPABASE_ANON_KEY from Vercel environment variables
// -- set per environment (Production / Preview / Development) in the
// project dashboard, or via `vercel env pull` for local `vercel dev`. See
// README.md "Environment variables" for setup.
//
// Falls back to the known dev project when /api isn't available (e.g.
// serving this as plain static files with `python3 -m http.server` rather
// than `vercel dev`). The anon/publishable key is safe to expose client
// side either way -- access control is enforced by Postgres RLS, not by
// keeping this value secret.
const FALLBACK_URL = "https://mewxvenveejwxscsnnkw.supabase.co";
const FALLBACK_KEY = "sb_publishable_vn_fxMbyvP_lYYDEWhlhJg_XtDyNaR5";

async function resolveConfig() {
  try {
    const res = await fetch("/api/config", { cache: "no-store" });
    if (!res.ok) throw new Error(`config endpoint returned ${res.status}`);
    const data = await res.json();
    if (!data.supabaseUrl || !data.supabaseAnonKey) throw new Error("env vars not set for this environment");
    return { url: data.supabaseUrl, key: data.supabaseAnonKey };
  } catch {
    return { url: FALLBACK_URL, key: FALLBACK_KEY };
  }
}

const { url, key } = await resolveConfig();
export const supabase = window.supabase.createClient(url, key);
