# 01 — Product Requirements Document (PRD)

## 1. Overview
A multi-user collaborative project management platform. Admins create projects and assign Project Managers. Project Managers run their projects: team, tasks, assignments, status. Team Members work on their assigned tasks and comment. Viewers have read-only access.

**Time box:** 3 hours. **Runs locally only.** No deployment, no cloud database or BaaS.

## 2. Goals (in priority order)
1. Correct **server-side authorization** for all four roles.
2. Safe **concurrent task updates** (a stale update is rejected with 409, never silently overwritten).
3. Complete CRUD for users, projects, team members, tasks and comments.
4. Clean, explainable code with a reproducible setup (migrations, seed, README).
5. A usable, clear UI (polish comes last).

## 3. Non-goals
Deployment, email/notifications, file attachments, real-time websockets, SSO/OAuth, audit-log UI, drag-and-drop Kanban (optional stretch only).

## 4. Roles
| Role | Scope | Summary |
|---|---|---|
| Admin | Global | Manages users; creates/deletes projects; assigns project managers; sees all projects. Has implicit access to every project (is not stored as a project member). |
| Project Manager | Per project | Manages assigned projects: team, tasks, assignments, status, comments. |
| Team Member | Per project | Sees projects they belong to; updates **their own assigned** tasks; changes status of their tasks; comments. |
| Viewer | Per project | Read-only access to projects, tasks and comments they belong to. |

Two role layers exist:
- **Global role** on the user (`ADMIN | PROJECT_MANAGER | TEAM_MEMBER | VIEWER`): decides system-level capability and the maximum project role the user may hold.
- **Project role** on the membership (`PROJECT_MANAGER | TEAM_MEMBER | VIEWER`): decides what the user may do inside that project.

## 5. Functional requirements

### 5.1 Authentication
- FR-A1: Login with email and password; JWT is stored in an httpOnly cookie.
- FR-A2: Logout clears the cookie. `GET /auth/me` returns the current user.
- FR-A3: Deactivated users cannot log in, and their existing sessions stop working immediately.
- FR-A4: Users can update their name and change their password (`/profile`).

### 5.2 Users (Admin)
- FR-U1: Create, list (search, filter by role/status, paginated), view, update (name, email, role, password reset).
- FR-U2: Deactivate and re-activate users (soft delete; users are never hard-deleted).
- FR-U3: An Admin cannot deactivate or change the role of themselves.

### 5.3 Projects
- FR-P1: Admin creates a project (name, description, optional initial Project Manager).
- FR-P2: Admin deletes a project (hard delete, cascades members, tasks, comments).
- FR-P3: Admin or the project's PM updates name/description and archives/unarchives.
- FR-P4: Project list is scoped: Admin sees all, everyone else sees only projects they belong to. Supports search, status filter, pagination.
- FR-P5: Archived projects are read-only (see BR-6).

### 5.4 Team members
- FR-M1: Admin or PM lists, adds, removes members and changes a member's project role.
- FR-M2: Only Admin may grant, revoke or change the `PROJECT_MANAGER` project role (this is "assign project managers").
- FR-M3: PM picks users to add via a candidate search (active users not already in the project).

### 5.5 Tasks
- FR-T1: Admin/PM creates tasks: title, description, priority, status, assignee, due date.
- FR-T2: All project members and Admin can view tasks (filter by status, priority, assignee, text; sort; paginate).
- FR-T3: Admin/PM edits any field, assigns/reassigns, changes status, deletes.
- FR-T4: Team Member may edit only tasks **assigned to them**, and may not reassign or delete. Status change is allowed on own tasks.
- FR-T5: Every task has a `version`. Updates must send the version they were based on (see §7).
- FR-T6: A "My tasks" view lists tasks assigned to the current user across projects.

### 5.6 Comments
- FR-C1: Admin, PM and Team Member create comments on tasks. Everyone with access reads them.
- FR-C2: A comment can be deleted by its author, the project's PM, or Admin. Viewers cannot comment.

### 5.7 Dashboard
- FR-D1: Counts of accessible projects, tasks by status, overdue tasks, and "my open tasks".

## 6. Business rules
- **BR-1** Email is unique, case-insensitive (stored lowercase).
- **BR-2** Deactivated users are rejected on every request (the DB `isActive` flag is checked per request, not only at login).
- **BR-3** Admin cannot deactivate or demote themselves.
- **BR-4** Allowed project role by global role: `ADMIN` → not a member (implicit access, adding returns 400); `PROJECT_MANAGER` → any project role; `TEAM_MEMBER` → `TEAM_MEMBER` or `VIEWER`; `VIEWER` → `VIEWER` only.
- **BR-5** Only Admin may grant, revoke or change the `PROJECT_MANAGER` project role.
- **BR-6** Archived project: all writes (project fields, members, tasks, comments) are rejected with `409 PROJECT_ARCHIVED`. Reads and unarchive are allowed.
- **BR-7** A task assignee must be an **active** member of the project with role `PROJECT_MANAGER` or `TEAM_MEMBER` (not `VIEWER`).
- **BR-8** Removing a member unassigns their tasks in the same DB transaction. Their comments remain.
- **BR-9** `version` increments by 1 on every successful task update.
- **BR-10** Deleting a task deletes its comments. Deleting a project deletes everything under it.
- **BR-11** Team Member cannot create or delete tasks, cannot change `assigneeId`, and can only modify tasks assigned to them.
- **BR-12** Pagination: `page` default 1, `pageSize` default 20, max 100.

## 7. Concurrent update requirement
Example: task is at version 7. User A saves, server moves it to version 8. User B submits an update based on version 7. The server detects the mismatch and returns **HTTP 409** `VERSION_CONFLICT` with the latest task. The UI shows a conflict dialog that lets the user review the latest state and then either discard their edit or deliberately re-apply it on top of the latest version. No silent overwrite, ever.

## 8. Pages
| Route | Access | Purpose |
|---|---|---|
| `/login` | Public | Sign in |
| `/dashboard` | Auth | Stats, my open tasks, recent projects |
| `/projects` | Auth | Project list, search, status filter; Admin sees "New project" |
| `/projects/[id]` | Member/Admin | Overview and project actions (edit, archive, delete) |
| `/projects/[id]/tasks` | Member/Admin | Task list, filters, create task |
| `/projects/[id]/team` | Member/Admin | Members, add/remove, change role |
| `/tasks/[id]` | Member/Admin | Task detail, edit form, comments, conflict dialog |
| `/users` | Admin | User management |
| `/profile` | Auth | Edit name, change password |

UI must hide or disable actions the user cannot perform (using `permissions` returned by the API), but the server is the real gate.

## 9. Non-functional requirements
- Meaningful HTTP status codes, a consistent JSON error shape, clear UI error messages and toasts.
- Passwords hashed with bcrypt; httpOnly cookie; CORS restricted to the frontend origin; Helmet; basic login rate limit.
- Seed data for every role plus several projects and tasks.
- Schema reproducible from scratch: `migrate` + `seed`.
- Tests for permissions and conflict detection (time permitting).

## 10. Assumptions (document these in the architecture note)
- Team Members and Viewers can **view all tasks** in projects they belong to (needed for collaboration), but a Team Member can only **modify** tasks assigned to them.
- Project Managers can comment and can archive/unarchive their projects, but cannot create or delete projects.
- Authorization failures return `403` (not `404`) so behavior is explicit and testable.
- Task statuses: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`. Priorities: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.

## 11. Acceptance criteria (definition of done)
- [ ] Fresh clone + README steps → app runs locally with seeded logins for all 4 roles.
- [ ] A Team Member calling a forbidden endpoint directly (e.g. `DELETE /tasks/:id`) gets `403`.
- [ ] A non-member requesting another project gets `403`.
- [ ] Two stale edits on one task: the second gets `409` and the UI shows the conflict dialog.
- [ ] Deactivated user cannot log in and an existing session is rejected.
- [ ] Archived project rejects writes with `409 PROJECT_ARCHIVED`.
- [ ] Latest commit on GitHub contains everything and runs.
