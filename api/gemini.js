// Vercel serverless function: a small proxy in front of the Gemini API, so
// the key lives in a Vercel environment variable and never reaches the browser.
//
// - Only signed-in Travelify users can call it (their Supabase token is checked).
// - Each user gets a daily request budget (AI_DAILY_LIMIT, default 200).
// - The browser sends { action: "models" } or { action: "generate", model, payload }.
//
// Setup is in README.md ("Turning on the AI proxy").

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 200);
// Public values (same as config.js); env vars override them if you ever change projects.
const SUPABASE_URL = process.env.SUPABASE_URL || "https://vmrjdyulamtubpvkaefo.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtcmpkeXVsYW10dWJwdmthZWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NjAxNjksImV4cCI6MjEwNjQzNjE2OX0.jyT9aSvAHRWMW897hBrg-anCe7XTyGUppk0eMDOs4Nk";
const MAX_BODY_CHARS = 60000;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

const fail = (res, status, message) => send(res, status, { error: { message } });

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "POST only.");

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return fail(res, 500, "AI isn't set up on the server yet.");

  let body = req.body;
  if (typeof body === "string") {
    if (body.length > MAX_BODY_CHARS) return fail(res, 413, "That request is too large.");
    try {
      body = JSON.parse(body);
    } catch (e) {
      return fail(res, 400, "Bad request.");
    }
  }
  if (!body || typeof body !== "object" || JSON.stringify(body).length > MAX_BODY_CHARS) return fail(res, 400, "Bad request.");

  // Signed-in users only: ask Supabase who this token belongs to.
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return fail(res, 401, "Sign in to use the AI features.");
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return fail(res, 401, "Sign in to use the AI features.");

  if (body.action === "models") {
    const r = await fetch(`${GEMINI}/models?pageSize=200`, { headers: { "x-goog-api-key": geminiKey } });
    return send(res, r.status, await r.text());
  }

  if (body.action === "generate") {
    const model = String(body.model || "");
    if (!/^gemini-[\w.\-]+$/.test(model)) return fail(res, 400, "Unknown model.");
    const payload = body.payload || {};
    if (!Array.isArray(payload.contents)) return fail(res, 400, "Bad request.");

    // Daily budget, counted in Supabase under the caller's own login.
    const useRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ai_use_self`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_limit: DAILY_LIMIT }),
    });
    if (!useRes.ok) return fail(res, 500, "AI usage tracking isn't set up yet (run the latest supabase/schema.sql).");
    if ((await useRes.json()) !== true) return fail(res, 403, "You've reached today's AI limit. Try again tomorrow.");

    // Forward only the fields the app uses.
    const forward = { contents: payload.contents };
    if (payload.generationConfig) forward.generationConfig = payload.generationConfig;
    const r = await fetch(`${GEMINI}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
      body: JSON.stringify(forward),
    });
    return send(res, r.status, await r.text());
  }

  return fail(res, 400, "Unknown action.");
};
