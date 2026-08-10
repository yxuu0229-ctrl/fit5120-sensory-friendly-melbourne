# ADR 0001: Initial Web Stack

- Status: adopted for the product frontend; extended by ADR 0002
- Date: 2026-08-08

## Context

The team needs a runnable web application with a database, reproducible data scripts, documentation, acceptance tests and a stable mentor-facing deployment. The detailed product design and data schema are not yet final.

## Decision

Use React + Vite + TypeScript for the frontend, Supabase Postgres/Data API for the backend, Supabase Edge Functions only for protected server logic and GitHub for source control. Deployment is deferred. Vercel may be considered later only after the deployment readiness gate is satisfied.

The product frontend was later integrated at the repository root. See ADR 0002 for the additional Next.js application and the pending consolidation decision.

## Consequences

- The team maintains one codebase and avoids a separate server initially.
- Database migrations and RLS become part of normal code review.
- Local review is required until a deployment provider is approved.
- Supabase free-project pausing and lack of automatic backups require a release check and versioned scripts.
- A custom backend can be introduced later only when a confirmed requirement cannot be served safely by Supabase.
