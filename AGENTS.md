# AGENTS.md — Rules for the AI coding assistant

> Copy this file to the **repo root**. For Cursor also save it as `.cursorrules`; for Copilot as `.github/copilot-instructions.md`.

## Project
Collaborative Project Management Platform (mini-Jira) for a 3-hour full stack hackathon.
Roles: Admin, Project Manager, Team Member, Viewer. Entities: users, projects, project members, tasks, comments.

## Read these first (in order)
1. `docs/01_PRD.md` — what to build and the business rules
2. `docs/02_DATA_MODEL.md` — schema, Prisma models, seed data
3. `docs/03_PERMISSIONS.md` — who may do what (**source of truth for authorization**)
4. `docs/04_API_SPEC.md` — endpoints, request/response shapes, errors
5. `docs/05_ARCHITECTURE.md` — folder structure, auth flow, concurrency, frontend design
6. `docs/06_IMPLEMENTATION_PLAN.md` — phased build with acceptance criteria
7. `docs/07_TEST_AND_SUBMISSION.md` — tests and submission checklist

If documents conflict, precedence is: 03 > 04 > 02 > 01. If something is ambiguous, pick the simplest option, note it in `docs/DECISIONS.md`, and keep going.

## Hard rules (these are what the project is graded on)
1. **Authorization is enforced on the server.** Every route except `/auth/login` and `/health` requires authentication. Every project-scoped route goes through the central policy module (`src/permissions/policy.ts`). Never trust role, userId or projectId sent by the client for authorization decisions. Hiding a button in the UI is never the only protection.
2. **Concurrent task updates use optimistic locking** with the `version` column. A stale update returns `409 VERSION_CONFLICT` and includes the latest task in the response. Never silently overwrite.
3. **Validate all input with Zod** (body, query, params) in a `validate` middleware.
4. **One error format** everywhere: `{ "error": { "code", "message", "details?" } }`. Use the status codes in `docs/04_API_SPEC.md`.
5. **Prisma migrations only** (`prisma migrate dev`), never `db push`. Provide an idempotent seed script.
6. **No secrets in Git.** Keep `.env` ignored and commit `.env.example` for backend and frontend.
7. **Never return `passwordHash`** in any response or log.
8. **Keep the code simple and explainable.** The developer must be able to explain every line to evaluators. Prefer plain functions and clear names over clever abstractions. Add a short comment wherever a decision is non-obvious (why, not what).
9. **Stay in scope.** Build only what the PRD lists. No cloud services (Firebase, Supabase, hosted DBs). Local PostgreSQL only.
10. **Commit after every working step** with a clear conventional message (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).

## Pinned stack and conventions
- **Backend:** Node 22+, Express 5, TypeScript, Prisma 6 (pin `prisma@6` and `@prisma/client@6`), Zod, `jsonwebtoken`, `bcryptjs` (pure JS, no native build on Windows), `cookie-parser`, `cors`, `helmet`, `tsx` for dev, Vitest + Supertest for tests.
- **Frontend:** Next.js App Router, TypeScript, Tailwind, shadcn/ui, TanStack Query, React Hook Form + Zod, lucide-react. Use whatever versions `create-next-app@latest` installs; do not downgrade.
- **DB:** PostgreSQL 16 (native Windows install), database `pm_platform`.
- **Ports:** backend `4000`, frontend `3000`. API base path `/api/v1`.
- **Windows/PowerShell friendly:** no bash-only npm scripts, no `rm -rf`, use cross-platform commands.
- Repo layout: `/backend`, `/frontend`, `/docs`, root `README.md`.

## Workflow for every task
1. State which doc section you are implementing.
2. Implement it.
3. Run `npm run typecheck`, `npm run lint` (if configured) and tests.
4. Summarize what you built plus **the key decisions the developer must be able to explain**.
5. Suggest the commit message.
