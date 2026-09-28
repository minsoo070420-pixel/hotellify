# Hotelify

A Beli-style hotel ranking app: rank hotels you've stayed at through head-to-head comparisons instead of star ratings, keep a want-to-go list, follow friends, and get hotel recommendations based on your taste.

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

## Features

- **Ranking**: pick a hotel you've stayed at, choose a sentiment (Liked it! / It was fine / Didn't like it), answer whether it was worth it as a 5-star stay, then compare it head-to-head against hotels you've already ranked in that bucket. A binary search narrows down its exact position, and your list re-scores itself (0–10) automatically.
- **Want to Go**: bookmark hotels you haven't stayed at yet; "I've stayed here" from that list feeds straight into the ranking flow.
- **Friends & Feed**: follow a set of demo friends, see a match % based on hotels you've both ranked, and view a combined activity feed. Since there's no backend, friends are mock data seeded in `data.js`.
- **Invite Friends**: generates a shareable join link with a copy button. It's a static demo link (no backend to actually onboard anyone).
- **Discover**: filter hotels by price tier (Budget/Moderate/Luxury) and nearby attractions (MLB, NBA, Historical, Beach, Nature, Nightlife, Museums, Shopping, Foodie). Recommendations are scored by a **rule-based heuristic** that also learns from your own rating history — it is not a live AI/LLM call.
- **Amenities**: attach a Gym/Pool/Room photo to a ranked hotel and get a quality score. This is a **beta brightness/contrast/detail heuristic**, not real object recognition — it can't identify actual equipment. Genuine equipment-level analysis would need a real vision-model API call from a backend (so an API key isn't exposed client-side), which this static app intentionally doesn't attempt.

## Project structure

```
index.html   Page shell
styles.css   All styling
data.js      Mock hotel catalog + mock friends
app.js       App state, ranking logic, rendering, event handling
```

## Data & persistence

All of your rankings, want-to-go list, followed friends, and activity are stored in `localStorage` under the key `hotelify_state_v3`. Clearing your browser's site data for `localhost` resets the app.
