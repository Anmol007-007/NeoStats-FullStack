# 06 — Implementation Plan (3 hours)

Work in phases. Each phase ends with something that runs, then a commit and **push**. Paste the prompt for the phase into your IDE's AI chat (the AI should have `AGENTS.md` and `docs/` in context).

| Phase | Window | Goal |
|---|---|---|
| 0 | 0:00–0:15 | Setup and scaffolding |
| 1 | 0:15–0:35 | Schema, migration, seed |
| 2 | 0:35–1:20 | Backend (auth, policy, all APIs) |
| 3 | 1:20–2:25 | Frontend |
| 4 | 2:25–2:45 | Tests and hardening |
| 5 | 2:45–3:00 | README, architecture note, final push and fresh-clone check |

**Priority if you run late:** P0 = auth, policy, projects, members, tasks with version check, task/comment UI, seed, README. P1 = users admin page, dashboard, filters and pagination UI. P2 = Kanban, extra polish. Cut P2 first, then P1.

---

## Phase 0 — Setup and scaffolding
Do the laptop setup from the chat (Git, Node, VS Code, native PostgreSQL, `pm_platform` database, GitHub repo).

**Prompt**
> Read AGENTS.md and docs/05_ARCHITECTURE.md. Scaffold the monorepo: `/backend` (Express 5 + TypeScript, `tsx watch`, scripts `dev`, `build`, `start`, `typecheck`, `test`, `seed`) with a `GET /api/v1/health` route, CORS for `http://localhost:3000` with credentials, helmet, cookie-parser, Zod-validated env in `src/config/env.ts`, and `.env.example`. Add `.gitignore` (node_modules, .env, .next, dist) at the root. In `/frontend` (already created by create-next-app) add shadcn/ui, TanStack Query, and a home page that calls the health endpoint through `lib/api.ts` and shows the result. Add a root README stub. Pin prisma@6 and @prisma/client@6 but do not set up the schema yet.

**Done when:** both servers run, the frontend shows `ok` from the backend, first commit pushed.
**Commit:** `chore: scaffold backend and frontend with health check`

---

## Phase 1 — Schema, migration, seed
**Prompt**
> Implement docs/02_DATA_MODEL.md exactly: put the Prisma schema in `backend/prisma/schema.prisma`, run `prisma migrate dev --name init`, and write `prisma/seed.ts` per section 6 (all 7 users, 3 projects, memberships, 12 tasks total, a few comments, bcryptjs hashes). The seed must delete in dependency order, refuse to run in production, and print the sample credentials. Add the `prisma.seed` config and `npm run seed`.

**Done when:** `npx prisma migrate reset` produces a fully seeded DB; you can see the rows in `psql` or Prisma Studio.
**Commit:** `feat(db): add prisma schema, migration and seed data`

---

## Phase 2 — Backend
Split into steps and commit after each.

**2a. Foundation and auth**
> Implement per docs/05 §3–5 and docs/04 Auth section: `lib/errors.ts` (AppError helpers), `middleware/errorHandler.ts`, `middleware/validate.ts` (Zod for body/query/params), `lib/jwt.ts`, `middleware/authenticate.ts` (loads user from DB, rejects inactive), `middleware/requireGlobalRole.ts`, login rate limit, and the auth module: login, logout, me, update me, change password. Use bcryptjs. Follow the standard error shape.

**Done when:** login sets a cookie, `/auth/me` works, wrong password gives 401, a deactivated seed user gets 403.
**Commit:** `feat(auth): login, logout, me, change password`

**2b. Policy and projects**
> Implement `permissions/policy.ts` and `permissions/context.ts` exactly as in docs/03 (pure functions, effective-role resolution, `getProjectContext`). Then implement the projects module and the members module from docs/04 (list scoped to membership, create with optional initial PM in a transaction, patch, archive/unarchive, delete, members CRUD, member-candidates). Enforce BR-4, BR-5, BR-6, BR-8. Return `myRole` and `permissions` in project responses via DTO mappers.

**Done when:** Admin sees all projects, `member2` sees only Website Redesign, a PM cannot add another PM, archived project rejects writes with 409.
**Commit:** `feat(projects): projects and members with server-side authorization`

**2c. Tasks (the critical part)**
> Implement the tasks module per docs/04 and docs/03 §4: list with filters/sort/pagination, create, get, delete, global `GET /tasks?assignee=me`, and `PATCH /tasks/:id` with optimistic locking exactly as in docs/05 §6 (`updateMany` where id and version, 409 `VERSION_CONFLICT` with `details.currentTask`). Field-level permission checks (Team Member only own tasks, never `assigneeId`), assignee validation (BR-7), archived check. Include per-task `permissions` in the DTO.

**Done when:** in Bruno, two PATCH calls with the same `version` → first 200 (version+1), second 409 with the latest task; `member1` PATCHing a task assigned to `member2` → 403; `viewer` PATCH → 403.
**Commit:** `feat(tasks): tasks API with optimistic locking and field-level permissions`

**2d. Comments, users, dashboard**
> Implement comments (list, create, delete with the matrix rules), the users module (Admin only: list/search/filter, create, get, patch, activate/deactivate, BR-1, BR-3), and `GET /dashboard`. Same conventions.

**Done when:** every endpoint in docs/04 exists and responds with the documented shapes.
**Commit:** `feat: comments, users admin and dashboard APIs`

---

## Phase 3 — Frontend
**3a. Foundation, login, layout**
> Build per docs/05 §8: `lib/api.ts` with `ApiError`, TanStack Query provider, `use-auth` hook (`/auth/me`), login page with React Hook Form + Zod, authenticated `(app)` layout with sidebar (Dashboard, Projects, Users for Admin, Profile) and header with user menu and logout, redirect to `/login` on 401. Show the sample credentials as a hint on the login page for demo.

**Commit:** `feat(ui): auth flow and app layout`

**3b. Projects and team**
> Build `/projects` (cards or table, search, status filter, pagination, "New project" dialog for Admin), `/projects/[id]` overview with Tabs (Overview, Tasks, Team) and actions driven by `permissions` (edit, archive/unarchive, delete with confirmation), and `/projects/[id]/team` (list members, add member via candidate search, change role, remove with confirmation). Show an "Archived (read-only)" banner. Handle API errors with toasts.

**Commit:** `feat(ui): projects and team management pages`

**3c. Tasks, conflict dialog, comments**
> Build `/projects/[id]/tasks` (table with status/priority badges, filters, search, pagination, create-task dialog for users with `canCreateTasks`, inline status change when `canChangeStatus`) and `/tasks/[id]` (edit form, assignee select limited to non-viewer members, delete, comments list and form). Implement the **ConflictDialog** exactly as in docs/05 §8: on `VERSION_CONFLICT` show "Your changes" vs "Latest", with "Load latest" and "Re-apply my changes". Disable or hide actions based on `permissions`.

**Done when:** open the same task in a normal and an incognito window as two users; save in one, save in the other → conflict dialog appears.
**Commit:** `feat(ui): tasks, comments and conflict resolution dialog`

**3d. Dashboard, users, profile**
> Build `/dashboard` (stat cards, tasks-by-status chart or bars, my open tasks, recent projects), `/users` for Admin (table, search, role/active filters, create/edit dialog, deactivate/activate), and `/profile` (edit name, change password). Non-admins visiting `/users` see a 403 page.

**Commit:** `feat(ui): dashboard, user management and profile`

---

## Phase 4 — Tests and hardening
> Write Vitest + Supertest tests per docs/07: policy unit tests (matrix), integration tests for the permission scenarios, version conflict, archived project, deactivated user. Then review: every route has `authenticate`, every project-scoped service calls the policy, no `passwordHash` leaks, error shapes are consistent.

**Commit:** `test: permissions, conflict detection and archived project rules`

---

## Phase 5 — README, architecture note, final push
> Write the root README.md and `docs/ARCHITECTURE_NOTE.md` per docs/07 §5–6, using the real commands and file paths from this repo. Then run the fresh-clone checklist.

**Commit:** `docs: readme and architecture note`
Then **push and verify on GitHub** that the latest commit is the final one (the latest commit is what is evaluated).
