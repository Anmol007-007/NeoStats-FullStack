# 04 — API Specification

Base URL: `http://localhost:4000/api/v1`. JSON in, JSON out. Auth via httpOnly cookie `token` (the frontend sends `credentials: 'include'`). IDs are UUIDs. Dates are ISO strings (`dueDate` is `YYYY-MM-DD`).

## 1. Conventions

### Success shapes
- Single resource: `{ "data": { ... } }`
- List: `{ "data": [ ... ], "meta": { "page": 1, "pageSize": 20, "total": 57, "totalPages": 3 } }`
- No content: `204` with empty body.

### Error shape (always)
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request", "details": { "fieldErrors": { "title": ["Required"] } } } }
```

### Status codes and codes
| Status | `error.code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod validation failed |
| 400 | `INVALID_ASSIGNEE`, `INVALID_MEMBER`, `INVALID_ROLE` | Business-rule violations |
| 401 | `UNAUTHENTICATED`, `INVALID_CREDENTIALS` | Missing/invalid token; bad login |
| 403 | `FORBIDDEN` | Authenticated but not allowed |
| 403 | `ACCOUNT_DEACTIVATED` | Deactivated user |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `VERSION_CONFLICT` | Stale task update. `details.currentTask` holds the latest task |
| 409 | `PROJECT_ARCHIVED` | Write attempted on an archived project |
| 409 | `EMAIL_TAKEN`, `ALREADY_MEMBER` | Uniqueness conflicts |
| 429 | `RATE_LIMITED` | Too many login attempts |
| 500 | `INTERNAL_ERROR` | Unexpected; never leak stack traces |

### Pagination, filtering, sorting
`?page=1&pageSize=20` (max 100). `?sort=createdAt&order=desc` where supported. Text search param is `q` (case-insensitive contains).

## 2. Object shapes

**User** `{ id, name, email, role, isActive, createdAt }` (never `passwordHash`).

**Project (list item)** `{ id, name, description, status, memberCount, taskCount, myRole, createdAt, updatedAt }`.
**Project (detail)** = list item + `permissions: { canEdit, canArchive, canDelete, canManageMembers, canManageProjectManagers, canCreateTasks, canComment }`.
`myRole` is `ADMIN | PROJECT_MANAGER | TEAM_MEMBER | VIEWER`.

**Member** `{ userId, name, email, globalRole, role, addedAt }`.

**Task** `{ id, projectId, title, description, status, priority, dueDate, version, assignee: {id,name,email} | null, createdBy: {id,name}, createdAt, updatedAt, permissions: { canEdit, canChangeStatus, canAssign, canDelete } }`.

**Comment** `{ id, taskId, body, author: {id,name}, createdAt, canDelete }`.

## 3. Endpoints

### Health
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | none | `{ "status": "ok" }` |

### Auth
| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/auth/login` | none (rate limited) | `{ email, password }` | `200 { data: User }` + sets cookie. `401 INVALID_CREDENTIALS` (generic message), `403 ACCOUNT_DEACTIVATED` (only after a correct password) |
| POST | `/auth/logout` | any | — | `204`, cookie cleared |
| GET | `/auth/me` | any | — | `200 { data: User }` |
| PATCH | `/auth/me` | any | `{ name }` | `200 { data: User }` |
| POST | `/auth/change-password` | any | `{ currentPassword, newPassword }` (min 8 chars) | `204`; `400` if current password is wrong |

### Users (Admin only)
| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/users` | `page,pageSize,q,role,isActive` | `200` list of User |
| POST | `/users` | `{ name, email, password, role }` | `201 User`; `409 EMAIL_TAKEN` |
| GET | `/users/:id` | — | `200 User` |
| PATCH | `/users/:id` | `{ name?, email?, role?, password? }` | `200 User`; `403` if Admin edits own role (BR-3) |
| POST | `/users/:id/deactivate` | — | `200 User`; `403` if self (BR-3) |
| POST | `/users/:id/activate` | — | `200 User` |

### Projects
| Method | Path | Roles | Body / Query | Response |
|---|---|---|---|---|
| GET | `/projects` | any auth (scoped) | `page,pageSize,q,status` | `200` list of Project (list item) |
| POST | `/projects` | Admin | `{ name, description?, projectManagerId? }` | `201 Project`; initial PM is added as `PROJECT_MANAGER` member (must have global role `PROJECT_MANAGER`) |
| GET | `/projects/:id` | member/Admin | — | `200 Project (detail)` |
| PATCH | `/projects/:id` | Admin, PM | `{ name?, description? }` | `200 Project` |
| POST | `/projects/:id/archive` | Admin, PM | — | `200 Project` |
| POST | `/projects/:id/unarchive` | Admin, PM | — | `200 Project` |
| DELETE | `/projects/:id` | Admin | — | `204` |

### Team members
| Method | Path | Roles | Body / Query | Response |
|---|---|---|---|---|
| GET | `/projects/:id/members` | member/Admin | — | `200 { data: Member[] }` |
| GET | `/projects/:id/member-candidates` | Admin, PM | `q` | `200 { data: User[] }` (max 10, active, non-admin, not already members) |
| POST | `/projects/:id/members` | Admin, PM* | `{ userId, role }` | `201 Member`; `409 ALREADY_MEMBER`; `400 INVALID_MEMBER` |
| PATCH | `/projects/:id/members/:userId` | Admin, PM* | `{ role }` | `200 Member` |
| DELETE | `/projects/:id/members/:userId` | Admin, PM* | — | `204`; unassigns that member's tasks |

\* A PM cannot grant/revoke/change `PROJECT_MANAGER`; only Admin can (BR-5).

### Tasks
| Method | Path | Roles | Body / Query | Response |
|---|---|---|---|---|
| GET | `/projects/:id/tasks` | member/Admin | `page,pageSize,q,status,priority,assigneeId,sort(createdAt\|dueDate\|priority\|updatedAt),order` | `200` list of Task |
| POST | `/projects/:id/tasks` | Admin, PM | `{ title, description?, status?, priority?, assigneeId?, dueDate? }` | `201 Task` (version = 1) |
| GET | `/tasks` | any auth (scoped) | `assignee=me,status,page,pageSize` | `200` list of Task across accessible projects (for dashboard / "My tasks") |
| GET | `/tasks/:id` | member/Admin | — | `200 Task` |
| PATCH | `/tasks/:id` | see `03_PERMISSIONS.md` §4 | `{ version (required int), title?, description?, status?, priority?, assigneeId? (null to unassign), dueDate? }` | `200 Task` with `version + 1`; `409 VERSION_CONFLICT` if stale |
| DELETE | `/tasks/:id` | Admin, PM | — | `204` |

**Conflict response example**
```http
HTTP/1.1 409 Conflict
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "This task was modified by someone else. Review the latest version.",
    "details": { "currentTask": { "id": "…", "title": "…", "status": "DONE", "version": 8, "…": "…" } }
  }
}
```

### Comments
| Method | Path | Roles | Body / Query | Response |
|---|---|---|---|---|
| GET | `/tasks/:id/comments` | member/Admin | `page,pageSize` (oldest first) | `200` list of Comment |
| POST | `/tasks/:id/comments` | Admin, PM, TM | `{ body }` (1–2000 chars) | `201 Comment` |
| DELETE | `/comments/:id` | author, PM, Admin (per matrix) | — | `204` |

### Dashboard
| Method | Path | Response |
|---|---|---|
| GET | `/dashboard` | `{ data: { projectCount, tasksByStatus: {TODO,IN_PROGRESS,IN_REVIEW,DONE}, overdueCount, myOpenTasks: Task[] (max 5), recentProjects: Project[] (max 5) } }` — scoped to what the user can access |

## 4. Validation rules (Zod)
- `email`: valid email, trimmed, lowercased. `password`: min 8 chars. `name`: 1–100 chars.
- Project `name`: 1–120 chars. `description`: max 2000.
- Task `title`: 1–200 chars. `description`: max 5000. `dueDate`: `YYYY-MM-DD`. `version`: positive integer.
- `status`, `priority`, `role` must be valid enum values. Unknown keys are rejected (`.strict()`).
- Path ids must be UUIDs; an invalid UUID returns `400 VALIDATION_ERROR` (not a 500).
