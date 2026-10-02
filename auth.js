// Thin wrapper around the Supabase JS client for Hotelify accounts.
// Requires config.js to be loaded first with a real SUPABASE_URL /
// SUPABASE_ANON_KEY — until then, isSupabaseConfigured() is false and the
// app falls back to the old guest/localStorage-only journal.

function isSupabaseConfigured() {
  return (
    typeof SUPABASE_URL === "string" &&
    typeof SUPABASE_ANON_KEY === "string" &&
    !SUPABASE_URL.includes("YOUR_SUPABASE") &&
    !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE")
  );
}

const supabaseClient = isSupabaseConfigured()
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

async function signUp(email, password, username) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) throw error;
  return data;
}

async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
}

async function getCurrentUser() {
  const { data } = await supabaseClient.auth.getUser();
  return data ? data.user : null;
}

async function fetchJournalEntries(userId) {
  const { data, error } = await supabaseClient
    .from("journal_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    city: row.city,
    hotelName: row.hotel_name,
    themeKey: row.theme_key,
    score: row.score,
    verdict: row.verdict,
    timestamp: new Date(row.created_at).getTime(),
  }));
}

async function insertJournalEntry(userId, entry) {
  const { error } = await supabaseClient.from("journal_entries").insert({
    user_id: userId,
    hotel_id: entry.hotelId,
    hotel_name: entry.hotelName,
    city: entry.city,
    theme_key: entry.themeKey,
    score: entry.score,
    verdict: entry.verdict,
  });
  if (error) throw error;
}

async function sharePlanPublicly(userId, username, data) {
  const { error } = await supabaseClient.from("shared_plans").insert({
    user_id: userId,
    username,
    hotel_name: data.hotelName,
    city: data.city,
    theme_key: data.themeKey,
    score: data.score,
    plan_text: data.planText,
  });
  if (error) throw error;
}

async function fetchPublicPlans(limit) {
  const { data, error } = await supabaseClient
    .from("shared_plans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit || 50);
  if (error) throw error;
  return data;
}

async function fetchPlanEngagement(planIds) {
  if (!planIds.length) return { votes: [], comments: [] };
  const [votesRes, commentsRes] = await Promise.all([
    supabaseClient.from("plan_votes").select("plan_id, user_id, vote").in("plan_id", planIds),
    supabaseClient.from("plan_comments").select("*").in("plan_id", planIds).order("created_at", { ascending: true }),
  ]);
  if (votesRes.error) throw votesRes.error;
  if (commentsRes.error) throw commentsRes.error;
  return { votes: votesRes.data, comments: commentsRes.data };
}

async function setPlanVote(userId, planId, vote) {
  const { error } = await supabaseClient
    .from("plan_votes")
    .upsert({ plan_id: planId, user_id: userId, vote }, { onConflict: "plan_id,user_id" });
  if (error) throw error;
}

async function clearPlanVote(userId, planId) {
  const { error } = await supabaseClient.from("plan_votes").delete().eq("plan_id", planId).eq("user_id", userId);
  if (error) throw error;
}

async function addPlanComment(userId, username, planId, body) {
  const { data, error } = await supabaseClient
    .from("plan_comments")
    .insert({ plan_id: planId, user_id: userId, username, body })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deletePlanComment(commentId) {
  const { error } = await supabaseClient.from("plan_comments").delete().eq("id", commentId);
  if (error) throw error;
}
