# 05 — Architecture

## 1. System overview
```
Browser ──► Next.js (localhost:3000) ──fetch + cookie──► Express API (localhost:4000/api/v1) ──Prisma──► PostgreSQL (localhost:5432, db pm_platform)
```
Two separate processes. The Express API owns business logic, authorization and data access. Next.js only renders UI and calls the API.

## 2. Repository layout
```
pm-platform/
├─ AGENTS.md
├─ README.md
├─ docs/                      # these documents + DECISIONS.md
├─ backend/
│  ├─ .env.example
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ prisma/
│  │  ├─ schema.prisma
│  │  ├─ migrations/
│  │  └─ seed.ts
│  └─ src/
│     ├─ server.ts            # starts the HTTP server
│     ├─ app.ts               # builds the Express app (exported for tests)
│     ├─ config/env.ts        # Zod-validated environment variables
│     ├─ lib/
│     │  ├─ prisma.ts         # single PrismaClient
│     │  ├─ errors.ts         # AppError + NotFound/Forbidden/Conflict/Validation helpers
│     │  ├─ jwt.ts            # sign/verify, cookie options
│     │  └─ pagination.ts     # parse page/pageSize, build meta
│     ├─ middleware/
│     │  ├─ authenticate.ts   # reads cookie, loads user from DB, checks isActive
│     │  ├─ requireGlobalRole.ts
│     │  ├─ validate.ts       # Zod validation for body/query/params
│     │  ├─ rateLimit.ts      # login limiter
│     │  └─ errorHandler.ts   # maps errors to the standard JSON shape
│     ├─ permissions/
│     │  ├─ policy.ts         # pure permission functions (03_PERMISSIONS.md)
│     │  └─ context.ts        # getProjectContext(...)
│     ├─ modules/
│     │  ├─ auth/      (routes, controller, service, schemas)
│     │  ├─ users/
│     │  ├─ projects/
│     │  ├─ members/
│     │  ├─ tasks/
│     │  ├─ comments/
│     │  └─ dashboard/
│     └─ routes.ts            # mounts all module routers under /api/v1
│  └─ tests/                  # Vitest + Supertest
└─ frontend/
   ├─ .env.example
   └─ src/
      ├─ app/
      │  ├─ login/page.tsx
      │  └─ (app)/                      # authenticated layout with sidebar + header
      │     ├─ layout.tsx
      │     ├─ dashboard/page.tsx
      │     ├─ projects/page.tsx
      │     ├─ projects/[id]/page.tsx
      │     ├─ projects/[id]/tasks/page.tsx
      │     ├─ projects/[id]/team/page.tsx
      │     ├─ tasks/[id]/page.tsx
      │     ├─ users/page.tsx
      │     └─ profile/page.tsx
      ├─ components/ (ui/ from shadcn, plus feature components)
      ├─ lib/ (api.ts, query-client.ts, utils.ts)
      ├─ hooks/ (use-auth.ts, use-projects.ts, use-tasks.ts, …)
      └─ types/ (api.ts)
```
Pattern inside each backend module: `routes.ts` (paths + middleware) → `controller.ts` (HTTP in/out) → `service.ts` (business rules, DB, policy calls) → `schemas.ts` (Zod).

## 3. Environment variables
`backend/.env.example`
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/pm_platform"
JWT_SECRET="change-me-to-a-long-random-string"
JWT_EXPIRES_IN="8h"
PORT=4000
CORS_ORIGIN="http://localhost:3000"
NODE_ENV="development"
```
`frontend/.env.example`
```
NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"
```

## 4. Authentication flow
1. `POST /auth/login`: find user by lowercased email, compare with `bcryptjs`, check `isActive`, sign a JWT `{ sub: userId }` and set cookie `token` with `httpOnly: true`, `sameSite: 'lax'`, `secure: NODE_ENV === 'production'`, `maxAge` matching expiry.
2. `authenticate` middleware: read `req.cookies.token`, verify JWT, **load the user from the DB**, reject if missing or `isActive === false`, attach `req.user = { id, role, name, email }`. Doing the DB lookup per request is what makes deactivation take effect immediately (BR-2).
3. Frontend calls `GET /auth/me` on load; a 401 redirects to `/login`.
4. **CORS:** `cors({ origin: CORS_ORIGIN, credentials: true })`. Cookies are scoped by host, not port, so a cookie set by `localhost:4000` is sent on `fetch('http://localhost:4000', { credentials: 'include' })` calls from `localhost:3000`.
5. **CSRF:** `SameSite=Lax` + JSON-only bodies + a locked CORS origin is sufficient for this scope. Mention it in the architecture note.

## 5. Backend request pipeline
```
helmet → cors → express.json → cookieParser → routes
  /auth/login: rateLimit → validate → controller
  everything else: authenticate → [requireGlobalRole] → validate → controller → service (load → policy → archived check → logic)
errorHandler (last)
```
- `AppError(status, code, message, details?)` is the only thing services throw on purpose. `errorHandler` converts `AppError`, Zod errors and unknown errors (`500 INTERNAL_ERROR`, logged server-side only) to the standard error shape. Express 5 forwards rejected async handlers automatically.
- Prisma unique violation `P2002` on email → `409 EMAIL_TAKEN`.

## 6. Concurrent updates (optimistic locking)
The `version` column is the lock. The check and the write are one atomic SQL statement, so two simultaneous requests cannot both succeed.

```ts
// tasks.service.ts (simplified)
export async function updateTask(actor, taskId, input) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw notFound('Task');

  const { project, role } = await getProjectContext(actor, task.projectId);
  assertProjectWritable(project);                 // 409 PROJECT_ARCHIVED
  assertFieldPermissions(role, actor.id, task, input); // 403 per 03_PERMISSIONS.md §4
  if (input.assigneeId) await assertValidAssignee(task.projectId, input.assigneeId);

  const { version, ...fields } = input;
  const result = await prisma.task.updateMany({
    where: { id: taskId, version },               // only matches if client is up to date
    data: { ...fields, version: { increment: 1 }, updatedAt: new Date() },
  });

  if (result.count === 0) {                       // someone else changed it first
    const current = await loadTaskWithRelations(taskId);
    if (!current) throw notFound('Task');         // deleted meanwhile
    throw conflict('VERSION_CONFLICT',
      'This task was modified by someone else. Review the latest version.',
      { currentTask: toTaskDto(current, role, actor) });
  }
  return toTaskDto(await loadTaskWithRelations(taskId), role, actor);
}
```
Explainable version: "`UPDATE tasks SET …, version = version + 1 WHERE id = ? AND version = ?`; zero rows updated means someone beat me, so I return 409 with the latest row."

Other transactional spots: removing a member (delete membership + unassign tasks), creating a project with an initial PM (project + membership), and deleting a project (cascade).

## 7. DTO mapping
Services return DTOs built by small mapper functions (`toUserDto`, `toProjectDto`, `toTaskDto`, `toCommentDto`). They strip `passwordHash` and compute the `permissions` / `canDelete` flags by calling `policy.ts`, so the UI mirrors server rules without duplicating them.

## 8. Frontend design

### API client (`lib/api.ts`)
- `fetch` wrapper: base URL from env, `credentials: 'include'`, JSON headers.
- Throws `ApiError { status, code, message, details }` parsed from the standard error shape.
- Global handling: `401` → redirect to `/login`.

### Data layer
TanStack Query. Keys: `['me']`, `['projects', filters]`, `['project', id]`, `['members', projectId]`, `['tasks', projectId, filters]`, `['task', id]`, `['comments', taskId]`, `['users', filters]`, `['dashboard']`. Mutations invalidate the affected keys.

### Permission-aware UI
Use the `permissions` objects and `myRole` returned by the API to hide or disable buttons (e.g. no "New task" for a Viewer). This is a UX nicety only; the server enforces everything.

### Conflict UX (required)
Task detail page keeps the `version` it loaded. On submit:
- Success → toast, update cache with the returned task (new version).
- `409 VERSION_CONFLICT` → open a **ConflictDialog**:
  - Title: "This task was updated by someone else".
  - Side-by-side list of fields that differ: *Your changes* vs *Latest on server* (use `error.details.currentTask`).
  - Buttons: **"Load latest"** (discard my edits, reset the form with latest data and version) and **"Re-apply my changes"** (reset base version to the latest, re-submit my edited fields; the user makes this choice explicitly, so it is never silent).
- Quick status change in the task list: on 409, toast "Task changed, refreshed", and refetch.
- `PROJECT_ARCHIVED` → toast and show an "Archived (read-only)" banner.

### UI building blocks
shadcn/ui: Button, Input, Textarea, Select, Dialog, AlertDialog, DropdownMenu, Table, Badge, Card, Tabs, Toast (sonner), Skeleton, Form. Status and priority shown as colored badges. Project pages use Tabs: Overview, Tasks, Team (each a real route).

## 9. Security checklist
- [ ] bcrypt hashing, min password length 8, generic login error
- [ ] httpOnly + SameSite cookie, JWT expiry, per-request DB user check
- [ ] Policy checks on every project-scoped route, ids resolved from the DB, not from the client
- [ ] Zod validation with `.strict()`; invalid UUIDs return 400
- [ ] Prisma parameterized queries (no string-built SQL)
- [ ] Helmet, CORS restricted, login rate limit
- [ ] No `passwordHash` or stack traces in responses
- [ ] `.env` ignored, `.env.example` committed
