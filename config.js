// Fill these in from your Supabase project: Project Settings -> API.
// The "anon public" key is safe to expose client-side on purpose — unlike
// the Gemini key, it isn't a secret. Supabase's Row Level Security
// policies (see supabase/schema.sql) are what actually control what it
// can read or write, not keeping this value hidden.
const SUPABASE_URL = "https://vmrjdyulamtubpvkaefo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtcmpkeXVsYW10dWJwdmthZWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NjAxNjksImV4cCI6MjEwNjQzNjE2OX0.jyT9aSvAHRWMW897hBrg-anCe7XTyGUppk0eMDOs4Nk";

// AI proxy switch. false = each person pastes their own Gemini key (stored in
// their browser). true = the app calls the `gemini` Supabase Edge Function,
// which holds the key as a server-side secret and only serves signed-in users.
// Turn this on only after deploying the function (see README.md).
const AI_PROXY_ENABLED = false;
// Where the app sends AI requests when the proxy is on. Leave empty to use the
// Supabase Edge Function, or set to "/api/gemini" to use the Vercel function.
const AI_PROXY_URL = "";
