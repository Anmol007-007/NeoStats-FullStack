import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  CommentDoc,
  ProjectDoc,
  ProjectMemberDoc,
  TaskDoc,
  UserDoc,
} from '../types/index.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

interface DatabaseSchema {
  users: UserDoc[];
  projects: ProjectDoc[];
  members: ProjectMemberDoc[];
  tasks: TaskDoc[];
  comments: CommentDoc[];
}

function getInitialSeedData(): DatabaseSchema {
  const adminHash = bcrypt.hashSync('Admin@123', 10);
  const passwordHash = bcrypt.hashSync('Password@123', 10);

  const users: UserDoc[] = [
    {
      id: 'u-admin-1',
      name: 'Alice Admin',
      email: 'admin@example.com',
      passwordHash: adminHash,
      role: 'ADMIN',
      isActive: true,
      createdAt: '2026-10-01T09:00:00Z',
    },
    {
      id: 'u-pm-1',
      name: 'Priya Manager',
      email: 'pm1@example.com',
      passwordHash,
      role: 'PROJECT_MANAGER',
      isActive: true,
      createdAt: '2026-10-01T09:30:00Z',
    },
    {
      id: 'u-pm-2',
      name: 'Paul Manager',
      email: 'pm2@example.com',
      passwordHash,
      role: 'PROJECT_MANAGER',
      isActive: true,
      createdAt: '2026-10-01T10:00:00Z',
    },
    {
      id: 'u-tm-1',
      name: 'Maya Member',
      email: 'member1@example.com',
      passwordHash,
      role: 'TEAM_MEMBER',
      isActive: true,
      createdAt: '2026-10-01T10:30:00Z',
    },
    {
      id: 'u-tm-2',
      name: 'Mike Member',
      email: 'member2@example.com',
      passwordHash,
      role: 'TEAM_MEMBER',
      isActive: true,
      createdAt: '2026-10-01T11:00:00Z',
    },
    {
      id: 'u-vw-1',
      name: 'Vera Viewer',
      email: 'viewer@example.com',
      passwordHash,
      role: 'VIEWER',
      isActive: true,
      createdAt: '2026-10-01T11:30:00Z',
    },
    {
      id: 'u-in-1',
      name: 'Ian Inactive',
      email: 'inactive@example.com',
      passwordHash,
      role: 'TEAM_MEMBER',
      isActive: false,
      createdAt: '2026-10-01T12:00:00Z',
    },
  ];

  const projects: ProjectDoc[] = [
    {
      id: 'proj-1',
      name: 'Website Redesign',
      description: 'Revamp of customer web application with modern UX design tokens.',
      status: 'ACTIVE',
      createdById: 'u-admin-1',
      createdAt: '2026-10-10T10:00:00Z',
      updatedAt: '2026-10-22T14:30:00Z',
    },
    {
      id: 'proj-2',
      name: 'Mobile App Launch',
      description: 'iOS and Android app rollout for field workers.',
      status: 'ACTIVE',
      createdById: 'u-admin-1',
      createdAt: '2026-10-12T11:00:00Z',
      updatedAt: '2026-10-21T09:15:00Z',
    },
    {
      id: 'proj-3',
      name: 'Legacy Migration',
      description: 'Monolith service migration. Archived for compliance.',
      status: 'ARCHIVED',
      createdById: 'u-admin-1',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-10-15T16:45:00Z',
    },
  ];

  const members: ProjectMemberDoc[] = [
    { projectId: 'proj-1', userId: 'u-pm-1', role: 'PROJECT_MANAGER', addedAt: '2026-10-10T10:00:00Z' },
    { projectId: 'proj-1', userId: 'u-tm-1', role: 'TEAM_MEMBER', addedAt: '2026-10-10T10:05:00Z' },
    { projectId: 'proj-1', userId: 'u-tm-2', role: 'TEAM_MEMBER', addedAt: '2026-10-10T10:10:00Z' },
    { projectId: 'proj-1', userId: 'u-vw-1', role: 'VIEWER', addedAt: '2026-10-10T10:15:00Z' },

    { projectId: 'proj-2', userId: 'u-pm-2', role: 'PROJECT_MANAGER', addedAt: '2026-10-12T11:00:00Z' },
    { projectId: 'proj-2', userId: 'u-tm-1', role: 'TEAM_MEMBER', addedAt: '2026-10-12T11:05:00Z' },
    { projectId: 'proj-2', userId: 'u-vw-1', role: 'VIEWER', addedAt: '2026-10-12T11:10:00Z' },

    { projectId: 'proj-3', userId: 'u-pm-1', role: 'PROJECT_MANAGER', addedAt: '2026-09-01T08:00:00Z' },
    { projectId: 'proj-3', userId: 'u-tm-1', role: 'TEAM_MEMBER', addedAt: '2026-09-01T08:05:00Z' },
  ];

  const tasks: TaskDoc[] = [
    {
      id: 't-101',
      projectId: 'proj-1',
      title: 'Design high-fidelity mockups for authentication flow',
      description: 'Ensure contrast ratios meet WCAG AA standards and include quick-switch demo profiles.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assigneeId: 'u-tm-1',
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
      assigneeId: 'u-tm-2',
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
      assigneeId: 'u-pm-1',
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
      assigneeId: 'u-tm-1',
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
      assigneeId: null,
      createdById: 'u-pm-1',
      dueDate: '2026-10-20',
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
  ];

  const comments: CommentDoc[] = [
    {
      id: 'c-1',
      taskId: 't-101',
      authorId: 'u-pm-1',
      body: 'Maya, please make sure the evaluator quick-fill buttons are prominent on the login page.',
      createdAt: '2026-10-22T10:00:00Z',
    },
    {
      id: 'c-2',
      taskId: 't-101',
      authorId: 'u-tm-1',
      body: 'Done! Added one-click cards for Alice (Admin), Priya (PM), Maya (Team Member), and Vera (Viewer).',
      createdAt: '2026-10-22T11:15:00Z',
    },
  ];

  return { users, projects, members, tasks, comments };
}

class LocalDatabase {
  private data: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
      } catch {
        this.data = getInitialSeedData();
        this.save();
      }
    } else {
      this.data = getInitialSeedData();
      this.save();
    }
  }

  save() {
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  get users() {
    return this.data.users;
  }
  get projects() {
    return this.data.projects;
  }
  get members() {
    return this.data.members;
  }
  get tasks() {
    return this.data.tasks;
  }
  get comments() {
    return this.data.comments;
  }
}

export const db = new LocalDatabase();
