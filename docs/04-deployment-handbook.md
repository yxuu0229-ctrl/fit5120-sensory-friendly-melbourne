# Deployment Handbook

Status: **Deferred — do not configure a hosting platform yet**<br>
Assignment: **Unassigned — future deployment work must be claimed in LeanKit**

## Course requirement and evidence locations

- Course requirement: [FIT5120 Onboarding — Completed Build](https://learning.monash.edu/mod/assign/view.php?id=6109621)
- School path: FIT5120 Moodle → Onboarding → Completed Build
- Work tracking: [LeanKit / AgilePlace](https://monashie.leankit.com)
- Evidence location: [Team TE37 Project Governance Portfolio (PGP)](https://drive.google.com/drive/folders/1zkA3NtSfl-Jjgt35kKVRmSxm1q3pCHG6)

## Current decision

Do not configure Vercel, Netlify, Cloudflare Pages or another hosting provider yet. The current target is a React website that runs locally and connects safely to the agreed Supabase development environment.

## Current local-run baseline

1. Install the agreed Node.js version and package manager.
2. Copy browser-safe variable names from `.env.example` into a local `.env` file ignored by Git.
3. Install dependencies and start the React development server.
4. Confirm the home route loads without a mentor-visible error.
5. Connect to the Supabase development project and verify one permitted data request.
6. Run the build, type-check and tests; record actual commands and results in the Pull Request and LeanKit card.

## Deployment readiness gate

| Gate | Evidence required before choosing a provider |
|---|---|
| Scope | Confirmed minimum feature set and Acceptance Criteria |
| Quality | Production build succeeds with no mentor-visible errors |
| Data | Reviewed migrations, data scripts and working RLS policies |
| Security | No secret in the browser, repository, screenshots, LeanKit or PGP |
| Operations | Agreed production access, backup access, variables and rollback method |
| Course alignment | Build matches presentation, LeanKit and PGP evidence |

## Future provider decision criteria

1. Supports a React/Vite static build and a stable HTTPS URL.
2. Integrates with the agreed GitHub repository.
3. Provides preview deployments if possible.
4. Separates development, preview and production environment values.
5. Fits the team's access, cost, availability and evidence needs.
6. Keeps the submitted release stable during mentor review.

Vercel is likely to be the simplest later option for a Vite frontend because it can connect to GitHub and deploy static builds. It should still be selected only after the readiness gate is satisfied and the team records the decision.

## Future release sequence

1. Record the provider decision in the team meeting notes and LeanKit.
2. Confirm individual account access and backup access; do not share credentials.
3. Configure Preview against a development Supabase project.
4. Configure Production against a separate production Supabase project if the project reaches that stage.
5. Test the candidate from a clean browser on desktop and mobile, including empty and error states.
6. Apply reviewed database migrations before frontend code that depends on them.
7. Tag the exact release and record the stable link and evidence in LeanKit/PGP.
8. Freeze the reviewed version until the assessment review is complete.

## Rollback baseline

1. Keep the previous known-good release identifiable by tag or deployment record.
2. Keep database migrations reversible where practical and document irreversible changes.
3. If a release fails, restore the previous frontend release and assess database compatibility before changing data.
4. Record the incident, decision and verification evidence.
