// Hotelify — trip-fit matcher.
// Flow: pick a city -> pick a hotel in it -> pick a trip theme -> get a
// fit score + reasons for why that hotel suits that theme.
//
// Keeps a Trip Journal of past results — one mechanic borrowed deliberately
// from why Beli got trendy (research notes, not folklore): it frames each
// result as a personal travel memory rather than a one-off lookup (Beli
// succeeded partly by being a memory archive, not a review site). Beli's
// other big lever — peer trust over anonymous reviews — doesn't translate
// here: this is a solo planning tool with no social graph, so it's left
// out rather than faked with fabricated "friends."
//
// The fit score is a transparent rule-based heuristic over each hotel's
// own tags/tier (see data.js) — not a live AI/LLM call.

const STORAGE_KEY = "hotelify_tripmatch_v1";
const THEME_KEYS = ["romantic", "family", "business", "adventure", "relaxation"];

// Modern mark: a house built from separate green "stick" strokes (a
// roof chevron, two wall posts, a base) rather than a filled glyph —
// no background badge, just the line marks, instead of the 🏨 emoji.
const LOGO_SVG = `
  <svg width="30" height="30" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logoGrad" x1="4" y1="6" x2="28" y2="26" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#4ade80"/>
        <stop offset="1" stop-color="#047857"/>
      </linearGradient>
    </defs>
    <g stroke="url(#logoGrad)" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 17L16 6L27 17"/>
      <path d="M10 19.5V26"/>
      <path d="M22 19.5V26"/>
      <path d="M8 26H24"/>
    </g>
  </svg>
`;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      journal: parsed.journal || [],
    };
  } catch (e) {
    return { journal: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();
let step = "city"; // city | hotel | theme | answer | journal
let cityQuery = "";
let selectedCity = null;
let selectedHotel = null;
let selectedTheme = null;
let showCustomHotelForm = false;

// AI trip plan (Gemini). The API key lives ONLY in localStorage, entered
// by the user at runtime in this running page — never written into a
// source file, so it never ends up in a git commit. If this app is ever
// hosted somewhere other than your own machine, anyone with dev tools
// open on that page could still read the key out of the request, same
// as any client-side API call — keep that in mind before deploying it
// publicly with a real key attached.
const GEMINI_KEY_STORAGE = "hotelify_gemini_key";
const GEMINI_MODEL = "gemini-3.8-flash";
const TRIP_LENGTH_OPTIONS = [
  { nights: 1, label: "1 night" },
  { nights: 2, label: "2 nights" },
  { nights: 3, label: "3 nights" },
  { nights: 4, label: "4+ nights" },
];
let showKeyForm = false;
let aiPlan = null;
let aiPlanLoading = false;
let aiPlanError = null;
let tripNights = 2;

// ---------- data helpers ----------

function uniqueCities() {
  return [...new Set(MOCK_HOTELS.map((h) => h.city))].sort();
}

function hotelsInCity(city) {
  const c = city.trim().toLowerCase();
  return MOCK_HOTELS.filter((h) => h.city.toLowerCase() === c);
}

function makeCustomId() {
  return "custom-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

// Fallback only, for hotels with no known official site (custom/manual
// entries) — a general search rather than a fabricated booking link.
// Any hotel with a real `website` on file books there directly instead.
function hotelSearchFallbackUrl(h) {
  const query = encodeURIComponent([h.name, h.city, h.country].filter(Boolean).join(" "));
  return `https://www.google.com/travel/hotels?q=${query}`;
}

// Links to live Google Maps directions from the city's airport rather
// than a hardcoded fare/time — this app has no real transit-pricing API,
// so an invented "$12, 35 min" would just be a guess dressed up as fact.
// Google Maps computes current, real transit vs. driving estimates.
function gettingThereUrls(h) {
  const destination = encodeURIComponent(h.address || [h.name, h.city, h.country].filter(Boolean).join(", "));
  const origin = encodeURIComponent(`${h.city} airport`);
  return {
    transit: `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=transit`,
    driving: `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`,
  };
}

// ---------- Gemini trip planning ----------

function getGeminiKey() {
  return localStorage.getItem(GEMINI_KEY_STORAGE) || "";
}

function setGeminiKey(key) {
  localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
}

function clearGeminiKey() {
  localStorage.removeItem(GEMINI_KEY_STORAGE);
}

async function generateTripPlan(hotel, themeKey, nights) {
  const theme = THEME_META[themeKey];
  const key = getGeminiKey();
  const nearbyList = hotel.nearby && hotel.nearby.length ? hotel.nearby.join(", ") : "no specific landmarks on file";
  const isOpenEnded = nights >= 4;
  const days = nights + 1;
  const lengthPhrase = isOpenEnded ? "an extended stay of 4 or more nights (plan the first 4 days, then note it extends similarly)" : `a ${nights}-night, ${days}-day trip`;
  const wordBudget = Math.min(550, 110 * Math.min(nights, 4) + 100);
  const structureHint = nights === 1 ? "a single morning / afternoon / evening plan" : `a day-by-day plan (Day 1, Day 2, ... Day ${Math.min(nights, 4)})`;
  const prompt = `You are a concise, practical trip planner. Plan ${lengthPhrase} for a ${theme.label}-themed trip based at ${hotel.name} in ${hotel.city}${hotel.country ? ", " + hotel.country : ""}. Known real landmarks near this hotel: ${nearbyList}. Write ${structureHint} (a few sentences per segment), grounded in the real landmarks listed where they fit, calling out roughly how each stop suits a ${theme.label.toLowerCase()} trip. Keep it under ${wordBudget} words total, plain text, no markdown headers.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body && body.error && body.error.message ? body.error.message : `Request failed (${res.status})`;
    throw new Error(msg);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  if (!text) throw new Error("The AI returned an empty response.");
  return text.trim();
}

function hotelSubtitle(h) {
  return [h.city, h.country].filter(Boolean).join(", ");
}

// ---------- fit scoring ----------

function evaluateFit(hotel, themeKey) {
  const theme = THEME_META[themeKey];
  const tags = hotel.tags || [];
  const matchedTags = tags.filter((t) => theme.tags.includes(t));
  let score = 45 + matchedTags.length * 13;
  const tierMatch = hotel.tier && theme.tierBoost.includes(hotel.tier);
  if (tierMatch) score += 12;
  score = Math.max(5, Math.min(98, Math.round(score)));

  const reasons = matchedTags.map((t) => theme.tagReasons[t]).filter(Boolean);
  if (tierMatch) {
    reasons.push(`a ${TIER_META[hotel.tier].label.toLowerCase()} property, well suited to a ${theme.label.toLowerCase()} trip`);
  }
  if (reasons.length === 0) {
    reasons.push(
      `no specific ${theme.label.toLowerCase()}-oriented details on file for this hotel, so this is a lower-confidence match`
    );
  }

  const verdict = score >= 75 ? "Great match" : score >= 50 ? "Decent match" : "Not an ideal match";
  const color = score >= 75 ? "#2e7d4f" : score >= 50 ? "#b8860b" : "#c0392b";
  return { score, reasons: reasons.slice(0, 4), verdict, color };
}

// ---------- journal ----------

function recordTripMatch(entry) {
  state.journal.unshift(entry);
  saveState();
}

// ---------- navigation ----------

function chooseCity(city) {
  selectedCity = city;
  selectedHotel = null;
  showCustomHotelForm = false;
  step = "theme";
  render();
}

function chooseTheme(themeKey) {
  selectedTheme = themeKey;
  showCustomHotelForm = false;
  step = "hotel";
  render();
}

function chooseHotel(hotel) {
  selectedHotel = hotel;
  aiPlan = null;
  aiPlanError = null;
  tripNights = 2;
  const fit = evaluateFit(hotel, selectedTheme);
  recordTripMatch({
    id: "trip-" + Date.now(),
    city: hotel.city,
    hotelName: hotel.name,
    themeKey: selectedTheme,
    score: fit.score,
    verdict: fit.verdict,
    timestamp: Date.now(),
  });
  step = "answer";
  render();
}

function planNewTrip() {
  selectedCity = null;
  selectedHotel = null;
  selectedTheme = null;
  cityQuery = "";
  showCustomHotelForm = false;
  aiPlan = null;
  aiPlanError = null;
  aiPlanLoading = false;
  showKeyForm = false;
  step = "city";
  render();
}

async function planTheTrip() {
  if (!getGeminiKey()) {
    showKeyForm = true;
    render();
    return;
  }
  aiPlanLoading = true;
  aiPlanError = null;
  render();
  try {
    aiPlan = await generateTripPlan(selectedHotel, selectedTheme, tripNights);
  } catch (e) {
    aiPlanError = e.message || "Something went wrong generating the plan.";
  }
  aiPlanLoading = false;
  render();
}

// ---------- rendering ----------

const root = document.getElementById("app");

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function timeAgo(ms) {
  const hours = (Date.now() - ms) / 3600000;
  if (hours < 1) return "just now";
  if (hours < 24) return Math.round(hours) + "h ago";
  return Math.round(hours / 24) + "d ago";
}

function render() {
  root.innerHTML = `
    <header class="topbar">
      <div class="topbar-row">
        <button class="brand brand-btn" data-plan-new title="Start a new trip">${LOGO_SVG} Hotelify</button>
        <div class="header-right">
          <button class="journal-badge" data-view-journal title="Your Trip Journal">📖 Journal</button>
        </div>
      </div>
    </header>
    <main>${renderStep()}</main>
  `;
  bindEvents();
}

function renderStep() {
  if (step === "city") return renderCityStep();
  if (step === "theme") return renderThemeStep();
  if (step === "hotel") return renderHotelStep();
  if (step === "answer") return renderAnswerStep();
  if (step === "journal") return renderJournal();
  return "";
}

function renderCityStep() {
  const rawQuery = cityQuery.trim();
  const q = rawQuery.toLowerCase();
  const allCities = uniqueCities();
  const cities = allCities.filter((c) => (q ? c.toLowerCase().includes(q) : true));
  const rows = cities
    .slice(0, 30)
    .map((c) => `<button class="rank-row city-row" data-pick-city="${escapeHtml(c)}">${escapeHtml(c)}</button>`)
    .join("");

  const exactMatch = allCities.some((c) => c.toLowerCase() === q);
  const useTypedCity =
    rawQuery && !exactMatch
      ? `<button class="pill-btn ghost use-typed-city" data-pick-city="${escapeHtml(rawQuery)}">Use "${escapeHtml(rawQuery)}" as my city</button>`
      : "";

  return `
    <h2 class="step-heading">Where are you traveling?</h2>
    <div class="search-wrap">
      <input id="city-input" type="text" placeholder="Search a city…" value="${escapeHtml(cityQuery)}" />
    </div>
    <div class="rank-list">${rows || (rawQuery ? "" : `<div class="empty">No cities match. Try a different search.</div>`)}</div>
    ${useTypedCity}
  `;
}

function renderThemeStep() {
  const cards = THEME_KEYS.map((key) => {
    const t = THEME_META[key];
    return `
      <button class="theme-card" data-pick-theme="${key}">
        <div class="theme-emoji">${t.emoji}</div>
        <div class="theme-label">${t.label}</div>
        <div class="rank-sub">${t.blurb}</div>
      </button>`;
  }).join("");

  return `
    <button class="icon-btn back-btn" data-step="city">← Change city</button>
    <h2 class="step-heading">What's the vibe for this trip?</h2>
    <p class="rank-sub">Traveling to ${escapeHtml(selectedCity)}</p>
    <div class="theme-grid">${cards}</div>
  `;
}

function renderHotelStep() {
  const theme = THEME_META[selectedTheme];
  const hotels = hotelsInCity(selectedCity)
    .map((h) => ({ hotel: h, fit: evaluateFit(h, selectedTheme) }))
    .sort((a, b) => b.fit.score - a.fit.score);

  const rows = hotels
    .map(
      ({ hotel: h, fit }) => `
      <button class="rank-row hotel-row" data-pick-hotel="${h.id}">
        <div class="rank-info">
          <div class="rank-name">${escapeHtml(h.name)}</div>
          <div class="rank-sub">${escapeHtml(TIER_META[h.tier].label)}${h.tags && h.tags.length ? " · " + h.tags.slice(0, 3).join(", ") : ""}</div>
        </div>
        <span class="badge" style="background:${fit.color}">${fit.score}%</span>
      </button>`
    )
    .join("");

  const customForm = showCustomHotelForm
    ? `
    <form id="custom-hotel-form" class="custom-add">
      <input id="custom-hotel-name" type="text" placeholder="Hotel name" required />
      <button type="submit" class="pill-btn">Use this hotel</button>
    </form>`
    : `<button class="pill-btn ghost" id="show-custom-hotel">Can't find it? Enter it manually</button>`;

  return `
    <button class="icon-btn back-btn" data-step="theme">← Change theme</button>
    <h2 class="step-heading">Choose your hotel in ${escapeHtml(selectedCity)}</h2>
    <p class="rank-sub">${theme.emoji} ${theme.label} trip · scores show fit for this vibe</p>
    <div class="rank-list">${rows || `<div class="empty">No hotels on file for ${escapeHtml(selectedCity)} yet.</div>`}</div>
    <div class="custom-add-wrap">${customForm}</div>
  `;
}

function renderAnswerStep() {
  const hotel = selectedHotel;
  const theme = THEME_META[selectedTheme];
  const fit = evaluateFit(hotel, selectedTheme);

  const reasonsList = fit.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("");

  const addressBlock = hotel.address
    ? `
    <div class="detail-section">
      <div class="detail-label">Address</div>
      <div class="rank-sub">${escapeHtml(hotel.address)}</div>
    </div>`
    : "";

  const nearbyBlock =
    hotel.nearby && hotel.nearby.length
      ? `
    <div class="detail-section">
      <div class="detail-label">Nearby</div>
      <div class="rank-sub">${hotel.nearby.map(escapeHtml).join(" · ")}</div>
    </div>`
      : "";

  const gt = gettingThereUrls(hotel);
  const gettingThere = `
    <div class="detail-section">
      <div class="detail-label">Getting there from the airport</div>
      <div class="detail-links">
        <a class="pill-btn ghost" href="${gt.transit}" target="_blank" rel="noopener">🚆 Economical (transit)</a>
        <a class="pill-btn ghost" href="${gt.driving}" target="_blank" rel="noopener">🚕 Fastest (drive/taxi)</a>
      </div>
      <p class="rank-sub getting-there-note">Opens live Google Maps directions — real current times/fares, not a guess.</p>
    </div>`;

  const links = hotel.website
    ? `
    <div class="detail-links">
      <a class="pill-btn" href="${hotel.website}" target="_blank" rel="noopener">📅 Book on Official Site</a>
    </div>`
    : `
    <div class="detail-links">
      <a class="pill-btn ghost" href="${hotelSearchFallbackUrl(hotel)}" target="_blank" rel="noopener">🔍 Search for this hotel</a>
    </div>
    <p class="rank-sub getting-there-note">No official site on file for this hotel — this opens a general search instead.</p>`;

  const planSection = renderPlanSection();

  return `
    <button class="icon-btn back-btn" data-step="hotel">← Change hotel</button>
    <div class="answer-header">
      <span class="badge answer-badge" style="background:${fit.color}">${fit.score}%</span>
      <div>
        <div class="answer-verdict">${fit.verdict}</div>
        <div class="rank-sub">${theme.emoji} ${theme.label} trip at ${escapeHtml(hotel.name)}</div>
      </div>
    </div>

    <ul class="reasons-list">${reasonsList}</ul>

    ${addressBlock}
    ${nearbyBlock}
    ${gettingThere}
    ${links}

    ${planSection}

    <div class="detail-actions">
      <button class="pill-btn ghost" data-step="theme">Try a different theme</button>
      <button class="pill-btn ghost" data-step="hotel">Try a different hotel</button>
    </div>
    <p class="rank-sub journal-note">Saved to your Trip Journal</p>
  `;
}

function renderPlanSection() {
  if (showKeyForm) {
    return `
    <div class="detail-section plan-section">
      <div class="detail-label">AI API key</div>
      <p class="rank-sub">Stored only in this browser's localStorage — never written to a file, never committed to git. Get a key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>.</p>
      <form id="gemini-key-form" class="custom-add">
        <input id="gemini-key-input" type="password" placeholder="Paste your AI API key" required autocomplete="off" />
        <button type="submit" class="pill-btn">Save</button>
      </form>
      <button class="icon-btn" id="cancel-key-form">Cancel</button>
    </div>`;
  }

  const lengthChips = `
    <div class="chip-row">
      ${TRIP_LENGTH_OPTIONS.map(
        (o) => `<button class="chip ${tripNights === o.nights ? "chip-active" : ""}" data-trip-length="${o.nights}">${o.label}</button>`
      ).join("")}
    </div>`;

  if (aiPlanLoading) {
    return `
    <div class="detail-section plan-section">
      <div class="detail-label">✨ AI Trip Plan</div>
      <p class="rank-sub">Generating your plan…</p>
    </div>`;
  }

  if (aiPlanError) {
    return `
    <div class="detail-section plan-section">
      <div class="detail-label">✨ AI Trip Plan</div>
      ${lengthChips}
      <p class="rank-sub plan-error">${escapeHtml(aiPlanError)}</p>
      <div class="detail-links">
        <button class="pill-btn ghost" data-plan-trip>Try again</button>
        <button class="icon-btn" id="change-key-link">Change API key</button>
      </div>
    </div>`;
  }

  if (aiPlan) {
    return `
    <div class="detail-section plan-section">
      <div class="detail-label">✨ AI Trip Plan <span class="rank-sub">(AI-generated — not the rule-based score above)</span></div>
      ${lengthChips}
      <p class="rank-sub ai-plan-text">${escapeHtml(aiPlan)}</p>
      <div class="detail-links">
        <button class="pill-btn ghost" data-plan-trip>Regenerate</button>
        <button class="icon-btn" id="change-key-link">Change API key</button>
      </div>
    </div>`;
  }

  return `
    <div class="detail-section plan-section">
      <div class="detail-label">How long is the trip?</div>
      ${lengthChips}
      <button class="pill-btn" data-plan-trip>✨ Plan the Trip</button>
      <p class="rank-sub">Uses AI to sketch an itinerary near ${escapeHtml(selectedHotel.name)} for this theme.</p>
    </div>`;
}

function renderJournal() {
  if (state.journal.length === 0) {
    return `
      <button class="icon-btn back-btn" data-step="city">← Back</button>
      <h2 class="step-heading">Your Trip Journal</h2>
      <div class="empty">No trips planned yet. Match your first hotel to start your journal.</div>
    `;
  }
  const rows = state.journal
    .map((j) => {
      const theme = THEME_META[j.themeKey];
      const color = j.score >= 75 ? "#2e7d4f" : j.score >= 50 ? "#b8860b" : "#c0392b";
      return `
      <li class="rank-row">
        <div class="rank-info">
          <div class="rank-name">${theme.emoji} ${escapeHtml(j.hotelName)}</div>
          <div class="rank-sub">${escapeHtml(j.city)} · ${theme.label} · ${timeAgo(j.timestamp)}</div>
        </div>
        <span class="badge" style="background:${color}">${j.score}%</span>
      </li>`;
    })
    .join("");

  return `
    <button class="icon-btn back-btn" data-step="city">← Back</button>
    <h2 class="step-heading">Your Trip Journal</h2>
    <ul class="rank-list">${rows}</ul>
  `;
}

// ---------- events ----------

function bindEvents() {
  const journalBtn = root.querySelector("[data-view-journal]");
  if (journalBtn) {
    journalBtn.addEventListener("click", () => {
      step = "journal";
      render();
    });
  }

  root.querySelectorAll("[data-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      step = btn.dataset.step;
      aiPlan = null;
      aiPlanError = null;
      showKeyForm = false;
      render();
    });
  });

  const planNewBtn = root.querySelector("[data-plan-new]");
  if (planNewBtn) planNewBtn.addEventListener("click", planNewTrip);

  const planTripBtn = root.querySelector("[data-plan-trip]");
  if (planTripBtn) planTripBtn.addEventListener("click", planTheTrip);

  root.querySelectorAll("[data-trip-length]").forEach((btn) => {
    btn.addEventListener("click", () => {
      tripNights = Number(btn.dataset.tripLength);
      render();
    });
  });

  const cancelKeyBtn = document.getElementById("cancel-key-form");
  if (cancelKeyBtn) {
    cancelKeyBtn.addEventListener("click", () => {
      showKeyForm = false;
      render();
    });
  }

  const changeKeyBtn = document.getElementById("change-key-link");
  if (changeKeyBtn) {
    changeKeyBtn.addEventListener("click", () => {
      clearGeminiKey();
      aiPlan = null;
      aiPlanError = null;
      showKeyForm = true;
      render();
    });
  }

  const geminiKeyForm = document.getElementById("gemini-key-form");
  if (geminiKeyForm) {
    geminiKeyForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const key = document.getElementById("gemini-key-input").value.trim();
      if (!key) return;
      setGeminiKey(key);
      showKeyForm = false;
      planTheTrip();
    });
  }

  root.querySelectorAll("[data-pick-city]").forEach((btn) => {
    btn.addEventListener("click", () => chooseCity(btn.dataset.pickCity));
  });

  root.querySelectorAll("[data-pick-hotel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const hotel = MOCK_HOTELS.find((h) => h.id === btn.dataset.pickHotel);
      if (hotel) chooseHotel(hotel);
    });
  });

  root.querySelectorAll("[data-pick-theme]").forEach((btn) => {
    btn.addEventListener("click", () => chooseTheme(btn.dataset.pickTheme));
  });

  const cityInput = document.getElementById("city-input");
  if (cityInput) {
    cityInput.addEventListener("input", (e) => {
      cityQuery = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const newInput = document.getElementById("city-input");
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(pos, pos);
      }
    });
  }

  const showCustomBtn = document.getElementById("show-custom-hotel");
  if (showCustomBtn) {
    showCustomBtn.addEventListener("click", () => {
      showCustomHotelForm = true;
      render();
    });
  }

  const customForm = document.getElementById("custom-hotel-form");
  if (customForm) {
    customForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("custom-hotel-name").value.trim();
      if (!name) return;
      chooseHotel({ id: makeCustomId(), name, city: selectedCity, tags: [] });
    });
  }
}

render();
