# Hotelify

A trip-fit matcher: pick a city you're traveling to, pick a hotel there, pick a trip theme (Romantic / Family / Business / Adventure / Relaxation), and get a fit score with reasons for why that hotel suits that trip.

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
2. **Hotel** — pick a hotel in that city, or enter one manually if it's not on file.
3. **Theme** — pick the vibe for the trip: Romantic, Family, Business, Adventure, or Relaxation.
4. **Answer** — a fit score (0–100%) and plain-language reasons, derived from the hotel's own tags/price tier against that theme's profile. This is a **transparent rule-based heuristic**, not a live AI/LLM call — a hotel with no tag data (e.g. one you typed in manually) honestly gets a low-confidence result instead of a fabricated one. The answer screen also shows the hotel's real address, a link to its official website, and a "Find Deals" link to Google Hotels' live price comparison (no invented discount numbers — there's no real pricing API wired in here).

## Why a streak and a journal

Two mechanics are deliberately borrowed from why Beli got trendy with Gen Z, based on actual research rather than a vibe:

- **Streak** (🔥 in the header): Beli leans on loss aversion the way Snapchat streaks do — missing a day of logging hurts more than adding one helps, which pulls people back. Here, planning a trip keeps your streak alive; missing a day resets it to 1.
- **Trip Journal**: Beli's edge over Yelp-style reviews is partly that it's a personal memory archive, not an anonymous rating — people build identity by stringing experiences into a story. Every match you generate is saved to your Journal (tap the streak badge) so your trip history reads like a travel diary.

Beli's other big lever — trusting friends' scores over strangers' — doesn't translate here: this is a solo planning tool with no social graph, so it's intentionally left out rather than faked with invented "friends."

## Project structure

```
index.html   Page shell
styles.css   All styling
data.js      Hotel catalog (city/tier/tags/address/website) + theme definitions
app.js       App state, fit-scoring logic, rendering, event handling
```

## Data & persistence

Your Trip Journal and streak are stored in `localStorage` under the key `hotelify_tripmatch_v1`. Clearing your browser's site data for `localhost` resets the app.
