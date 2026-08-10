# ADR 0002: Integrated Web Stack

- Status: current repository baseline
- Date: 2026-08-10
- Supersedes: ADR 0001

## Context

The integrated `develop` branch contains a working application under `apps/web` together with data-processing scripts and Supabase project files. The earlier root-level Vite proposal is no longer the repository architecture.

## Decision

Use Next.js + React + TypeScript for the web application, Supabase Postgres/Data API for managed data services, and Supabase Edge Functions only when protected server logic is required. Keep deployment deferred until the team approves the readiness gates in the deployment handbook.

## Consequences

- Web work belongs under `apps/web`; a second root-level frontend must not be introduced.
- Frontend routes and server-side application endpoints can share the Next.js project.
- Data-processing tools remain under `scripts` and must be reproducible.
- Database migrations and Row Level Security remain subject to review.
- The team must re-evaluate hosting only after the application, data and security checks pass.
