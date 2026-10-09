// Thin wrapper around the Supabase JS client for Travelify accounts.
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

// Accepts an email (handled directly by Supabase) or a username (resolved on
// the server by api/login.js, which never reveals the email to the browser).
async function signInWithIdentifier(identifier, password) {
  const id = identifier.trim();
  if (id.includes("@")) return signIn(id, password);
  let res;
  try {
    res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: id, password }),
    });
  } catch (e) {
    throw new Error("Couldn't reach the server. Try your email instead.");
  }
  if (res.status === 404) throw new Error("Username sign-in only works on the live site. Use your email here.");
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error((body && body.error && body.error.message) || "Invalid login credentials");
  const { error } = await supabaseClient.auth.setSession({ access_token: body.access_token, refresh_token: body.refresh_token });
  if (error) throw error;
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
    hotelId: row.hotel_id,
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

// Every vote, paged past the 1000-row API limit, for building rankings.
async function fetchAllVotes() {
  const rows = [];
  for (let page = 0; page < 10; page++) {
    const { data, error } = await supabaseClient
      .from("plan_votes")
      .select("plan_id, user_id, vote")
      .range(page * 1000, page * 1000 + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

// ---------- following + public journals (Feed) ----------

async function fetchFollowing(userId) {
  const { data, error } = await supabaseClient.from("follows").select("followee_id").eq("follower_id", userId);
  if (error) throw error;
  return data.map((r) => r.followee_id);
}

async function followUser(userId, followeeId) {
  const { error } = await supabaseClient
    .from("follows")
    .upsert({ follower_id: userId, followee_id: followeeId }, { onConflict: "follower_id,followee_id" });
  if (error) throw error;
}

async function unfollowUser(userId, followeeId) {
  const { error } = await supabaseClient.from("follows").delete().eq("follower_id", userId).eq("followee_id", followeeId);
  if (error) throw error;
}

async function fetchProfiles(ids) {
  if (!ids.length) return [];
  const { data, error } = await supabaseClient.from("profiles").select("id, username").in("id", ids);
  if (error) throw error;
  return data;
}

async function fetchMyProfile(userId) {
  const { data, error } = await supabaseClient.from("profiles").select("journal_public").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

async function setJournalPublic(userId, isPublic) {
  const { error } = await supabaseClient.from("profiles").update({ journal_public: isPublic }).eq("id", userId);
  if (error) throw error;
}

// Row-level security only returns entries from people who made their journal public.
async function fetchFeedEntries(userIds, limit) {
  if (!userIds.length) return [];
  const { data, error } = await supabaseClient
    .from("journal_entries")
    .select("*")
    .in("user_id", userIds)
    .order("created_at", { ascending: false })
    .limit(limit || 60);
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    hotelId: row.hotel_id,
    city: row.city,
    hotelName: row.hotel_name,
    themeKey: row.theme_key,
    score: row.score,
    verdict: row.verdict,
    timestamp: new Date(row.created_at).getTime(),
  }));
}
