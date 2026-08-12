# Relax Maps

Sensory-aware walking map for Melbourne CBD. Local-first MVP.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Environment

Copy `.env.example` to `.env`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GOOGLE_MAPS_API_KEY=
VITE_OSRM_URL=https://router.project-osrm.org
```

Without a Google key, search falls back to curated CBD landmarks.

## Stack

- Vite + React + TypeScript + Leaflet
- Supabase (density, refuges, quiet windows)
- Google Places (optional free-tier search)
- Public OSRM (walking routes)

## Pages

- `/` — landing
- `/map` — plan top-3 calm→busy routes, Go live navigation, overload markers, nearest refuge
