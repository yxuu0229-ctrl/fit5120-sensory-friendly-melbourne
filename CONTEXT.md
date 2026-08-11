# Domain Glossary — Relax Maps

Terms the code is named after. Each term names a module seam; keep code and docs using these words.

## Journey planning

- **Sensory-aware journey** — a walk through the Melbourne CBD planned to limit crowd exposure, not just distance.
- **Route candidate** — a raw walking route (label, distance, duration, positions) from the backend or OSRM, before scoring. Type `RouteCandidate` in `src/lib/journeyPlanning.ts`.
- **Sensory load** — 0–100 score of expected crowd stress along a route, computed from nearby pedestrian-density sensors. Computed only inside `planJourney`.
- **Sensory level** — banding of sensory load: Low (<30), Medium (30–69), High (≥70).
- **Crowd-density threshold** — the user's preferred sensory-load ceiling; routes above it trigger the warning page.
- **Planned route** — a scored, ranked, labelled ("Route A/B/C") route. Type `PlannedRoute`, produced by `planJourney(candidates, sensors, prefs)` — the journey-planning module's whole interface.

## Journey data (the seam)

- **Journey data** — everything fetched from outside the browser: sensor readings, sensory refuges, walking routes, geocoding. Interface `JourneyData` in `src/lib/journeyData.ts`; two adapters: live (`journeyDataLive.ts` — Supabase + OSRM + Nominatim + backend) and prototype (`journeyDataPrototype.ts` — in-memory demo data, also the routes-page fallback).
- **Sensor reading** — one row of `sensor_density_current`: a pedestrian-density sensor's location, density level (Low/Medium/High) and count.

## Congestion

- **Congestion area** — a per-density-level cluster of sensor readings near a route (count + centroid), rendered as map circles. `congestionAreas` in `src/lib/congestion.ts`; default proximity radius is 500 m (`routeSensorRadiusMeters`).
- **Predictive alert** — the journey-monitor warning driven by High-density sensors near the selected route (`highDensitySensorsNearRoute`).

## Quiet spaces

- **Sensory refuge** — a place tagged `is_sensory_refuge` in the `places` table (park, library, quiet public space). Quietness is tagged, never guaranteed.
- **Refuge view** — the detail-page presentation of a refuge, produced by one of two adapters in `src/lib/refuge.ts`: `refugeFromPlace` (database rows) or `refugeFromStatic` (the built-in demo refuges). Field names follow the page's labels; the static adapter deliberately maps `availability` into the "Source" slot to preserve shipped output.

## Address resolution

- **Address field** — one origin/destination input's state machine (idle → checking → ready/error), owned by `useAddressField` in `src/lib/useAddressField.ts`; the terminal resolution logic (CBD shortcut match → geocode) is the pure `resolveAddress` in `src/lib/resolveAddress.ts`.
