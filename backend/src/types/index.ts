export type GlobalRole = 'ADMIN' | 'PROJECT_MANAGER' | 'TEAM_MEMBER' | 'VIEWER';
export type ProjectRole = 'PROJECT_MANAGER' | 'TEAM_MEMBER' | 'VIEWER';
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface UserDoc {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: GlobalRole;
  isActive: boolean;
  createdAt: string;
}

export interface ProjectDoc {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMemberDoc {
  projectId: string;
  userId: string;
  role: ProjectRole;
  addedAt: string;
}

export interface TaskDoc {
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
}

export interface CommentDoc {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}
