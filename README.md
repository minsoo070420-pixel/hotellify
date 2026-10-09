# Travelify

A trip-fit matcher: pick a city you're traveling to, pick a trip theme (Romantic / Family / Business / Adventure / Relaxation), pick a hotel there (the picker shows each one's fit score for that theme), and get a plain-language verdict plus an optional AI-generated itinerary.

No backend, no build step, no dependencies — just static HTML/CSS/JS with state saved in the browser's `localStorage`.

## Setup

You need a local static file server (opening `index.html` directly won't work reliably because of `localStorage` and file-input APIs).

**Option 1 — Python (no install needed on macOS/Linux):**

```bash
cd hotelify
python3 -m http.server 8743
```

Then open [http://localhost:8743](http://localhost:8743).

**Option 2 — Node, if you have it installed:**

```bash
cd hotelify
npx serve .
```

## Flow

1. **City** — search/pick a city, or type one not in the catalog and use it anyway.
2. **Theme** — pick the vibe for the trip: Romantic, Family, Business, Adventure, or Relaxation.
3. **Hotel** — pick a hotel in that city, or enter one manually if it's not on file. Each option shows its fit score for the theme you just picked, sorted best-first.
4. **Answer** — a fit score (0–100%) and plain-language reasons, derived from the hotel's own tags/price tier against that theme's profile. This is a **transparent rule-based heuristic**, not a live AI/LLM call — a hotel with no tag data (e.g. one you typed in manually) honestly gets a low-confidence result instead of a fabricated one.

The answer screen also shows:
- The hotel's real **address** and a few real **nearby landmarks** (best-effort, not a verified database).
- **Getting there from the airport** — live Google Maps transit and driving directions, not an invented fare/time.
- **Book on Official Site** — links straight to the hotel's real website when one is on file; falls back to a general search only for hotels with no known site (e.g. ones you typed in manually).
- **✨ Plan the Trip** — an optional AI-generated itinerary (see below).

## AI Trip Plan (Gemini)

Pick a trip length (1 night up to 4+ nights) and hit "Plan the Trip" to get a day-by-day itinerary from Gemini, grounded in the hotel's real nearby landmarks and the theme you picked.

This needs your own Gemini API key (free tier available at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)). The app will prompt for it the first time you use the feature.

**Important: the key is stored only in your browser's `localStorage`.** It is never written into `app.js`, `data.js`, or any other file, and never gets committed to this repo. That's deliberate — this is a static, backend-less app, so there is no secure place to hold a shared key that all users could use without it being visible to anyone who opens dev tools. The only safe options for a client-only app are (a) each person supplies their own key, which is what this does, or (b) stand up a small backend/serverless proxy that holds the key server-side — which this project doesn't have. If you ever deploy this app somewhere public with the intent that *other* people use your key, don't: add a real backend proxy first.

To remove a saved key: "Change API key" on the answer screen, or clear `localStorage` for this site.

## Turning on the AI proxy (no more key prompts)

By default each person pastes their own Gemini key, because a static site has nowhere safe to hide a shared one. To remove that step for everyone, the key can live on the server instead. The browser then only talks to your own server function, and only signed-in users get through. Two ways to host that function; pick one.

**Option A: Vercel (`api/gemini.js`)**

1. In the Supabase SQL Editor, run the **"AI proxy"** section at the end of `supabase/schema.sql` (it adds a per-user daily request budget).
2. In Vercel: your project, then **Settings, Environment Variables**. Add `GEMINI_API_KEY` with a freshly created key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey), for Production (and Preview if you use it). Then **Redeploy**; variables only apply to new deployments.
3. In `config.js`, set `AI_PROXY_ENABLED = true` and `AI_PROXY_URL = "/api/gemini"`, then commit and push.

**Option B: Supabase Edge Function (`supabase/functions/gemini`)**

1. Run the same SQL section.
2. With the [Supabase CLI](https://supabase.com/docs/guides/cli): `supabase login`, `supabase link --project-ref vmrjdyulamtubpvkaefo`, `supabase secrets set GEMINI_API_KEY=your-new-key`, `supabase functions deploy gemini`.
3. In `config.js`, set `AI_PROXY_ENABLED = true` (leave `AI_PROXY_URL` empty).

Never put the key in a file or a chat. Use a key that has never been pasted anywhere.

Optional settings (Vercel environment variables, or Supabase secrets): `AI_DAILY_LIMIT` is requests per user per day, default 200 (one plan check can use several because the app races a few models); the Supabase option also accepts `ALLOWED_ORIGINS`.

The Vercel function only works on the deployed site. On a local `python3 -m http.server` there is no `/api`, so keep `AI_PROXY_ENABLED = false` for local work and the app asks for a personal key as before.

## Why a journal, not a streak

One mechanic is deliberately borrowed from why Beli got trendy with Gen Z, based on actual research rather than a vibe: Beli's edge over Yelp-style reviews is partly that it's a personal memory archive, not an anonymous rating — people build identity by stringing experiences into a story. Every match you generate here is saved to your **Trip Journal** (the "Journal" button in the header) so your trip history reads like a travel diary.

Beli's other big levers don't translate as cleanly to a solo planning tool with no social graph, so they're left out rather than faked:
- **Trusting friends' scores over strangers'** needs real friends, which would mean inventing fake people.
- **Streaks** (loss-aversion habit loops) were tried in an earlier version of this app and then deliberately removed.

## Project structure

```
index.html   Page shell
styles.css   All styling
data.js      Hotel catalog (city/tier/tags/address/website/nearby) + theme definitions
app.js       App state, fit-scoring logic, Gemini integration, rendering, event handling
```

## Data & persistence

Your Trip Journal is stored in `localStorage` under the key `hotelify_tripmatch_v1`; your Gemini key (if you add one) under `hotelify_gemini_key`. Clearing your browser's site data for `localhost` resets both.
