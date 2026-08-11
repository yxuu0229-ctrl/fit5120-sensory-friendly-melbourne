# ADR 0003: Sensory Indicator, Crowd Tolerance and Documented Defaults

- Status: accepted
- Date: 2026-08-11
- Extends: ADR 0001

## Context

The sprint acceptance criteria require several behaviours to be "agreed" or
"documented": how the sensory indicator is derived (AC 1.1.3), a crowd
tolerance the commuter can set with a documented default (AC 1.2.1 / 1.2.2),
what triggers an alternative-route warning (AC 1.3.1), and a default reference
point when location permission is declined (AC 2.1.6). This ADR records those
agreements so every team member can explain them.

## Decision

### Sensory indicator (AC 1.1.3)

- A route's sensory level (Low / Medium / High) is the density band of its
  **highest-sensory sampled segment**, not an average. Roughly 24 points are
  sampled along the route geometry; each takes the band of its nearest
  pedestrian sensor within 120 m. The worst band along the route is the
  route's rating, so one High block among quiet streets rates the route High.
- The averaged 0–100 "sensory load" remains as a secondary detail figure and
  tie-breaker only.
- Factors: **pedestrian volume band only.** Construction and event activity
  are named in the AC "where available"; they are not present in the City of
  Melbourne datasets this project syncs (pedestrian sensors, landmarks), so
  they are documented here as unavailable rather than silently omitted.

### Crowd tolerance (AC 1.2.1 / 1.2.2 / 1.2.3 / 1.3.1)

- Tolerance is **Low or Medium**. High is deliberately not offered: it would
  accept every route and the warning flow would never trigger.
- A route *fits* the tolerance when its sensory level (worst segment band) is
  at or below the tolerance band.
- **Documented default: Medium.** Applied whenever the commuter has not chosen;
  the UI states that the default is in use. An explicit choice is retained for
  the browser session (sessionStorage).
- Ranking always places routes that exceed the tolerance below routes that fit
  it. Within each group, "avoid congestion" sorts calmest-first (level, then
  load, then duration); otherwise fastest-first.
- Selecting a route whose level exceeds the tolerance opens the warning page,
  which names the triggering segment and offers only alternatives that fit the
  tolerance — or states explicitly that none exists.

### Public transport access points (AC 1.1.5)

- No live PTV feed exists in this project. A fixed list of CBD railway
  stations and major tram stops (`src/lib/transitStops.ts`) is displayed on
  route maps when a stop lies within 150 m of the walking route.

### Default reference point (AC 2.1.6)

- When location permission is declined, quiet-space distances are measured
  from **Melbourne CBD centre (-37.8136, 144.9631)** — the same centre point
  the map views use — and the UI discloses this.

### Data freshness wording (AC 1.1.7 / 1.3.6)

- All crowd readings come from the Supabase cache refreshed ~15 minutes by the
  sync workflow; the journey pages therefore never describe readings as
  "live". The provenance line (source, sensor count, age, staleness) from
  `src/lib/dataProvenance.ts` is shown on the routes, warning and monitoring
  pages as well as the live map.

## Consequences

- `planJourney` needs the effective tolerance as an input; displayed results
  re-rank when the preference changes or sensor data refreshes, without a new
  search.
- The 0–100 threshold slider is replaced by the two-level tolerance control.
- Adding construction/event feeds or live PTV stops later means revisiting
  this ADR.
