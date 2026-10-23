import {
  Comment,
  DashboardData,
  GlobalRole,
  Member,
  ProjectDetail,
  ProjectListItem,
  ProjectRole,
  ProjectStatus,
  Task,
  TaskPriority,
  TaskStatus,
  User,
} from './types';

// Initial Seed Users
export const INITIAL_USERS: User[] = [
  {
    id: 'u-admin-1',
    name: 'Alice Admin',
    email: 'admin@example.com',
    role: 'ADMIN',
    isActive: true,
    createdAt: '2026-10-01T09:00:00Z',
  },
  {
    id: 'u-pm-1',
    name: 'Priya Manager',
    email: 'pm1@example.com',
    role: 'PROJECT_MANAGER',
    isActive: true,
    createdAt: '2026-10-01T09:30:00Z',
  },
  {
    id: 'u-pm-2',
    name: 'Paul Manager',
    email: 'pm2@example.com',
    role: 'PROJECT_MANAGER',
    isActive: true,
    createdAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'u-tm-1',
    name: 'Maya Member',
    email: 'member1@example.com',
    role: 'TEAM_MEMBER',
    isActive: true,
    createdAt: '2026-10-01T10:30:00Z',
  },
  {
    id: 'u-tm-2',
    name: 'Mike Member',
    email: 'member2@example.com',
    role: 'TEAM_MEMBER',
    isActive: true,
    createdAt: '2026-10-01T11:00:00Z',
  },
  {
    id: 'u-vw-1',
    name: 'Vera Viewer',
    email: 'viewer@example.com',
    role: 'VIEWER',
    isActive: true,
    createdAt: '2026-10-01T11:30:00Z',
  },
  {
    id: 'u-in-1',
    name: 'Ian Inactive',
    email: 'inactive@example.com',
    role: 'TEAM_MEMBER',
    isActive: false,
    createdAt: '2026-10-01T12:00:00Z',
  },
];

// Initial Seed Projects
export const INITIAL_PROJECTS: Array<{
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}> = [
  {
    id: 'proj-1',
    name: 'Website Redesign',
    description:
      'Complete revamp of customer-facing web application with modern design tokens, accessibility compliance, and performance improvements.',
    status: 'ACTIVE',
    createdAt: '2026-10-10T10:00:00Z',
    updatedAt: '2026-10-22T14:30:00Z',
  },
  {
    id: 'proj-2',
    name: 'Mobile App Launch',
    description:
      'Cross-platform iOS and Android rollout for enterprise client field workers. Focus on offline-first syncing.',
    status: 'ACTIVE',
    createdAt: '2026-10-12T11:00:00Z',
    updatedAt: '2026-10-21T09:15:00Z',
  },
  {
    id: 'proj-3',
    name: 'Legacy Migration',
    description:
      'Decommissioning monolithic services into lightweight containerized workflows. Archived and preserved for compliance.',
    status: 'ARCHIVED',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-15T16:45:00Z',
  },
];

// Initial Seed Memberships
export const INITIAL_MEMBERS: Array<{
  projectId: string;
  userId: string;
  role: ProjectRole;
  addedAt: string;
}> = [
  // Website Redesign
  { projectId: 'proj-1', userId: 'u-pm-1', role: 'PROJECT_MANAGER', addedAt: '2026-10-10T10:00:00Z' },
  { projectId: 'proj-1', userId: 'u-tm-1', role: 'TEAM_MEMBER', addedAt: '2026-10-10T10:05:00Z' },
  { projectId: 'proj-1', userId: 'u-tm-2', role: 'TEAM_MEMBER', addedAt: '2026-10-10T10:10:00Z' },
  { projectId: 'proj-1', userId: 'u-vw-1', role: 'VIEWER', addedAt: '2026-10-10T10:15:00Z' },

  // Mobile App Launch (pm1 and tm2 are not members to test 403 authorization scoping)
  { projectId: 'proj-2', userId: 'u-pm-2', role: 'PROJECT_MANAGER', addedAt: '2026-10-12T11:00:00Z' },
  { projectId: 'proj-2', userId: 'u-tm-1', role: 'TEAM_MEMBER', addedAt: '2026-10-12T11:05:00Z' },
  { projectId: 'proj-2', userId: 'u-vw-1', role: 'VIEWER', addedAt: '2026-10-12T11:10:00Z' },

  // Legacy Migration (Archived)
  { projectId: 'proj-3', userId: 'u-pm-1', role: 'PROJECT_MANAGER', addedAt: '2026-09-01T08:00:00Z' },
  { projectId: 'proj-3', userId: 'u-tm-1', role: 'TEAM_MEMBER', addedAt: '2026-09-01T08:05:00Z' },
];

// Initial Seed Tasks
export const INITIAL_TASKS: Array<{
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  createdById: string;
  dueDate: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}> = [
  // Website Redesign Tasks
  {
    id: 't-101',
    projectId: 'proj-1',
    title: 'Design high-fidelity mockups for authentication flow',
    description: 'Ensure contrast ratios meet WCAG AA standards and include quick-switch demo profiles.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assigneeId: 'u-tm-1', // Maya Member
    createdById: 'u-pm-1',
    dueDate: '2026-11-01',
    version: 3,
    createdAt: '2026-10-10T11:00:00Z',
    updatedAt: '2026-10-22T14:00:00Z',
  },
  {
    id: 't-102',
    projectId: 'proj-1',
    title: 'Implement RBAC middleware on project routes',
    description: 'Enforce server-side policy guards for ADMIN, PROJECT_MANAGER, TEAM_MEMBER, and VIEWER.',
    status: 'TODO',
    priority: 'URGENT',
    assigneeId: 'u-tm-2', // Mike Member
    createdById: 'u-pm-1',
    dueDate: '2026-10-30',
    version: 1,
    createdAt: '2026-10-10T11:30:00Z',
    updatedAt: '2026-10-10T11:30:00Z',
  },
  {
    id: 't-103',
    projectId: 'proj-1',
    title: 'Database migration for optimistic locking version column',
    description: 'Use atomic SQL update with version increment to prevent concurrent overwrite bugs.',
    status: 'DONE',
    priority: 'MEDIUM',
    assigneeId: 'u-pm-1', // Priya Manager
    createdById: 'u-admin-1',
    dueDate: '2026-10-25',
    version: 2,
    createdAt: '2026-10-10T12:00:00Z',
    updatedAt: '2026-10-20T16:00:00Z',
  },
  {
    id: 't-104',
    projectId: 'proj-1',
    title: 'Audit comments cascade deletion integrity',
    description: 'Verify deleting a task cascades to its comments, and removing a member unassigns their tasks.',
    status: 'IN_REVIEW',
    priority: 'LOW',
    assigneeId: 'u-tm-1', // Maya Member
    createdById: 'u-pm-1',
    dueDate: '2026-11-05',
    version: 1,
    createdAt: '2026-10-11T09:00:00Z',
    updatedAt: '2026-10-21T10:00:00Z',
  },
  {
    id: 't-105',
    projectId: 'proj-1',
    title: 'Write automated end-to-end permission matrix tests',
    description: 'Validate 403 Forbidden responses on all forbidden endpoint invocations.',
    status: 'TODO',
    priority: 'HIGH',
    assigneeId: null, // Unassigned
    createdById: 'u-pm-1',
    dueDate: '2026-10-20', // Overdue!
    version: 1,
    createdAt: '2026-10-11T10:00:00Z',
    updatedAt: '2026-10-11T10:00:00Z',
  },
  {
    id: 't-106',
    projectId: 'proj-1',
    title: 'Client-side toast alerts and conflict resolution modal',
    description: 'Display side-by-side comparison of local vs server fields on 409 VERSION_CONFLICT.',
    status: 'DONE',
    priority: 'MEDIUM',
    assigneeId: 'u-tm-2',
    createdById: 'u-pm-1',
    dueDate: '2026-10-24',
    version: 4,
    createdAt: '2026-10-12T10:00:00Z',
    updatedAt: '2026-10-22T17:00:00Z',
  },

  // Mobile App Launch Tasks
  {
    id: 't-201',
    projectId: 'proj-2',
    title: 'Setup mobile push notification service hooks',
    description: 'Configure APNS and FCM credentials with local fallback.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assigneeId: 'u-tm-1', // Maya Member
    createdById: 'u-pm-2',
    dueDate: '2026-11-10',
    version: 1,
    createdAt: '2026-10-12T12:00:00Z',
    updatedAt: '2026-10-12T12:00:00Z',
  },
  {
    id: 't-202',
    projectId: 'proj-2',
    title: 'Field testing with offline SQLite synchronization',
    description: 'Verify sync queue resolves connectivity dropouts gracefully.',
    status: 'TODO',
    priority: 'MEDIUM',
    assigneeId: 'u-pm-2',
    createdById: 'u-pm-2',
    dueDate: '2026-11-15',
    version: 1,
    createdAt: '2026-10-12T13:00:00Z',
    updatedAt: '2026-10-12T13:00:00Z',
  },

  // Legacy Migration Tasks (Archived)
  {
    id: 't-301',
    projectId: 'proj-3',
    title: 'Archive Oracle database dump snapshots',
    description: 'Encrypted cold storage backup completed.',
    status: 'DONE',
    priority: 'LOW',
    assigneeId: 'u-pm-1',
    createdById: 'u-pm-1',
    dueDate: '2026-09-10',
    version: 1,
    createdAt: '2026-09-02T10:00:00Z',
    updatedAt: '2026-09-10T12:00:00Z',
  },
];

// Initial Seed Comments
export const INITIAL_COMMENTS: Array<{
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}> = [
  {
    id: 'c-1',
    taskId: 't-101',
    authorId: 'u-pm-1', // Priya Manager
    body: 'Maya, please make sure the evaluator quick-fill buttons are prominent on the login page.',
    createdAt: '2026-10-22T10:00:00Z',
  },
  {
    id: 'c-2',
    taskId: 't-101',
    authorId: 'u-tm-1', // Maya Member
    body: 'Done! Added one-click cards for Alice (Admin), Priya (PM), Maya (Team Member), and Vera (Viewer).',
    createdAt: '2026-10-22T11:15:00Z',
  },
  {
    id: 'c-3',
    taskId: 't-101',
    authorId: 'u-admin-1', // Alice Admin
    body: 'Looks great in review. The design tokens and responsive states align with our UX standards.',
    createdAt: '2026-10-22T14:30:00Z',
  },
];
