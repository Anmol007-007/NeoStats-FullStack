# TaskFlow — Collaborative Project Management Platform

A multi-user collaborative project management platform (mini-Jira) built for rapid teamwork, featuring granular server-side role-based authorization (RBAC) and optimistic concurrency control with conflict resolution.

---

## 🚀 Key Features

- **Four-Tier Role-Based Access Control (RBAC):**
  - **Admin**: System-wide user management, workspace project lifecycle, global visibility.
  - **Project Manager**: Project execution, team roster management, task creation/delegation.
  - **Team Member**: Collaborative workspace access, personal task management, status progression, discussions.
  - **Viewer**: Read-only oversight across accessible projects.
- **Optimistic Concurrency Control (Version Locking):**
  - Stale task updates are safely rejected with `409 VERSION_CONFLICT` instead of silently overwriting.
  - Interactive **Conflict Dialog** provides side-by-side difference comparison (*Your Draft* vs *Server Latest*) with explicit options to *"Load Latest"* or *"Re-apply Changes"*.
- **Permission-Aware Responsive UI:**
  - Modern, accessible design system tailored with Tailwind CSS and Lucide icons.
  - Real-time toast notifications, status pills, and evaluator quick-access presets.

---

## 📁 Repository Layout

```text
├── backend/            # Express 5, TypeScript, Prisma, Zod, JWT & bcryptjs
├── frontend/           # Next.js App Router, TypeScript, Tailwind CSS, TanStack Query
├── docs/               # Product Requirements, Architecture, Data Model, API Specs
│   ├── 01_PRD.md
│   ├── 02_DATA_MODEL.md
│   ├── 04_API_SPEC.md
│   ├── 05_ARCHITECTURE.md
│   ├── 06_IMPLEMENTATION_PLAN.md
│   └── 07_TEST_AND_SUBMISSION.md
├── AGENTS.md           # Engineering principles & coding standards
└── README.md           # Getting started guide
```

---

## ⚡ Quick Start (Frontend Prototype)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install --legacy-peer-deps
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```

4. Open your browser to [http://localhost:3000](http://localhost:3000).

---

## 👥 Evaluator Seed Profiles

Use the 1-click preset cards on `/login` to test each role:

| Name | Role | Email | Password |
|---|---|---|---|
| Alice Admin | `ADMIN` | `admin@example.com` | `Admin@123` |
| Priya Manager | `PROJECT_MANAGER` | `pm1@example.com` | `Password@123` |
| Maya Member | `TEAM_MEMBER` | `member1@example.com` | `Password@123` |
| Vera Viewer | `VIEWER` | `viewer@example.com` | `Password@123` |
