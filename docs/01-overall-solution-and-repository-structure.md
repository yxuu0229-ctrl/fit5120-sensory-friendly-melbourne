# Overall Solution and Repository Structure

Status: **Initial repository baseline for team review**<br>
Assignment: **Unassigned — implementation work must be claimed in LeanKit**

## Course requirement and evidence locations

- Course requirement: [FIT5120 Onboarding — Completed Build](https://learning.monash.edu/mod/assign/view.php?id=6109621)
- School path: FIT5120 Moodle → Onboarding → Completed Build
- Work tracking: [LeanKit / AgilePlace](https://monashie.leankit.com)
- Evidence location: [Team TE37 Project Governance Portfolio (PGP)](https://drive.google.com/drive/folders/1zkA3NtSfl-Jjgt35kKVRmSxm1q3pCHG6)

## Current technical baseline

| Layer | Proposed choice | Purpose |
|---|---|---|
| Web application | Next.js + React + TypeScript | Provide the current frontend and server-side application baseline |
| Backend | Supabase Data API | Support normal database reads and writes without a separate server |
| Database | Supabase PostgreSQL | Store relational data with migrations and Row Level Security |
| Protected logic | Supabase Edge Functions, only when required | Protect secrets or privileged operations |
| Task tracking | LeanKit | Record work claims, dates, blockers, Stories and Acceptance Criteria |
| Evidence | PGP | Store approved decisions, tests, build evidence and mentor evidence |

The first target is a website that runs locally and connects safely to Supabase. Do not add deployment, authentication, personal information or extra services until a confirmed User Story requires them.

## Proposed repository structure

```text
team-te37-project/
├── apps/
│   └── web/              # Current Next.js application
│       ├── src/app/      # Routes, layouts and server endpoints
│       ├── src/components/ # Reusable UI components
│       └── public/       # Static web assets
├── scripts/                  # Reproducible data-processing tools
├── data/                     # Approved source and generated data
├── supabase/
│   ├── migrations/       # Schema, indexes, grants and RLS policies
│   ├── functions/        # Protected logic only when justified
│   └── seed.sql          # Synthetic development data
├── docs/                 # Architecture, decisions, deployment and security
├── .github/              # Issue and Pull Request templates; CI later
├── .env.example          # Variable names only; no real secrets
├── .gitignore
├── README.md
└── package.json
```

## What the initial repository should contain

1. A Next.js + React + TypeScript application under `apps/web` that starts locally.
2. The folder structure above, with empty folders added only when immediately useful.
3. A `README.md` containing the actual install, run, build, type-check and test commands.
4. A safe `.env.example` containing variable names but no credential values.
5. A `.gitignore` that excludes `.env`, build outputs, dependencies and editor files.
6. GitHub Issue and Pull Request templates that link work to a LeanKit card and Acceptance Criteria.
7. One small Supabase migration and synthetic seed data only after the first data model is agreed.

## Decisions still required

1. Confirm the minimum runnable feature and its Acceptance Criteria.
2. Confirm the remote repository owner and a backup administrator.
3. Confirm private repository visibility unless the team and mentor approve public release.
4. Confirm the package manager and supported Node.js version.
5. Confirm the first database schema and approved open-data source.

This baseline does not configure deployment, Supabase projects or other external services.
