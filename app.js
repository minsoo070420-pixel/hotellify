// Hotelify — a Beli-style, comparison-based hotel ranking app.
// No backend: state lives in localStorage. Ranking mechanic modeled on
// Beli's: pick a sentiment bucket, answer a "worth it?" gut check, then
// binary-search-compare the new hotel against others already ranked.
// Friends/feed are demoed against MOCK_FRIENDS since there's no server
// to sync real multi-user data. Discover's "AI recommends" is a rule
// based heuristic over tags/tiers + your own rating history — not a
// live LLM call. Amenity analysis is a photo-brightness/detail heuristic,
// not real object recognition (see note in the Amenities view) — true
// equipment-level vision analysis needs a backend-hosted vision model
// call, which this key-less static app doesn't have wired up.

const STORAGE_KEY = "hotelify_state_v3";

const BUCKETS = ["liked", "fine", "disliked"];
const BUCKET_META = {
  liked: { label: "Liked it", range: [6.8, 10.0], color: "#2e7d4f" },
  fine: { label: "It was fine", range: [3.5, 6.7], color: "#b8860b" },
  disliked: { label: "Didn't like it", range: [0.0, 3.4], color: "#c0392b" },
};

const AMENITY_CATEGORIES = ["Gym", "Pool", "Room"];

// Generic silhouette used for "you" wherever a friend would show an
// avatar emoji — no profile photo, just a blank placeholder icon.
const BLANK_AVATAR_SVG =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5z"/></svg>';

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      ranked: parsed.ranked || [],
      wantToGo: parsed.wantToGo || [],
      following: parsed.following || ["f1", "f3"],
      activity: parsed.activity || [],
      inviteCode: parsed.inviteCode || genCode(),
    };
  } catch (e) {
    return { ranked: [], wantToGo: [], following: ["f1", "f3"], activity: [], inviteCode: genCode() };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();
let activeTab = "rankings";
let comparison = null; // active comparison wizard, or null
let pendingRankHotel = null;
let pendingBucket = null;
let viewingFriendId = null;
let viewingRankedId = null;
let viewingHotelId = null;
let showInvite = false;
let searchQuery = "";
let copyFeedback = false;
let selectedTiers = new Set();
let selectedTags = new Set();

// ---------- ranking math ----------

function bucketItemsSorted(bucket) {
  return state.ranked
    .filter((h) => h.bucket === bucket)
    .sort((a, b) => b.score - a.score);
}

function recomputeBucketScores(bucket, orderedIds) {
  const [low, high] = BUCKET_META[bucket].range;
  const m = orderedIds.length;
  orderedIds.forEach((id, i) => {
    const entry = state.ranked.find((h) => h.id === id);
    if (!entry) return;
    entry.score = m === 1 ? (high + low) / 2 : high - (i / (m - 1)) * (high - low);
  });
}

function logActivity(entry) {
  state.activity.unshift({
    id: "act-" + Date.now(),
    hotelName: entry.name,
    city: entry.city,
    country: entry.country,
    bucket: entry.bucket,
    score: entry.score,
    timestamp: Date.now(),
  });
}

function startComparison(newEntry, bucket, onDone) {
  const existing = bucketItemsSorted(bucket);
  if (existing.length === 0) {
    state.ranked.push(newEntry);
    recomputeBucketScores(bucket, [newEntry.id]);
    logActivity(newEntry);
    saveState();
    onDone();
    return;
  }
  comparison = { bucket, newEntry, existing, lo: 0, hi: existing.length, onDone };
  render();
}

function answerComparison(newIsBetter) {
  if (!comparison) return;
  if (newIsBetter) {
    comparison.hi = comparison.midIndex;
  } else {
    comparison.lo = comparison.midIndex + 1;
  }
  if (comparison.lo >= comparison.hi) {
    const { bucket, newEntry, existing, lo, onDone } = comparison;
    const orderedIds = existing.map((h) => h.id);
    orderedIds.splice(lo, 0, newEntry.id);
    state.ranked.push(newEntry);
    recomputeBucketScores(bucket, orderedIds);
    logActivity(newEntry);
    saveState();
    comparison = null;
    onDone();
    return;
  }
  render();
}

// ---------- helpers ----------

function allTakenIds() {
  return new Set([...state.ranked.map((h) => h.id), ...state.wantToGo.map((h) => h.id)]);
}

function makeCustomId() {
  return "custom-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

function beginRankFlow(hotel) {
  state.wantToGo = state.wantToGo.filter((h) => h.id !== hotel.id);
  pendingRankHotel = hotel;
  activeTab = "sentiment";
  render();
}

function chooseSentiment(bucket) {
  pendingBucket = bucket;
  activeTab = "worthit";
  render();
}

function submitWorthIt(answer) {
  const worthFiveStar = answer === "yes";
  const entry = { ...pendingRankHotel, bucket: pendingBucket, worthFiveStar, score: 0 };
  const bucket = pendingBucket;
  pendingRankHotel = null;
  pendingBucket = null;
  startComparison(entry, bucket, () => {
    activeTab = "rankings";
    render();
  });
}

function addToWantToGo(hotel) {
  if (allTakenIds().has(hotel.id)) return;
  state.wantToGo.push(hotel);
  saveState();
  render();
}

function removeRanked(id) {
  state.ranked = state.ranked.filter((h) => h.id !== id);
  saveState();
  render();
}

function removeWantToGo(id) {
  state.wantToGo = state.wantToGo.filter((h) => h.id !== id);
  saveState();
  render();
}

function toggleFollow(friendId) {
  if (state.following.includes(friendId)) {
    state.following = state.following.filter((id) => id !== friendId);
  } else {
    state.following.push(friendId);
  }
  saveState();
  render();
}

function matchScore(friend) {
  const diffs = [];
  friend.ranked.forEach((fe) => {
    const mine = state.ranked.find((r) => r.id === fe.hotelId);
    if (mine) diffs.push(Math.abs(mine.score - fe.score));
  });
  if (diffs.length === 0) return null;
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return Math.max(0, Math.round(100 - avgDiff * 10));
}

function friendAvgScore(hotelId) {
  const scores = state.following
    .map(friendById)
    .filter(Boolean)
    .flatMap((f) => f.ranked.filter((fe) => fe.hotelId === hotelId).map((fe) => fe.score));
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function timeAgo(hours) {
  if (hours < 1) return "just now";
  if (hours < 24) return Math.round(hours) + "h ago";
  return Math.round(hours / 24) + "d ago";
}

function hotelById(id) {
  return MOCK_HOTELS.find((h) => h.id === id);
}

function friendById(id) {
  return MOCK_FRIENDS.find((f) => f.id === id);
}

// ---------- discover / recommendation engine ----------
// Heuristic only: blends your own rating history (which tiers/tags you
// tend to score highly) with any filters you select. No network call.

function computePreferences() {
  const tierPref = {};
  const tagPref = {};
  state.ranked.forEach((r) => {
    const hotel = hotelById(r.id);
    if (!hotel) return; // custom hotels carry no tier/tags
    const weight = (r.score - 5) / 5; // roughly -1..1
    tierPref[hotel.tier] = (tierPref[hotel.tier] || 0) + weight;
    (hotel.tags || []).forEach((t) => {
      tagPref[t] = (tagPref[t] || 0) + weight;
    });
  });
  return { tierPref, tagPref };
}

function recommendationScore(hotel, prefs, tiers = selectedTiers, tags = selectedTags) {
  let score = 50;
  score += (prefs.tierPref[hotel.tier] || 0) * 10;
  (hotel.tags || []).forEach((t) => {
    score += (prefs.tagPref[t] || 0) * 8;
  });
  if (tiers.size && tiers.has(hotel.tier)) score += 15;
  (hotel.tags || []).forEach((t) => {
    if (tags.has(t)) score += 12;
  });
  return Math.max(1, Math.min(99, Math.round(score)));
}

function whyText(hotel, prefs) {
  const reasons = [];
  if (selectedTiers.size && selectedTiers.has(hotel.tier)) {
    reasons.push(`${TIER_META[hotel.tier].label} pick`);
  }
  const matchedTags = (hotel.tags || []).filter((t) => selectedTags.has(t));
  if (matchedTags.length) reasons.push(`near ${matchedTags.slice(0, 2).join(" & ")}`);
  if (reasons.length === 0) {
    const bestTag = [...(hotel.tags || [])].sort((a, b) => (prefs.tagPref[b] || 0) - (prefs.tagPref[a] || 0))[0];
    if (bestTag && (prefs.tagPref[bestTag] || 0) > 0.15) {
      reasons.push(`matches your taste for ${bestTag} stays`);
    } else if ((prefs.tierPref[hotel.tier] || 0) > 0.15) {
      reasons.push(`you tend to love ${TIER_META[hotel.tier].label.toLowerCase()} stays`);
    } else {
      reasons.push(`${TIER_META[hotel.tier].label} option worth trying`);
    }
  }
  return reasons.join(" · ");
}

// ---------- amenity photo heuristic ----------
// Beta: scores a photo on brightness/contrast/colorfulness/edge-detail as
// a rough proxy for "well-kept & well-equipped". This is NOT real object
// recognition — it can't actually identify gym equipment. Genuine
// equipment-level analysis would need a real vision-model API call made
// from a backend (so the API key never sits in client-side code), which
// this static, no-backend app intentionally doesn't attempt.

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function amenityVerdictText(category, score) {
  const lower = category.toLowerCase();
  if (score >= 70) return `The ${lower} photo looks bright and detailed — a good sign of well-kept, decently equipped facilities.`;
  if (score >= 45) return `The ${lower} photo looks average — facilities seem serviceable, nothing exceptional either way.`;
  return `The ${lower} photo looks dim or sparse — could mean dated or limited facilities, though lighting alone isn't definitive.`;
}

function downscaleImageToDataUrl(img, maxDim = 320, quality = 0.7) {
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

async function fileToPhotoDataUrl(file) {
  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(rawDataUrl);
  return downscaleImageToDataUrl(img);
}

async function analyzePhoto(file, category) {
  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(rawDataUrl);
  const dataUrl = downscaleImageToDataUrl(img);

  const size = 48;
  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = size;
  sampleCanvas.height = size;
  const pctx = sampleCanvas.getContext("2d");
  pctx.drawImage(img, 0, 0, size, size);
  const { data } = pctx.getImageData(0, 0, size, size);

  const n = size * size;
  const lums = new Array(n);
  let sumLum = 0,
    rgSum = 0,
    ybSum = 0,
    rgSum2 = 0,
    ybSum2 = 0;
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    lums[p] = lum;
    sumLum += lum;
    const rg = r - g,
      yb = 0.5 * (r + g) - b;
    rgSum += rg;
    ybSum += yb;
    rgSum2 += rg * rg;
    ybSum2 += yb * yb;
  }
  const meanLum = sumLum / n;
  const varLum = lums.reduce((a, l) => a + (l - meanLum) * (l - meanLum), 0) / n;
  const contrast = Math.sqrt(varLum);
  const meanRg = rgSum / n,
    meanYb = ybSum / n;
  const stdRg = Math.sqrt(Math.max(0, rgSum2 / n - meanRg * meanRg));
  const stdYb = Math.sqrt(Math.max(0, ybSum2 / n - meanYb * meanYb));
  const colorfulness = Math.sqrt(stdRg * stdRg + stdYb * stdYb) + 0.3 * Math.sqrt(meanRg * meanRg + meanYb * meanYb);

  let edgeSum = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size - 1; x++) {
      edgeSum += Math.abs(lums[y * size + x] - lums[y * size + x + 1]);
    }
  }
  const edgeDensity = edgeSum / (size * (size - 1));

  let score = 40 + ((meanLum - 128) / 128) * 15 + (contrast / 64) * 20 + (colorfulness / 100) * 15 + (edgeDensity / 40) * 10;
  score = Math.max(5, Math.min(95, Math.round(score)));

  return { dataUrl, score, text: amenityVerdictText(category, score) };
}

// ---------- rendering ----------

const root = document.getElementById("app");

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function hotelSubtitle(h) {
  return [h.city, h.country].filter(Boolean).join(", ");
}

// Links out to Google Hotels' live price comparison (Booking.com,
// Expedia, Hotels.com, etc. all in one place, cheapest first) rather
// than showing a made-up discount — there's no real pricing API wired
// into this static app, so a fabricated "% off" would just be a guess.
function dealsUrl(h) {
  const query = encodeURIComponent([h.name, h.city, h.country].filter(Boolean).join(" "));
  return `https://www.google.com/travel/hotels?q=${query}`;
}

function truncate(s, max) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function render() {
  if (comparison) {
    root.innerHTML = renderComparisonView();
    bindComparisonEvents();
    return;
  }

  const tabs = [
    ["wanttogo", "Want to Go"],
    ["add", "Add a Hotel"],
    ["discover", "Discover"],
    ["friends", "Friends"],
    ["feed", "Feed"],
  ];
  const onOwnProfile = activeTab === "rankings" || activeTab === "amenities";

  root.innerHTML = `
    <header class="topbar">
      <div class="topbar-row">
        <div class="brand">🏨 Hotelify</div>
        <button class="avatar profile-btn ${onOwnProfile ? "profile-btn-active" : ""}" data-tab="rankings" title="Your rankings">${BLANK_AVATAR_SVG}</button>
      </div>
      <nav class="tabs">
        ${tabs
          .map(
            ([key, label]) =>
              `<button data-tab="${key}" class="${activeTab === key || (activeTab === "friendProfile" && key === "friends") ? "active" : ""}">${label}</button>`
          )
          .join("")}
      </nav>
    </header>
    <main>${renderActiveView()}</main>
  `;
  bindGlobalEvents();
}

function renderActiveView() {
  if (activeTab === "rankings") return renderRankings();
  if (activeTab === "wanttogo") return renderWantToGo();
  if (activeTab === "add") return renderAddView();
  if (activeTab === "discover") return renderDiscover();
  if (activeTab === "hotelDetail") return renderHotelDetail();
  if (activeTab === "friends") return renderFriends();
  if (activeTab === "friendProfile") return renderFriendProfile();
  if (activeTab === "feed") return renderFeed();
  if (activeTab === "sentiment") return renderSentimentView();
  if (activeTab === "worthit") return renderWorthItView();
  if (activeTab === "amenities") return renderAmenities();
  return "";
}

function renderRankings() {
  const all = [...state.ranked].sort((a, b) => b.score - a.score);
  const heading = `<h2 class="profile-heading"><span class="profile-heading-icon">${BLANK_AVATAR_SVG}</span> Your Rankings</h2>`;
  if (all.length === 0) {
    return heading + `<div class="empty">No ranked hotels yet. Head to <strong>Add a Hotel</strong> to rank your first stay.</div>`;
  }
  const rows = all
    .map((h, i) => {
      const meta = BUCKET_META[h.bucket];
      const worthTag =
        h.worthFiveStar === undefined
          ? ""
          : h.worthFiveStar
          ? `<span class="tag-worth worth-yes">💎 Worth it</span>`
          : `<span class="tag-worth worth-no">⚠️ Not worth it</span>`;
      return `
      <li class="rank-row">
        <span class="rank-num" ${i < 5 ? 'style="visibility:hidden"' : ""}>${i + 1}</span>
        <div class="rank-info">
          <div class="rank-name">${escapeHtml(h.name)}</div>
          <div class="rank-sub">${escapeHtml(hotelSubtitle(h))}</div>
          ${worthTag}
          ${h.notes ? `<div class="rank-note">"${escapeHtml(truncate(h.notes, 90))}"</div>` : ""}
        </div>
        <div class="row-actions">
          <span class="badge" style="background:${meta.color}">${h.score.toFixed(1)}</span>
          <button class="icon-btn" data-amenities="${h.id}" title="Notes, photos & amenities">📝</button>
          <button class="icon-btn" data-remove-ranked="${h.id}" title="Remove">✕</button>
        </div>
      </li>`;
    })
    .join("");
  return heading + `<ul class="rank-list">${rows}</ul>`;
}

function renderWantToGo() {
  if (state.wantToGo.length === 0) {
    return `<div class="empty">Nothing on your want-to-go list yet. Add hotels you're dreaming about from <strong>Add a Hotel</strong>.</div>`;
  }
  const rows = state.wantToGo
    .map(
      (h) => `
      <li class="rank-row">
        <div class="rank-info">
          <div class="rank-name">${escapeHtml(h.name)}</div>
          <div class="rank-sub">${escapeHtml(hotelSubtitle(h))}</div>
        </div>
        <div class="row-actions">
          <a class="icon-btn" href="${dealsUrl(h)}" target="_blank" rel="noopener" title="Find deals on Google Hotels">💰</a>
          <button class="pill-btn" data-visit="${h.id}">I've stayed here</button>
          <button class="icon-btn" data-remove-want="${h.id}" title="Remove">✕</button>
        </div>
      </li>`
    )
    .join("");
  return `<ul class="rank-list">${rows}</ul>`;
}

function renderAddView() {
  const taken = allTakenIds();
  const q = searchQuery.trim().toLowerCase();
  const results = MOCK_HOTELS.filter((h) => !taken.has(h.id)).filter((h) =>
    q ? (h.name + " " + h.city + " " + h.country).toLowerCase().includes(q) : true
  );

  const rows = results
    .slice(0, 30)
    .map((h) => {
      const favg = friendAvgScore(h.id);
      return `
      <li class="rank-row">
        <div class="rank-info">
          <div class="rank-name">${escapeHtml(h.name)}</div>
          <div class="rank-sub">${escapeHtml(hotelSubtitle(h))}${favg !== null ? ` · 👥 Friends avg ${favg.toFixed(1)}` : ""}</div>
        </div>
        <div class="row-actions">
          <a class="icon-btn" href="${dealsUrl(h)}" target="_blank" rel="noopener" title="Find deals on Google Hotels">💰</a>
          <button class="pill-btn ghost" data-want="${h.id}">Want to Go</button>
          <button class="pill-btn" data-rank="${h.id}">I've stayed here</button>
        </div>
      </li>`;
    })
    .join("");

  return `
    <div class="search-wrap">
      <input id="search-input" type="text" placeholder="Search hotels or cities…" value="${escapeHtml(searchQuery)}" />
    </div>
    <ul class="rank-list">${rows || '<div class="empty">No matches. Add it as a custom hotel below.</div>'}</ul>
    <div class="custom-add">
      <h3>Can't find it? Add it yourself</h3>
      <form id="custom-form">
        <input id="custom-name" type="text" placeholder="Hotel name" required />
        <input id="custom-city" type="text" placeholder="City" />
        <input id="custom-country" type="text" placeholder="Country" />
        <div class="custom-actions">
          <button type="submit" class="pill-btn ghost" data-custom-action="want">Want to Go</button>
          <button type="submit" class="pill-btn" data-custom-action="rank">I've stayed here</button>
        </div>
      </form>
    </div>
  `;
}

function renderDiscover() {
  const prefs = computePreferences();
  const taken = allTakenIds();
  const candidates = MOCK_HOTELS.filter((h) => !taken.has(h.id));
  const filtered = candidates.filter((h) => {
    if (selectedTiers.size && !selectedTiers.has(h.tier)) return false;
    if (selectedTags.size && !(h.tags || []).some((t) => selectedTags.has(t))) return false;
    return true;
  });
  const scored = filtered
    .map((h) => ({ hotel: h, score: recommendationScore(h, prefs) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const tierChips = Object.keys(TIER_META)
    .map(
      (t) =>
        `<button class="chip ${selectedTiers.has(t) ? "chip-active" : ""}" data-tier-filter="${t}">${TIER_META[t].emoji} ${TIER_META[t].label}</button>`
    )
    .join("");
  const tagChips = ATTRACTION_TAGS.map(
    (t) => `<button class="chip ${selectedTags.has(t) ? "chip-active" : ""}" data-tag-filter="${t}">${t}</button>`
  ).join("");

  const rows = scored
    .map(({ hotel, score }) => {
      const badgeColor = score >= 70 ? "#2e7d4f" : score >= 45 ? "#b8860b" : "#7a756c";
      const favg = friendAvgScore(hotel.id);
      return `
      <li class="rank-row">
        <div class="rank-info">
          <button class="rank-name link-name" data-view-hotel="${hotel.id}">${escapeHtml(hotel.name)}</button>
          <div class="rank-sub">${escapeHtml(hotelSubtitle(hotel))} · ${escapeHtml(whyText(hotel, prefs))}${favg !== null ? ` · 👥 ${favg.toFixed(1)}` : ""}</div>
        </div>
        <div class="row-actions">
          <span class="badge" style="background:${badgeColor}">${score}%</span>
          <a class="icon-btn" href="${dealsUrl(hotel)}" target="_blank" rel="noopener" title="Find deals on Google Hotels">💰</a>
          <button class="pill-btn ghost" data-want="${hotel.id}">Want to Go</button>
          <button class="pill-btn" data-rank="${hotel.id}">I've stayed here</button>
        </div>
      </li>`;
    })
    .join("");

  return `
    <p class="rank-sub">Smart picks blending your rating history with any filters below. Rule-based heuristic, not a live AI call.</p>
    <div class="chip-row">${tierChips}</div>
    <div class="chip-row">${tagChips}</div>
    <ul class="rank-list">${rows || '<div class="empty">No matches — try clearing a filter.</div>'}</ul>
  `;
}

function renderHotelDetail() {
  const hotel = hotelById(viewingHotelId);
  if (!hotel) return `<div class="empty">Hotel not found.</div>`;

  const prefs = computePreferences();
  const score = recommendationScore(hotel, prefs, new Set(), new Set());
  const favg = friendAvgScore(hotel.id);
  const taken = allTakenIds();
  const tagChips = (hotel.tags || []).map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join("");

  const scoreRow = `
    <div class="detail-scores">
      <div class="detail-score">
        <span class="badge" style="background:${score >= 70 ? "#2e7d4f" : score >= 45 ? "#b8860b" : "#7a756c"}">${score}%</span>
        <span class="rank-sub">Rec score</span>
      </div>
      ${
        favg !== null
          ? `<div class="detail-score">
        <span class="badge" style="background:#2e7d4f">${favg.toFixed(1)}</span>
        <span class="rank-sub">Friends avg</span>
      </div>`
          : ""
      }
    </div>
  `;

  const actions = taken.has(hotel.id)
    ? ""
    : `
    <div class="detail-actions">
      <button class="pill-btn ghost" data-want="${hotel.id}">Want to Go</button>
      <button class="pill-btn" data-rank="${hotel.id}">I've stayed here</button>
    </div>
  `;

  return `
    <button class="icon-btn back-btn" data-tab="discover">← Discover</button>
    <h2>${escapeHtml(hotel.name)}</h2>
    <p class="rank-sub">${escapeHtml(TIER_META[hotel.tier].label)} · ${escapeHtml(hotelSubtitle(hotel))}</p>

    ${scoreRow}

    <div class="chip-row">${tagChips}</div>

    <div class="detail-section">
      <div class="detail-label">Address</div>
      <div class="rank-sub">${escapeHtml(hotel.address || hotelSubtitle(hotel))}</div>
    </div>

    <div class="detail-links">
      <a class="pill-btn ghost" href="${hotel.website}" target="_blank" rel="noopener">🌐 Visit Website</a>
      <a class="pill-btn" href="${dealsUrl(hotel)}" target="_blank" rel="noopener">💰 Find Deals</a>
    </div>

    ${actions}
  `;
}

function renderSentimentView() {
  const h = pendingRankHotel;
  return `
    <div class="sentiment-view">
      <h2>How was your stay at ${escapeHtml(h.name)}?</h2>
      <p class="rank-sub">${escapeHtml(hotelSubtitle(h))}</p>
      <div class="sentiment-options">
        <button class="sentiment-btn" style="border-color:${BUCKET_META.liked.color}" data-sentiment="liked">😍 Liked it!</button>
        <button class="sentiment-btn" style="border-color:${BUCKET_META.fine.color}" data-sentiment="fine">🙂 It was fine</button>
        <button class="sentiment-btn" style="border-color:${BUCKET_META.disliked.color}" data-sentiment="disliked">😕 Didn't like it</button>
      </div>
    </div>
  `;
}

function renderWorthItView() {
  const h = pendingRankHotel;
  return `
    <div class="sentiment-view">
      <h2>Is ${escapeHtml(h.name)} worth it as a 5-star stay?</h2>
      <p class="rank-sub">${escapeHtml(hotelSubtitle(h))}</p>
      <div class="sentiment-options">
        <button class="sentiment-btn" style="border-color:${BUCKET_META.liked.color}" data-worthit="yes">💎 Yes, worth it</button>
        <button class="sentiment-btn" style="border-color:${BUCKET_META.disliked.color}" data-worthit="no">⚠️ Not worth it</button>
      </div>
    </div>
  `;
}

function renderComparisonView() {
  const { bucket, newEntry, existing, lo, hi } = comparison;
  comparison.midIndex = Math.floor((lo + hi) / 2);
  const other = existing[comparison.midIndex];
  return `
    <header class="topbar">
      <div class="brand">🏨 Hotelify</div>
    </header>
    <main>
      <div class="compare-view">
        <h2>Which stay did you prefer?</h2>
        <p class="rank-sub">Comparing within "${BUCKET_META[bucket].label}"</p>
        <div class="compare-cards">
          <button class="compare-card" data-choice="new">
            <div class="rank-name">${escapeHtml(newEntry.name)}</div>
            <div class="rank-sub">${escapeHtml(hotelSubtitle(newEntry))}</div>
          </button>
          <div class="vs">vs</div>
          <button class="compare-card" data-choice="other">
            <div class="rank-name">${escapeHtml(other.name)}</div>
            <div class="rank-sub">${escapeHtml(hotelSubtitle(other))}</div>
          </button>
        </div>
      </div>
    </main>
  `;
}

function renderFriends() {
  const following = state.following.map(friendById).filter(Boolean);
  const suggested = MOCK_FRIENDS.filter((f) => !state.following.includes(f.id));

  const inviteLink = `https://hotelify.app/join/${state.inviteCode}`;
  const invitePanel = showInvite
    ? `
    <div class="invite-panel">
      <div class="rank-sub">Share this link — anyone who opens it joins as your friend on Hotelify.</div>
      <div class="invite-row">
        <input id="invite-link" type="text" readonly value="${escapeHtml(inviteLink)}" />
        <button class="pill-btn" id="copy-invite">${copyFeedback ? "Copied!" : "Copy"}</button>
      </div>
    </div>`
    : "";

  const followingRows = following
    .map((f) => {
      const m = matchScore(f);
      return `
      <li class="rank-row">
        <div class="avatar">${f.avatar}</div>
        <div class="rank-info">
          <div class="rank-name">${escapeHtml(f.name)}</div>
          <div class="rank-sub">${f.ranked.length} hotels ranked${m !== null ? ` · ${m}% match` : ""}</div>
        </div>
        <div class="row-actions">
          <button class="pill-btn ghost" data-view-friend="${f.id}">View</button>
          <button class="icon-btn" data-unfollow="${f.id}" title="Unfollow">✕</button>
        </div>
      </li>`;
    })
    .join("");

  const suggestedRows = suggested
    .map(
      (f) => `
      <li class="rank-row">
        <div class="avatar">${f.avatar}</div>
        <div class="rank-info">
          <div class="rank-name">${escapeHtml(f.name)}</div>
          <div class="rank-sub">${f.ranked.length} hotels ranked</div>
        </div>
        <button class="pill-btn" data-follow="${f.id}">Follow</button>
      </li>`
    )
    .join("");

  return `
    <div class="section-header">
      <h3>Following</h3>
      <button class="pill-btn ghost" id="invite-toggle">${showInvite ? "Hide" : "Invite Friends"}</button>
    </div>
    ${invitePanel}
    <ul class="rank-list">${followingRows || '<div class="empty">You\'re not following anyone yet — follow a suggestion below.</div>'}</ul>
    <h3 class="section-title">Suggested</h3>
    <ul class="rank-list">${suggestedRows || '<div class="empty">You\'re following everyone.</div>'}</ul>
  `;
}

function renderFriendProfile() {
  const f = friendById(viewingFriendId);
  if (!f) return `<div class="empty">Friend not found.</div>`;
  const m = matchScore(f);
  const sorted = [...f.ranked].sort((a, b) => b.score - a.score);
  const rows = sorted
    .map((entry, i) => {
      const hotel = hotelById(entry.hotelId);
      const meta = BUCKET_META[entry.bucket];
      return `
      <li class="rank-row">
        <span class="rank-num">${i + 1}</span>
        <div class="rank-info">
          <div class="rank-name">${escapeHtml(hotel.name)}</div>
          <div class="rank-sub">${escapeHtml(hotelSubtitle(hotel))}</div>
        </div>
        <span class="badge" style="background:${meta.color}">${entry.score.toFixed(1)}</span>
      </li>`;
    })
    .join("");

  return `
    <button class="icon-btn back-btn" data-tab="friends">← Friends</button>
    <div class="friend-header">
      <div class="avatar large">${f.avatar}</div>
      <div>
        <div class="rank-name">${escapeHtml(f.name)}</div>
        <div class="rank-sub">${m !== null ? `${m}% match with you` : "Rank overlapping hotels to see your match score"}</div>
      </div>
    </div>
    <ul class="rank-list">${rows}</ul>
  `;
}

function renderFeed() {
  const ownItems = state.activity.map((a) => ({
    name: "You",
    avatar: BLANK_AVATAR_SVG,
    hotelName: a.hotelName,
    subtitle: [a.city, a.country].filter(Boolean).join(", "),
    bucket: a.bucket,
    score: a.score,
    hoursAgo: (Date.now() - a.timestamp) / 3600000,
  }));

  const friendItems = state.following
    .map(friendById)
    .filter(Boolean)
    .flatMap((f) =>
      f.ranked.map((entry) => {
        const hotel = hotelById(entry.hotelId);
        return {
          name: f.name,
          avatar: f.avatar,
          hotelName: hotel.name,
          subtitle: hotelSubtitle(hotel),
          bucket: entry.bucket,
          score: entry.score,
          hoursAgo: entry.hoursAgo,
        };
      })
    );

  const items = [...ownItems, ...friendItems].sort((a, b) => a.hoursAgo - b.hoursAgo);

  if (items.length === 0) {
    return `<div class="empty">Your feed is empty. Follow friends or rank a hotel to see activity here.</div>`;
  }

  const rows = items
    .map((it) => {
      const meta = BUCKET_META[it.bucket];
      return `
      <li class="feed-item">
        <div class="avatar">${it.avatar}</div>
        <div class="rank-info">
          <div class="rank-name"><strong>${escapeHtml(it.name)}</strong> ranked ${escapeHtml(it.hotelName)}</div>
          <div class="rank-sub">${escapeHtml(it.subtitle)} · ${meta.label} · ${timeAgo(it.hoursAgo)}</div>
        </div>
        <span class="badge" style="background:${meta.color}">${it.score.toFixed(1)}</span>
      </li>`;
    })
    .join("");

  return `<ul class="rank-list">${rows}</ul>`;
}

function renderAmenities() {
  const h = state.ranked.find((r) => r.id === viewingRankedId);
  if (!h) return `<div class="empty">Hotel not found.</div>`;
  const photos = h.photos || {};
  const report = h.amenityReport || {};
  const reviewPhotos = h.reviewPhotos || [];

  const reviewGallery = reviewPhotos
    .map(
      (src, i) => `
      <div class="review-photo">
        <img src="${src}" alt="Review photo ${i + 1}" />
        <button class="icon-btn review-photo-remove" data-remove-review-photo="${i}" title="Remove">✕</button>
      </div>`
    )
    .join("");

  const cards = AMENITY_CATEGORIES.map((cat) => {
    const photo = photos[cat];
    const rep = report[cat];
    const badgeColor = rep ? (rep.score >= 70 ? "#2e7d4f" : rep.score >= 45 ? "#b8860b" : "#c0392b") : "";
    return `
    <div class="amenity-card">
      <div class="amenity-cat">${cat}</div>
      ${photo ? `<img class="amenity-thumb" src="${photo}" alt="${cat} photo" />` : `<div class="amenity-placeholder">No photo yet</div>`}
      <label class="pill-btn ghost file-btn">
        ${photo ? "Replace Photo" : "Add Photo"}
        <input type="file" accept="image/*" data-photo-cat="${cat}" hidden />
      </label>
      ${
        rep
          ? `<div class="amenity-report">
        <span class="badge" style="background:${badgeColor}">${rep.score}</span>
        <span class="rank-sub">${escapeHtml(rep.text)}</span>
      </div>`
          : ""
      }
    </div>`;
  }).join("");

  return `
    <button class="icon-btn back-btn" data-tab="rankings">← My Rankings</button>
    <h2>${escapeHtml(h.name)}</h2>

    <h3 class="section-title" style="margin-top:0">Your Review</h3>
    <textarea id="notes-input" class="notes-textarea" placeholder="What was the stay like? Any standout details...">${escapeHtml(h.notes || "")}</textarea>

    <div class="review-gallery">${reviewGallery}</div>
    <label class="pill-btn ghost file-btn">
      Add Photos
      <input type="file" accept="image/*" id="review-photo-input" multiple hidden />
    </label>

    <h3 class="section-title">Amenities</h3>
    <p class="rank-sub">Beta: a quick photo brightness/detail heuristic as a rough stand-in for equipment quality — not real object recognition.</p>
    <div class="amenity-grid">${cards}</div>
  `;
}

// ---------- events ----------

function bindGlobalEvents() {
  root.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab;
      searchQuery = "";
      showInvite = false;
      render();
    });
  });

  root.querySelectorAll("[data-remove-ranked]").forEach((btn) => {
    btn.addEventListener("click", () => removeRanked(btn.dataset.removeRanked));
  });
  root.querySelectorAll("[data-remove-want]").forEach((btn) => {
    btn.addEventListener("click", () => removeWantToGo(btn.dataset.removeWant));
  });
  root.querySelectorAll("[data-visit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const hotel = state.wantToGo.find((h) => h.id === btn.dataset.visit);
      if (hotel) beginRankFlow(hotel);
    });
  });

  root.querySelectorAll("[data-want]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const hotel = MOCK_HOTELS.find((h) => h.id === btn.dataset.want);
      if (hotel) addToWantToGo(hotel);
    });
  });
  root.querySelectorAll("[data-rank]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const hotel = MOCK_HOTELS.find((h) => h.id === btn.dataset.rank);
      if (hotel) beginRankFlow(hotel);
    });
  });

  root.querySelectorAll("[data-follow]").forEach((btn) => {
    btn.addEventListener("click", () => toggleFollow(btn.dataset.follow));
  });
  root.querySelectorAll("[data-unfollow]").forEach((btn) => {
    btn.addEventListener("click", () => toggleFollow(btn.dataset.unfollow));
  });
  root.querySelectorAll("[data-view-friend]").forEach((btn) => {
    btn.addEventListener("click", () => {
      viewingFriendId = btn.dataset.viewFriend;
      activeTab = "friendProfile";
      render();
    });
  });
  root.querySelectorAll("[data-view-hotel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      viewingHotelId = btn.dataset.viewHotel;
      activeTab = "hotelDetail";
      render();
    });
  });

  root.querySelectorAll("[data-tier-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = btn.dataset.tierFilter;
      if (selectedTiers.has(t)) selectedTiers.delete(t);
      else selectedTiers.add(t);
      render();
    });
  });
  root.querySelectorAll("[data-tag-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = btn.dataset.tagFilter;
      if (selectedTags.has(t)) selectedTags.delete(t);
      else selectedTags.add(t);
      render();
    });
  });

  root.querySelectorAll("[data-amenities]").forEach((btn) => {
    btn.addEventListener("click", () => {
      viewingRankedId = btn.dataset.amenities;
      activeTab = "amenities";
      render();
    });
  });
  root.querySelectorAll("[data-photo-cat]").forEach((input) => {
    input.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const cat = input.dataset.photoCat;
      const result = await analyzePhoto(file, cat);
      const h = state.ranked.find((r) => r.id === viewingRankedId);
      if (!h) return;
      h.photos = h.photos || {};
      h.photos[cat] = result.dataUrl;
      h.amenityReport = h.amenityReport || {};
      h.amenityReport[cat] = { score: result.score, text: result.text };
      saveState();
      render();
    });
  });

  const notesInput = document.getElementById("notes-input");
  if (notesInput) {
    notesInput.addEventListener("input", (e) => {
      const h = state.ranked.find((r) => r.id === viewingRankedId);
      if (!h) return;
      h.notes = e.target.value;
      saveState();
    });
  }
  const reviewPhotoInput = document.getElementById("review-photo-input");
  if (reviewPhotoInput) {
    reviewPhotoInput.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      const h = state.ranked.find((r) => r.id === viewingRankedId);
      if (!h) return;
      h.reviewPhotos = h.reviewPhotos || [];
      for (const file of files) {
        h.reviewPhotos.push(await fileToPhotoDataUrl(file));
      }
      saveState();
      render();
    });
  }
  root.querySelectorAll("[data-remove-review-photo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const h = state.ranked.find((r) => r.id === viewingRankedId);
      if (!h || !h.reviewPhotos) return;
      h.reviewPhotos.splice(Number(btn.dataset.removeReviewPhoto), 1);
      saveState();
      render();
    });
  });

  const inviteToggle = document.getElementById("invite-toggle");
  if (inviteToggle) {
    inviteToggle.addEventListener("click", () => {
      showInvite = !showInvite;
      copyFeedback = false;
      render();
    });
  }
  const copyInvite = document.getElementById("copy-invite");
  if (copyInvite) {
    copyInvite.addEventListener("click", async () => {
      const link = document.getElementById("invite-link").value;
      try {
        await navigator.clipboard.writeText(link);
      } catch (e) {
        const input = document.getElementById("invite-link");
        input.select();
        document.execCommand("copy");
      }
      copyFeedback = true;
      render();
      setTimeout(() => {
        copyFeedback = false;
      }, 2000);
    });
  }

  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      const focusPos = e.target.selectionStart;
      render();
      const newInput = document.getElementById("search-input");
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(focusPos, focusPos);
      }
    });
  }

  const customForm = document.getElementById("custom-form");
  if (customForm) {
    customForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const submitter = e.submitter;
      const action = submitter ? submitter.dataset.customAction : "want";
      const name = document.getElementById("custom-name").value.trim();
      const city = document.getElementById("custom-city").value.trim();
      const country = document.getElementById("custom-country").value.trim();
      if (!name) return;
      const hotel = { id: makeCustomId(), name, city, country };
      if (action === "rank") {
        beginRankFlow(hotel);
      } else {
        addToWantToGo(hotel);
      }
    });
  }

  root.querySelectorAll("[data-sentiment]").forEach((btn) => {
    btn.addEventListener("click", () => chooseSentiment(btn.dataset.sentiment));
  });
  root.querySelectorAll("[data-worthit]").forEach((btn) => {
    btn.addEventListener("click", () => submitWorthIt(btn.dataset.worthit));
  });
}

function bindComparisonEvents() {
  root.querySelectorAll("[data-choice]").forEach((btn) => {
    btn.addEventListener("click", () => {
      answerComparison(btn.dataset.choice === "new");
    });
  });
}

render();
