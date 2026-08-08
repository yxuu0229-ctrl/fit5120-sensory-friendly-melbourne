# Six-Person GitHub Usage Handbook

Status: **Proposed baseline for team review**<br>
Assignment: **No work is pre-assigned; members claim actual work in LeanKit**

## Course requirement and evidence locations

- Course requirement: [FIT5120 Onboarding — Completed Build](https://learning.monash.edu/mod/assign/view.php?id=6109621)
- School path: FIT5120 Moodle → Onboarding → Completed Build
- Work tracking: [LeanKit / AgilePlace](https://monashie.leankit.com)
- Evidence location: [Team TE37 Project Governance Portfolio (PGP)](https://drive.google.com/drive/folders/1zkA3NtSfl-Jjgt35kKVRmSxm1q3pCHG6)

## Source-of-truth rule

LeanKit is the source of truth for course work, claims, dates, blockers, User Stories and Acceptance Criteria. GitHub records implementation, review and verification evidence.

```text
LeanKit card → GitHub issue → work branch → Pull Request → review → LeanKit/PGP evidence
```

## Branch model

| Branch | Purpose | Rule |
|---|---|---|
| `main` | Reviewed, locally runnable integration baseline | No direct push; merge reviewed Pull Requests only |
| `feature/LK-ID-description` | New feature or User Story work | Create from the latest agreed base and keep short-lived |
| `fix/LK-ID-description` | Defect correction | Link the defect and affected Acceptance Criterion |
| `data/LK-ID-description` | Schema, migration or data-pipeline work | Include reproducibility and RLS impact |
| `docs/LK-ID-description` | Documentation-only work | Review changes to course or operating instructions |

## Daily workflow

1. Confirm and claim the LeanKit card before implementation.
2. Read the User Story, Acceptance Criteria, dependencies and expected evidence.
3. Create or link one GitHub issue and create one short-lived branch.
4. Make small, explainable commits and keep blockers current in LeanKit.
5. Run the agreed local checks.
6. Open a draft Pull Request early with the LeanKit link, criteria and evidence.
7. Obtain review from at least one non-author and resolve every conversation.
8. Merge only after approval, then update LeanKit status, actual finish date and PGP evidence.

## Pull Request requirements

Every Pull Request must state:

1. The linked LeanKit card and GitHub issue.
2. The User Story and Acceptance Criteria addressed.
3. What changed and what is intentionally out of scope.
4. Verification commands and actual results.
5. Screenshots or other evidence when useful, with no secrets or personal data.
6. Database, security, accessibility or documentation impact.
7. Known limitations and blockers.

## Review standard

1. The change matches the linked User Story and Acceptance Criteria.
2. The author can explain every changed file and technical decision.
3. The change contains no unrelated files, secrets, personal data or unlicensed data.
4. Build, type-check and tests pass.
5. Until deployment exists, the reviewer checks the feature locally.

## Recommended repository settings

1. Use a private repository unless the team and mentor approve public release.
2. Use individual accounts; never share passwords or access tokens.
3. Require Pull Requests, at least one approval and resolved review conversations when supported.
4. Block force pushes and deletion of the integration branch.
5. Use squash merge for normal feature Pull Requests.
6. Require multi-factor authentication where available.

## Commit prefixes

- `feat:` new user-visible behaviour
- `fix:` defect correction
- `test:` tests or test data
- `data:` schema, migration or dataset work
- `docs:` documentation only
- `chore:` tooling or maintenance

Reference: [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
