# TaskFlow — Unified Project Specification & Verification Contract for TestSprite

> **Single Source of Truth:** This single consolidated specification document defines the full product architecture, data schemas, API contracts, RBAC permissions, optimistic concurrency rules, and end-to-end verification workflows for automated testing via **TestSprite**.

---

## 1. Project Overview & Core Requirements

**TaskFlow** is a full-stack collaborative project management platform (mini-Jira) built for teams to manage projects, assign tasks, collaborate through threaded comments, and visualize progress.

### Primary Objectives & Requirements
1. **Server-Enforced Role-Based Access Control (RBAC):** Strictly enforced across 4 roles: `ADMIN`, `PROJECT_MANAGER`, `TEAM_MEMBER`, and `VIEWER`. Hiding UI buttons is never the sole protection; all mutations and project scopes are authorized by backend policies.
2. **Optimistic Concurrency Control:** Prevent silent data overwrites during concurrent task updates using atomic version increments. Stale updates return `HTTP 409 VERSION_CONFLICT` with the latest task state for side-by-side resolution.
3. **Real-Time Account Revocation:** If an administrator deactivates a user, active JWT sessions are immediately rejected on the next request with `HTTP 403 ACCOUNT_DEACTIVATED`.
4. **Archival Immutability & Cascading Invariants:** Archived projects reject all mutations with `HTTP 409 PROJECT_ARCHIVED`. Removing a project member automatically unassigns their tasks. Deleting a task or project cascades cleanly.

---

## 2. System Architecture & Environments

| Component | Target URL | Tech Stack | Notes |
|---|---|---|---|
| **Frontend Web App** | `http://localhost:3000` | Next.js 16 (App Router), Tailwind CSS, TanStack Query | Client UI with interactive Kanban, Task views, and Conflict Dialogs |
| **Backend API Gateway** | `http://localhost:4000/api/v1` | Express 5, Node.js 22+, TypeScript, Zod | Central RBAC policy, atomic queries, standard JSON envelope |
| **Database** | MongoDB Atlas (`pm_platform` DB) | Mongoose ODM | Cloud Atlas persistence |
| **Health Check** | `GET http://localhost:4000/health` | Public HTTP GET probe | Returns `200 {"status":"ok"}` without auth |

### Uniform Error Response Format
Every non-2xx API error returns this uniform JSON payload:
```json
{
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable explanation of error",
    "details": {}
  }
}
```

---

## 3. Test Personas & Seed Credentials

Pre-seeded idempotent test accounts:

| Persona | Role | Email | Password | Global Scope & Limitations |
|---|---|---|---|---|
| **Alice Admin** | `ADMIN` | `admin@example.com` | `Admin@123` | System admin. Manages users, creates/deletes any project. Cannot deactivate or demote self. |
| **Priya Manager** | `PROJECT_MANAGER` | `pm1@example.com` | `Password@123` | PM of *Website Redesign* & *Legacy Migration*. Can manage tasks and team. Cannot access *Mobile App Launch*. |
| **Paul Manager** | `PROJECT_MANAGER` | `pm2@example.com` | `Password@123` | PM of *Mobile App Launch*. Isolated from other projects. |
| **Maya Member** | `TEAM_MEMBER` | `member1@example.com` | `Password@123` | Member on *Website Redesign* & *Mobile App Launch*. Can edit only tasks assigned to her. Cannot delete or reassign. |
| **Mike Member** | `TEAM_MEMBER` | `member2@example.com` | `Password@123` | Member on *Website Redesign*. Cannot view *Mobile App Launch*. |
| **Vera Viewer** | `VIEWER` | `viewer@example.com` | `Password@123` | Read-only across assigned projects. Cannot create or edit tasks or post comments. |
| **Ian Inactive** | `TEAM_MEMBER` | `inactive@example.com` | `Password@123` | Soft-deleted (`isActive: false`). Login rejected immediately with `403 ACCOUNT_DEACTIVATED`. |

---

## 4. Role-Based Access Control (RBAC) Matrix

| Action / Capability | ADMIN | PROJECT_MANAGER | TEAM_MEMBER | VIEWER |
|---|---|---|---|---|
| **Manage Users** (create, edit, deactivate) | ✅ Allowed | ❌ 403 Forbidden | ❌ 403 Forbidden | ❌ 403 Forbidden |
| **Create Project** | ✅ Allowed | ❌ 403 Forbidden | ❌ 403 Forbidden | ❌ 403 Forbidden |
| **Delete Project** | ✅ Allowed | ❌ 403 Forbidden | ❌ 403 Forbidden | ❌ 403 Forbidden |
| **View Project / Tasks** | ✅ All projects | ✅ Assigned projects | ✅ Assigned projects | ✅ Assigned projects |
| **Edit Project / Archive** | ✅ Allowed | ✅ If project PM | ❌ 403 Forbidden | ❌ 403 Forbidden |
| **Add / Remove Members** | ✅ Allowed | ✅ If project PM (cannot assign PM) | ❌ 403 Forbidden | ❌ 403 Forbidden |
| **Create Tasks** | ✅ Allowed | ✅ If project PM | ❌ 403 Forbidden | ❌ 403 Forbidden |
| **Edit Task Content / Status** | ✅ Allowed | ✅ If project PM | ✅ **Only if assigned to self** | ❌ 403 Forbidden |
| **Reassign / Delete Tasks** | ✅ Allowed | ✅ If project PM | ❌ 403 Forbidden | ❌ 403 Forbidden |
| **Post Comments** | ✅ Allowed | ✅ If project member | ✅ If project member | ❌ 403 Forbidden |
| **Delete Comments** | ✅ Allowed | ✅ If project PM | ✅ **Author only** | ❌ 403 Forbidden |

---

## 5. Core Invariants & Business Logic

- **BR-1 (Real-Time Revocation):** User `isActive` is verified on every request. Deactivated users receive `403 ACCOUNT_DEACTIVATED` immediately.
- **BR-2 (Optimistic Concurrency):** Tasks maintain an integer `version` (starts at 1). `PATCH /api/v1/tasks/:id` requires current `version`. Mismatched versions return `409 VERSION_CONFLICT` with the latest task in `details.currentTask`.
- **BR-3 (Archived Immutability):** In an archived project (`status: ARCHIVED`), write actions return `409 PROJECT_ARCHIVED`. Unarchive and reads are permitted.
- **BR-4 (Member Cascade):** Removing a project member automatically unassigns their tasks (`assigneeId = null`).
- **BR-5 (Cascade Deletes):** Deleting a task deletes comments. Deleting a project cascades to members, tasks, and comments.
- **BR-6 (Admin Self-Protection):** Admin cannot deactivate self or demote self (`403 FORBIDDEN`).
- **BR-7 (Assignee Validity):** Task assignees must be active project members with role `PROJECT_MANAGER` or `TEAM_MEMBER` (never `VIEWER`).

---

## 6. Complete API REST Contract

### 6.1 Authentication (`/api/v1/auth`)
- `POST /auth/login`
  - Body: `{ "email": "admin@example.com", "password": "Admin@123" }`
  - Success: `200 OK`, sets `token` httpOnly cookie, returns `{ "data": User }`
  - Errors: `401 INVALID_CREDENTIALS`, `403 ACCOUNT_DEACTIVATED`, `400 VALIDATION_ERROR`
- `POST /auth/signup` (alias `/auth/register`)
  - Body: `{ "name": "Jane Doe", "email": "jane@example.com", "password": "Password@123", "role?": "TEAM_MEMBER" }`
  - Success: `201 Created`, creates MongoDB record, sets `token` httpOnly cookie, returns `{ "data": User }`
  - Errors: `409 EMAIL_TAKEN`, `400 VALIDATION_ERROR`
- `POST /auth/logout`
  - Auth: Yes | Success: `204 No Content`, clears cookie
- `GET /auth/me`
  - Auth: Yes | Success: `200 { "data": User }`
- `POST /auth/change-password`
  - Auth: Yes | Body: `{ "currentPassword", "newPassword" }` | Success: `204 No Content`

### 6.2 Users (`/api/v1/users`) — Admin Only
- `GET /users`: List users with `?page=1&pageSize=20&q=&role=&isActive=`
- `POST /users`: Create user `{ "name", "email", "password", "role" }` → `201 Created` or `409 EMAIL_TAKEN`
- `PATCH /users/:id`: Edit user details / role
- `POST /users/:id/deactivate`: Deactivate user (Admin cannot deactivate self)
- `POST /users/:id/activate`: Reactivate user

### 6.3 Projects (`/api/v1/projects`)
- `GET /projects`: List accessible projects (`?page=&pageSize=&q=&status=`)
- `POST /projects`: Admin creates project `{ "name", "description?", "projectManagerId?" }`
- `GET /projects/:id`: Get project details and metrics
- `PATCH /projects/:id`: Update name/description (Admin or PM)
- `POST /projects/:id/archive`: Archive project (Admin or PM)
- `POST /projects/:id/unarchive`: Unarchive project (Admin or PM)
- `DELETE /projects/:id`: Admin deletes project and cascades all data

### 6.4 Project Members (`/api/v1/projects/:id/members`)
- `GET /projects/:id/members`: List project roster
- `GET /projects/:id/member-candidates`: Search active users available to add
- `POST /projects/:id/members`: Add member `{ "userId", "role" }` (PM cannot add another PM)
- `PATCH /projects/:id/members/:userId`: Change project role
- `DELETE /projects/:id/members/:userId`: Remove member and unassign their tasks

### 6.5 Tasks & Concurrency (`/api/v1/tasks` & `/api/v1/projects/:id/tasks`)
- `GET /projects/:id/tasks`: List tasks with filters (`status`, `priority`, `assigneeId`, `q`, `sort`, `order`)
- `POST /projects/:id/tasks`: Create task `{ "title", "description?", "status?", "priority?", "assigneeId?", "dueDate?" }` (starts at version 1)
- `GET /tasks/:id`: Get task details with permission flags (`canEdit`, `canChangeStatus`, `canAssign`, `canDelete`)
- `PATCH /tasks/:id`: Update task `{ "version": 1, "title?", "status?", "priority?", "assigneeId?", "dueDate?" }`
  - Success: `200 { "data": Task }` with `version: 2`
  - Stale Write: **`409 VERSION_CONFLICT`** with `details.currentTask`
- `DELETE /tasks/:id`: Delete task and cascade comments

### 6.6 Comments (`/api/v1/tasks/:id/comments` & `/api/v1/comments/:id`)
- `GET /tasks/:id/comments`: List task comments
- `POST /tasks/:id/comments`: Add comment `{ "body": "text" }` (Viewer receives `403`)
- `DELETE /comments/:id`: Delete comment (Author, PM, or Admin)

### 6.7 Dashboard Analytics (`/api/v1/dashboard`)
- `GET /dashboard`: Aggregated metrics (`projectCount`, `tasksByStatus`, `overdueCount`, `myOpenTasks`, `recentProjects`)

---

## 7. Step-by-Step E2E Test Flows for TestSprite

### Flow 1: Authentication & Dashboard Verification
1. Open `http://localhost:3000/login`
2. Click preset badge "Alice Admin" and submit "Sign in"
3. Verify redirection to `http://localhost:3000/dashboard`
4. Verify user avatar shows "Alice Admin" and role "ADMIN"
5. Verify summary metric cards appear for Projects, Tasks, and Overdue items

### Flow 2: Project & Team Setup
1. From dashboard, click "New Project"
2. Input Name: "Enterprise Cloud Security", select PM: "Priya Manager", and submit
3. Verify toast notification "Project created successfully!" and project appears in list
4. Open the project, click the "Team" tab
5. Click "Add Member", select "Maya Member", set role "Team Member", and submit
6. Verify Maya Member is displayed in the team roster

### Flow 3: Task Workflow & Concurrency Conflict (409) Handling
1. In the project, switch to the "Tasks" tab and click "Create Task"
2. Fill Title: "Infrastructure Vulnerability Scan", Priority: "HIGH", and submit
3. Click on the created task to open its detail view
4. Click "Simulate 409 Conflict (Demo)" button
5. Verify the **Version Conflict Detected** modal opens with side-by-side comparison
6. Click "Load Latest Version"
7. Verify the modal closes and the task form reloads with the updated version

### Flow 4: Real-Time User Deactivation
1. Navigate to `http://localhost:3000/users` as Alice Admin
2. Find "Mike Member" in the user list and click "Deactivate"
3. Verify the status badge updates to "Inactive"
4. Open a private session and attempt to log in as `member2@example.com`
5. Verify login fails with message "Your account has been deactivated. Please contact an administrator."
