# 07 — Testing, Submission and Evaluator Prep

## 1. Permission test matrix (run in Bruno/Postman and as Supertest tests)
Log in with the seed users. Expected results come from `03_PERMISSIONS.md`.

| # | Actor | Request | Expected |
|---|---|---|---|
| 1 | none | `GET /projects` | 401 |
| 2 | inactive@example.com | `POST /auth/login` (correct password) | 403 `ACCOUNT_DEACTIVATED` |
| 3 | member1 | `GET /users` | 403 |
| 4 | admin | `GET /users` | 200 |
| 5 | pm1 | `POST /projects` | 403 |
| 6 | admin | `POST /projects` with `projectManagerId` = pm1 | 201 |
| 7 | member2 | `GET /projects/<Mobile App Launch>` (not a member) | 403 |
| 8 | pm1 | `PATCH /projects/<Mobile App Launch>` (PM elsewhere) | 403 |
| 9 | member1 | `DELETE /tasks/<any task>` | 403 |
| 10 | member1 | `POST /projects/<Website Redesign>/tasks` | 403 |
| 11 | member1 | `PATCH /tasks/<task assigned to member2>` | 403 |
| 12 | member1 | `PATCH /tasks/<own task>` `{ version, status }` | 200 |
| 13 | member1 | `PATCH /tasks/<own task>` `{ version, assigneeId }` | 403 |
| 14 | viewer | `PATCH /tasks/<any>` | 403 |
| 15 | viewer | `POST /tasks/<any>/comments` | 403 |
| 16 | viewer | `GET /projects/<Website Redesign>/tasks` | 200 |
| 17 | pm1 | `POST /projects/<Website Redesign>/members` role `PROJECT_MANAGER` | 403 |
| 18 | admin | same request | 201 (target user must be global PM, else 400 `INVALID_MEMBER`) |
| 19 | pm1 | add `viewer@example.com` as `TEAM_MEMBER` (BR-4) | 400 `INVALID_MEMBER` |
| 20 | pm1 | `PATCH /tasks/<task>` `{ version, assigneeId: viewer }` | 400 `INVALID_ASSIGNEE` |
| 21 | pm1 | `PATCH /tasks/<Legacy Migration task>` | 409 `PROJECT_ARCHIVED` |
| 22 | pm1 | `POST /projects/<Legacy Migration>/unarchive` | 200 |
| 23 | member1 | `DELETE /comments/<comment by pm1>` | 403 |
| 24 | member1 | `DELETE /comments/<own comment>` | 204 |
| 25 | admin | `POST /users/<own id>/deactivate` | 403 |
| 26 | any | `GET /tasks/not-a-uuid` | 400 `VALIDATION_ERROR` |
| 27 | pm1 | remove member1 from Website Redesign | 204 and member1's tasks now have `assignee: null` |

## 2. Concurrency test
Automated (the important one):
1. Login as pm1, `GET /tasks/:id` → note `version` = N.
2. `PATCH /tasks/:id` `{ version: N, title: "A" }` → 200, response `version` = N+1.
3. `PATCH /tasks/:id` `{ version: N, title: "B" }` (stale) → **409 `VERSION_CONFLICT`**, `details.currentTask.title === "A"`.
4. Fire two PATCHes with the same version **at the same time** (`Promise.all`): exactly one 200 and one 409.

Manual, two sessions: open one task in a normal window as `pm1` and in an incognito window as `admin`. Save in the first, then save in the second. The conflict dialog must appear and both buttons must work.

## 3. Automated tests to write (Vitest + Supertest)
- `policy.test.ts`: table-driven checks of every function in `policy.ts` against the matrix.
- `permissions.api.test.ts`: rows 1–27 above (use `supertest.agent` per user to keep the cookie).
- `tasks.concurrency.test.ts`: the concurrency test above.
- `auth.test.ts`: login, deactivated user, change password.
Tests may run against the seeded dev DB (call the seed function in `beforeAll`) or a separate `pm_platform_test` database; whichever you pick, document it in the README.

## 4. Manual UI smoke test (per role)
| Role | Verify |
|---|---|
| Admin | Sees all projects and the Users page; creates a project and assigns a PM; deactivates a user |
| PM | Sees only own projects; creates/edits/deletes tasks; manages members (cannot grant PM); archives a project |
| Team Member | Edits only own tasks; no create/delete buttons; can comment |
| Viewer | Everything read-only; no comment box |

## 5. README.md outline (required)
1. What the project is (2–3 lines) and tech stack.
2. Prerequisites (Node 22+, PostgreSQL 14+, Git).
3. Setup:
   - Clone, `cd backend`, `npm install`, copy `.env.example` to `.env` and fill values (explain each variable).
   - Create the database: `psql -U postgres -c "CREATE DATABASE pm_platform;"`.
   - Migrations: `npx prisma migrate dev` (or `npx prisma migrate deploy`).
   - Seed: `npm run seed`.
   - Start backend: `npm run dev` (port 4000).
   - `cd ../frontend`, `npm install`, copy `.env.example` to `.env.local`, `npm run dev` (port 3000).
4. **Sample logins table** (copy from `02_DATA_MODEL.md` §6).
5. Running tests.
6. Project structure (short) and link to `docs/ARCHITECTURE_NOTE.md`.
7. Known limitations and what you would do next.
Use PowerShell-compatible commands.

## 6. Architecture note outline (`docs/ARCHITECTURE_NOTE.md`, keep it to about one page)
1. **Key technical choices** and why (Express + Prisma + Postgres, JWT in httpOnly cookie, Zod, TanStack Query; roles as enums instead of a table).
2. **Data model**: the five tables, relationships, key constraints (embed the ERD).
3. **Authorization**: two role layers, effective-role resolution, the central policy module, order of checks, field-level rules, why 403 not 404, UI permissions are cosmetic.
4. **Concurrent updates**: version column, atomic `UPDATE … WHERE id AND version`, 409 with `currentTask`, conflict dialog UX.
5. **Data integrity**: transactions (member removal, project creation), cascades, validation, soft-deactivation.
6. **Assumptions** (from PRD §10) and trade-offs.

## 7. Final submission checklist
- [ ] `.env` is **not** in Git; both `.env.example` files exist.
- [ ] `docs/`, `README.md`, `AGENTS.md`, architecture note committed.
- [ ] All tests pass locally.
- [ ] **Fresh clone check:** clone the repo into a new folder, follow the README exactly (new database, migrate, seed, start both apps), log in as all four roles.
- [ ] `git log` shows clear commits through the whole session.
- [ ] Final `git push` done; the newest commit on GitHub matches your local `HEAD` (the latest commit is what is evaluated).

## 8. Explainability prep (you will be questioned and may be asked to change code live)
Be able to answer without opening the AI:
- Walk through one request end to end: cookie → `authenticate` → validate → service → policy → Prisma → DTO.
- Why is the version check in the `WHERE` clause and not "read, compare, write"? (Race condition.)
- Where do permissions live and how would you add a new role or permission? (`policy.ts` plus the matrix.)
- Why can a Team Member view all tasks but edit only their own? (Assumption in PRD §10.)
- What happens to tasks when a member is removed? (Unassigned in the same transaction.)
- Why does deactivation work on existing sessions? (DB user lookup per request.)
- Which parts did AI generate and which decisions were yours? Keep a short list in `docs/DECISIONS.md` as you go.

Likely live-change requests to practice: add a new task status, let Viewers comment, add a `labels` field to tasks (migration + API + UI), make a 403 return 404 for non-members, add a filter to the task list.
