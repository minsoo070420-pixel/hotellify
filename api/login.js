// Vercel serverless function: sign in with a USERNAME + password.
//
// Supabase signs people in by email, and profiles don't store emails. Looking
// a username up in the browser would let anyone turn a username into an email
// address, so the lookup happens here, on the server, and the email never
// leaves it. The browser only gets the resulting session tokens.
//
// Needs the SUPABASE_SERVICE_ROLE_KEY environment variable (a secret: keep it
// in Vercel only, never in a file or a chat). Email sign-in does not use this.

const SUPABASE_URL = process.env.SUPABASE_URL || "https://vmrjdyulamtubpvkaefo.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtcmpkeXVsYW10dWJwdmthZWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NjAxNjksImV4cCI6MjEwNjQzNjE2OX0.jyT9aSvAHRWMW897hBrg-anCe7XTyGUppk0eMDOs4Nk";

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

const BAD_LOGIN = { error: { message: "Invalid login credentials" } };

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: { message: "POST only." } });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return send(res, 500, { error: { message: "Username sign-in isn't set up yet. Use your email instead." } });

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = null;
    }
  }
  const username = body && typeof body.username === "string" ? body.username.trim() : "";
  const password = body && typeof body.password === "string" ? body.password : "";
  if (!username || !password || username.length > 60 || password.length > 200) return send(res, 400, BAD_LOGIN);

  const admin = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  // username -> user id (profiles) -> email (auth admin API)
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id&username=eq.${encodeURIComponent(username)}&limit=1`, { headers: admin });
  const profiles = profileRes.ok ? await profileRes.json() : [];
  if (!profiles.length) return send(res, 400, BAD_LOGIN);

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(profiles[0].id)}`, { headers: admin });
  const user = userRes.ok ? await userRes.json() : null;
  if (!user || !user.email) return send(res, 400, BAD_LOGIN);

  // Same password check as an email sign-in, using the public anon key.
  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password }),
  });
  if (!tokenRes.ok) return send(res, 400, BAD_LOGIN);
  const session = await tokenRes.json();
  return send(res, 200, { access_token: session.access_token, refresh_token: session.refresh_token });
};
