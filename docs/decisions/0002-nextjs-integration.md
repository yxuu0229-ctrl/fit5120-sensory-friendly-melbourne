# ADR 0002: Dual Web Application Baseline

- Status: resolved — consolidated into the single root Vite application (2026-08-10)
- Date: 2026-08-10
- Extends: ADR 0001

## Context

The integrated `develop` branch contains a team-built Vite product frontend at the repository root and a Next.js application under `apps/web`, together with data-processing scripts and Supabase project files. The stock Vite starter content is no longer present, but Vite remains the build system for the team-built root frontend.

## Decision

Keep both current applications intact until the team reviews their overlapping responsibilities. Use Supabase Postgres/Data API for managed data services and Supabase Edge Functions only when protected server logic is required. Keep deployment deferred until the team chooses a deployable entrypoint and approves the readiness gates in the deployment handbook.

## Consequences

- Product UI work currently exists under the root `src`; Next.js integration work exists under `apps/web`.
- New work must name its intended application in the LeanKit card and Pull Request.
- The team must decide whether to migrate, consolidate or retain both applications before deployment.
- Data-processing tools remain under `scripts` and must be reproducible.
- Database migrations and Row Level Security remain subject to review.
- The team must re-evaluate hosting only after the application, data and security checks pass.

## Outcome (2026-08-10)

The consolidation was carried out the same day: the Next.js application's route
planner, density layer, sensor detail, historical trend and status page were
ported into the root Vite application (`src/lib`, `src/components/LiveMapPage.tsx`,
`src/components/DataStatusPage.tsx`), its API routes became browser-side
functions against Supabase + OSRM, and `apps/web` was removed. The repository
now has one deployable web entrypoint, matching ADR 0001. Acceptance-criteria
verify scripts were repointed and re-run (AC 1.1.4, 2.1.1, 2.2.5, 2.2.7 all
pass).
