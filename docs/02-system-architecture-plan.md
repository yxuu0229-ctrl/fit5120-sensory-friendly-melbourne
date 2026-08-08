# System Architecture Plan

Status: **Proposed baseline for team review**<br>
Assignment: **Unassigned — implementation work must be claimed in LeanKit**

## Course requirement and evidence locations

- Course requirement: [FIT5120 Onboarding — Completed Build](https://learning.monash.edu/mod/assign/view.php?id=6109621)
- School path: FIT5120 Moodle → Onboarding → Completed Build
- Work tracking: [LeanKit / AgilePlace](https://monashie.leankit.com)
- Evidence location: [Team TE37 Project Governance Portfolio (PGP)](https://drive.google.com/drive/folders/1zkA3NtSfl-Jjgt35kKVRmSxm1q3pCHG6)

## Architecture principle

Use the smallest architecture that satisfies confirmed User Stories. Start with React and Supabase. Add a separate backend service only if a documented requirement cannot be handled safely by Supabase.

## Components

| Component | Responsibility | Connection rule |
|---|---|---|
| User browser | Displays the interface and captures user actions | Must not contain privileged keys or database credentials |
| React application | Pages, components, routing, accessibility and client-side state | UI components call a typed service layer |
| Supabase Data API | Provides permitted access to PostgreSQL | All exposed tables use minimum grants and RLS |
| Supabase Edge Functions | Handles protected secrets, privileged validation or external APIs | Use only when browser-safe access is insufficient |
| PostgreSQL | Stores cleaned project data | Schema and policy changes are versioned and reviewed |
| Approved open-data sources | Supply licensed data required by confirmed User Stories | Record owner, licence, fields, freshness and limitations |

## Normal data flow

1. The user opens the React website and selects a confirmed feature or filter.
2. React validates the input and calls the Supabase Data API through the service layer.
3. PostgreSQL applies grants and Row Level Security before returning permitted rows.
4. React displays loading, empty, success and failure states accessibly.

## When to use an Edge Function

Use a Supabase Edge Function only when at least one of the following is true:

1. A third-party API secret must be protected.
2. A privileged database operation is required.
3. External data must be validated or transformed on the server.
4. A webhook or scheduled server-side task is required.

## Do not add yet

1. A separate Express or NestJS server.
2. Microservices, queues, Redis or Kubernetes.
3. Authentication or personal information.
4. Paid monitoring or infrastructure.
5. Any service not required by confirmed Acceptance Criteria.

## Architecture acceptance checklist

1. Every component supports at least one confirmed requirement.
2. The frontend-to-data contract is documented and typed.
3. Database schema, migrations and RLS policies are reproducible.
4. Secrets never enter browser code or the repository.
5. One team meeting records architecture decisions, unresolved questions and member availability before implementation claims are made.

## Technical references

- [React documentation](https://react.dev/learn/build-a-react-app-from-scratch)
- [Supabase local development](https://supabase.com/docs/guides/local-development/overview)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
