// Supabase Edge Function: a small proxy in front of the Gemini API, so the
// API key lives on the server as a secret and never reaches the browser.
//
// - Only signed-in Travelify users can call it.
// - Each user gets a daily request budget (AI_DAILY_LIMIT, default 200).
// - The browser sends { action: "models" } or { action: "generate", model, payload }.
//
// Deploy steps are in README.md ("Turning on the AI proxy").

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";
const DAILY_LIMIT = Number(Deno.env.get("AI_DAILY_LIMIT") ?? "200");
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "*").split(",").map((s) => s.trim());
const MAX_BODY_CHARS = 60_000;

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGINS.includes("*") ? "*" : ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function reply(req: Request, body: unknown, status = 200) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

const fail = (req: Request, message: string, status: number) => reply(req, { error: { message } }, status);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return fail(req, "POST only.", 405);

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) return fail(req, "AI isn't set up on the server yet.", 500);

  const raw = await req.text();
  if (raw.length > MAX_BODY_CHARS) return fail(req, "That request is too large.", 413);
  let body: { action?: string; model?: string; payload?: Record<string, unknown> };
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(req, "Bad request.", 400);
  }

  // Signed-in users only (the public anon key alone is not enough).
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data, error: authError } = await supabase.auth.getUser(token);
  if (authError || !data.user) return fail(req, "Sign in to use the AI features.", 401);

  if (body.action === "models") {
    const res = await fetch(`${GEMINI}/models?pageSize=200`, { headers: { "x-goog-api-key": geminiKey } });
    return reply(req, await res.text(), res.status);
  }

  if (body.action === "generate") {
    const model = String(body.model ?? "");
    if (!/^gemini-[\w.\-]+$/.test(model)) return fail(req, "Unknown model.", 400);
    const payload = body.payload ?? {};
    if (!Array.isArray(payload.contents)) return fail(req, "Bad request.", 400);

    const { data: allowed, error: usageError } = await supabase.rpc("ai_use", { p_user: data.user.id, p_limit: DAILY_LIMIT });
    if (usageError) return fail(req, "AI usage tracking isn't set up yet (run the latest schema.sql).", 500);
    if (!allowed) return fail(req, "You've reached today's AI limit. Try again tomorrow.", 403);

    // Forward only the fields the app uses.
    const forward: Record<string, unknown> = { contents: payload.contents };
    if (payload.generationConfig) forward.generationConfig = payload.generationConfig;
    const res = await fetch(`${GEMINI}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
      body: JSON.stringify(forward),
    });
    return reply(req, await res.text(), res.status);
  }

  return fail(req, "Unknown action.", 400);
});
