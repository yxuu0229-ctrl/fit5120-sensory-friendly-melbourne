# Member Contribution Rules

Status: **Proposed team rules for review**<br>
Assignment: **No member or work area is pre-assigned**

## Course requirement and evidence locations

- Course requirement: [FIT5120 Onboarding — Completed Build](https://learning.monash.edu/mod/assign/view.php?id=6109621)
- School path: FIT5120 Moodle → Onboarding → Completed Build
- Work tracking: [LeanKit / AgilePlace](https://monashie.leankit.com)
- Evidence location: [Team TE37 Project Governance Portfolio (PGP)](https://drive.google.com/drive/folders/1zkA3NtSfl-Jjgt35kKVRmSxm1q3pCHG6)

## Allocation rule

This document does not appoint an owner, coordinator, reviewer or backup for any development area. Members discuss scope and capacity first, then claim actual work in LeanKit. A member who claims a card owns its progress, evidence and communication until it is completed, transferred or re-planned by agreement.

## Definition of Ready

A task may be claimed only when:

1. The User Story and Acceptance Criteria are specific and testable.
2. Required design, data source, licence and interface decisions are available.
3. Dependencies and blockers are visible in LeanKit.
4. Expected evidence and review needs are clear.
5. The member understands the planned date and can complete it or negotiate a change early.

## Contribution workflow

1. Claim the LeanKit card and record the assigned member and actual start date.
2. Link or create the GitHub issue and work branch.
3. Commit small, explainable changes and keep blockers current.
4. Open a Pull Request with Acceptance Criteria, verification commands and evidence.
5. Receive review from at least one non-author and resolve all comments.
6. Merge, then update LeanKit status, actual finish date and PGP evidence.

## Definition of Done

A task is complete only when:

1. All linked Acceptance Criteria pass and the result can be demonstrated.
2. Build, type-check and tests pass without unresolved errors.
3. Relevant database migrations, RLS policies and data scripts are reproducible.
4. A non-author review is complete and every review conversation is resolved.
5. Documentation, LeanKit status and PGP evidence match the actual result.
6. No secret, personal information or unlicensed data has been added.

## Collaboration expectations

1. Raise blockers in LeanKit and team chat as soon as they are known.
2. Do not silently change an agreed interface, schema or Acceptance Criterion.
3. Request review early enough to leave time for correction and integration.
4. Do not approve a Pull Request that has not been checked.
5. Keep commits and Pull Requests focused on one claimable task.
6. Keep the application runnable after each merge to `main`.

## Team decision meeting

An online meeting is required before implementation claims are finalised. Members should provide their available times early enough to leave working, review and integration time before the course deadline.

Meeting checklist:

1. Confirm the minimum runnable feature set and Acceptance Criteria.
2. Review open work areas and collect member preferences, strengths and availability.
3. Agree the frontend-data contract, first database migration and review order.
4. Record actual claims, planned dates, dependencies and blockers in LeanKit.

## Required meeting reply format

```text
Name:
Major / specialisation:
Strengths:
Technologies and tools I can use:
What I can contribute to this project:
Tasks I would like to claim:
Available times for the online meeting:
Current blockers:
```

Claims are not valid until they are recorded in LeanKit after team agreement.
