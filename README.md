# Team TE37 Sensory-Aware Web Project

This repository is the planned source-of-truth for Team TE37's runnable web build.

## Current status

- Repository governance and architecture baseline: ready for team review.
- Frontend decision: React + Vite + TypeScript.
- Backend decision: Supabase, using Postgres and the generated Data API first.
- Hosting decision: deferred. Vercel may be considered later, but it is not configured now.
- Official Vite React + TypeScript starter: present and locally verifiable.
- Assessed business features: not implemented in this baseline.
- Database schema, real datasets, user-facing features and acceptance tests: pending LeanKit claims and team decisions.

## Course alignment

Every implementation change must map to a LeanKit Epic, User Story and Acceptance Criteria. The deployed build must remain consistent with the presentation and LeanKit board, include database/data scripts and documentation, and run without mentor-visible errors.

- [LeanKit / AgilePlace](https://monashie.leankit.com)
- [Team TE37 Project Governance Portfolio](https://drive.google.com/drive/folders/1zkA3NtSfl-Jjgt35kKVRmSxm1q3pCHG6)

## Proposed technology stack

| Layer | Choice | Why now |
|---|---|---|
| Frontend | React + Vite + TypeScript | Small, fast SPA with type checking and a simple deployment path |
| Database | Supabase Postgres | Managed relational database with migrations and generated APIs |
| Backend API | Supabase Data API | Avoids maintaining a separate server for ordinary database reads |
| Protected server logic | Supabase Edge Functions | Keeps third-party secrets and privileged operations out of the browser |
| Frontend hosting | Deferred | Choose a provider only after the deployment readiness gate is satisfied |
| Source control | GitHub | Pull requests, review history and CI evidence |
| Work tracking | LeanKit | Course-required source for Stories, Acceptance Criteria, ownership and status |
| Governance evidence | PGP | Course-required location for reviewed artefacts and evidence |

## Repository map

```text
.
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── 01-overall-solution-and-repository-structure.md
│   ├── 02-system-architecture-plan.md
│   ├── 03-six-person-github-usage-handbook.md
│   ├── 04-deployment-handbook.md
│   ├── 05-security-baseline.md
│   └── 06-member-contribution-rules.md
├── src/                    # React application; team-authored code goes here
├── supabase/
│   ├── functions/          # Server-side functions only when justified
│   └── migrations/         # Versioned database and RLS changes
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Local setup

```bash
npm install
npm run dev
```

Before opening a Pull Request, run:

```bash
npm run lint
npm run build
```

The current page was initialised from the official Vite React + TypeScript starter and adapted as a neutral Team TE37 repository baseline. Assessed features must be added only through claimed LeanKit work, a traceable branch and a reviewed Pull Request.

## Before implementation starts

1. Confirm the exact onboarding scope and Acceptance Criteria in LeanKit.
2. Record the actual open-data sources, licences, fields and refresh method.
3. Agree on the first database migration and security policies in a team architecture review.
4. Confirm the course boundary for AI-assisted coding; the current student-reported permission covers planning, not implementation code.

## Working documents

- [Overall solution and repository structure](docs/01-overall-solution-and-repository-structure.md)
- [System architecture plan](docs/02-system-architecture-plan.md)
- [Six-person GitHub usage handbook](docs/03-six-person-github-usage-handbook.md)
- [Deployment handbook](docs/04-deployment-handbook.md)
- [Security baseline](docs/05-security-baseline.md)
- [Member contribution rules](docs/06-member-contribution-rules.md)
