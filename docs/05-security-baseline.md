# Security Baseline

Status: **Required before connecting real data or publishing a build**<br>
Assignment: **Unassigned — security work must be claimed in LeanKit**

## Course requirement and evidence locations

- Course requirement: [FIT5120 Onboarding — Completed Build](https://learning.monash.edu/mod/assign/view.php?id=6109621)
- School path: FIT5120 Moodle → Onboarding → Completed Build
- Work tracking: [LeanKit / AgilePlace](https://monashie.leankit.com)
- Evidence location: [Team TE37 Project Governance Portfolio (PGP)](https://drive.google.com/drive/folders/1zkA3NtSfl-Jjgt35kKVRmSxm1q3pCHG6)

## Secrets and environment values

| Value | Allowed location | Rule |
|---|---|---|
| Supabase URL | Local browser environment; future hosting environment | May be exposed as configuration |
| Supabase publishable key | Browser environment with correct RLS | Browser-safe does not replace RLS |
| Supabase secret/service-role key | Protected Edge Function secret only | Never place in React, GitHub, screenshots, LeanKit or PGP |
| Third-party API secret | Protected server-side secret only | Never send it to the browser |
| Database password | Approved private secret store | Never share through chat or documents |

## Database controls

1. Enable Row Level Security on every table exposed through the Supabase Data API.
2. Grant only operations required by confirmed User Stories.
3. Review every migration and policy change in a Pull Request.
4. Use synthetic development data and avoid personal information.
5. Test unauthenticated access, invalid input, missing records and expected error paths.
6. Back up required data before an irreversible migration.

## Open-data controls

1. Record the dataset owner, source URL, licence, attribution, retrieval date, fields used and limitations.
2. Import only fields needed by confirmed User Stories.
3. Do not scrape or reuse data without confirmed permission.
4. Document freshness, update method, missing values, bias and fallback behaviour.
5. Keep raw source data separate from cleaned or transformed data where practical.

## Team access controls

1. Every member uses an individual GitHub and Supabase account.
2. Enable multi-factor authentication where available.
3. Limit administrator access and agree separate backup access.
4. Remove access when a member leaves and rotate any exposed credential.
5. Never publish screenshots containing keys, tokens, connection strings or private data.

## Before every Pull Request is merged

1. Check that no `.env` or secret file is included.
2. Check changed code and documentation for copied credentials.
3. Confirm new database tables have reviewed grants and RLS policies.
4. Confirm inputs and errors are handled safely.
5. Confirm the author can explain the implementation.

## AI and explainability boundary

The team may use AI for planning according to the student-reported Studio guidance. This does not automatically confirm permission for AI-generated implementation. Every implementation contribution must comply with the latest course instructions, be personally owned and be fully explainable by the contributing member.

References:

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
