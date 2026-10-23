export type GlobalRole = 'ADMIN' | 'PROJECT_MANAGER' | 'TEAM_MEMBER' | 'VIEWER';
export type ProjectRole = 'PROJECT_MANAGER' | 'TEAM_MEMBER' | 'VIEWER';
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: GlobalRole;
  isActive: boolean;
  createdAt: string;
}

export interface ProjectPermissions {
  canEdit: boolean;
  canArchive: boolean;
  canDelete: boolean;
  canManageMembers: boolean;
  canManageProjectManagers: boolean;
  canCreateTasks: boolean;
  canComment: boolean;
}

export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  memberCount: number;
  taskCount: number;
  myRole: GlobalRole | ProjectRole | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectListItem {
  permissions: ProjectPermissions;
}

export interface Member {
  userId: string;
  name: string;
  email: string;
  globalRole: GlobalRole;
  role: ProjectRole;
  addedAt: string;
}

export interface TaskPermissions {
  canEdit: boolean;
  canChangeStatus: boolean;
  canAssign: boolean;
  canDelete: boolean;
}

export interface TaskAssignee {
  id: string;
  name: string;
  email: string;
}

export interface TaskCreator {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  version: number;
  assignee: TaskAssignee | null;
  createdBy: TaskCreator;
  createdAt: string;
  updatedAt: string;
  permissions: TaskPermissions;
}

export interface Comment {
  id: string;
  taskId: string;
  body: string;
  author: {
    id: string;
    name: string;
  };
  createdAt: string;
  canDelete: boolean;
}

export interface DashboardData {
  projectCount: number;
  tasksByStatus: {
    TODO: number;
    IN_PROGRESS: number;
    IN_REVIEW: number;
    DONE: number;
  };
  overdueCount: number;
  myOpenTasks: Task[];
  recentProjects: ProjectListItem[];
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiDataResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: {
      fieldErrors?: Record<string, string[]>;
      currentTask?: Task;
      [key: string]: unknown;
    };
  };
}
