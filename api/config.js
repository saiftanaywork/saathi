// Vercel Serverless Function (zero-config: any file under /api is picked up
// automatically, no build step or package.json required for a plain
// function like this one).
//
// Lets the Supabase project this site talks to vary per Vercel environment
// (Production / Preview / Development) via environment variables set in
// the dashboard, instead of being hardcoded in client JS.
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || null,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null,
  });
}
