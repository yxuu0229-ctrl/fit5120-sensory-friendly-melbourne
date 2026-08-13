# Relax Maps

Sensory-aware navigation map for Melbourne CBD.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Environment

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Browser-safe anon key only |
| `VITE_GOOGLE_MAPS_API_KEY` | Recommended | Places, Geocoding, Routes (transit) |
| `VITE_OSRM_URL` | No | Defaults to public OSRM |

Never put `SUPABASE_SERVICE_ROLE_KEY` in frontend env vars.

Without a Google key, search falls back to curated CBD landmarks. Transit needs **Routes API** enabled on the Google key.

## Deploy (Vercel)

1. Push this branch to GitHub.
2. Import the repo in [Vercel](https://vercel.com) → Framework Preset: **Vite**.
3. Build command: `npm run build` · Output: `dist` · Node **20+**.
4. Add environment variables (same `VITE_*` names as `.env`).
5. Deploy. SPA routing is handled by `vercel.json`.

After deploy, restrict the Google API key to your production domain (HTTP referrer).

### Cloudflare Pages (optional)

- Build command: `npm run build`
- Output directory: `dist`
- Same `VITE_*` env vars
- `public/_redirects` covers client-side routes

## Stack

- Vite + React + TypeScript + Leaflet
- Supabase (density, refuges, quiet windows)
- Google Places / Geocoding / Routes (optional)
- Public OSRM (walk / cycle / drive)

## Pages

- `/` — landing
- `/map` — plan routes, live Go navigation, overload markers, nearest refuge
