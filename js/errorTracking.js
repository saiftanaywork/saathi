// Minimal, self-hosted error tracking -- no third-party account required.
// Reports uncaught errors/rejections to the error_logs table (admin-only
// read, see supabase/migrations/0003_error_logs.sql), capped per page load
// so an error loop can't flood the database.
import { supabase } from "./supabaseClient.js";
import { getSession } from "./auth.js";

const MAX_REPORTS_PER_LOAD = 5;
let reportCount = 0;

async function report(message, stack, context) {
  if (reportCount >= MAX_REPORTS_PER_LOAD) return;
  reportCount++;
  try {
    await supabase.from("error_logs").insert({
      message: String(message).slice(0, 2000),
      stack: stack ? String(stack).slice(0, 4000) : null,
      url: location.href,
      user_id: getSession()?.user?.id || null,
      context,
    });
  } catch {
    // Reporting failures are intentionally swallowed -- error tracking
    // must never itself throw or loop.
  }
}

export function initErrorTracking() {
  window.addEventListener("error", (e) => {
    report(e.message, e.error?.stack, { type: "error", filename: e.filename, lineno: e.lineno });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    report(reason?.message || String(reason), reason?.stack, { type: "unhandledrejection" });
  });
}
