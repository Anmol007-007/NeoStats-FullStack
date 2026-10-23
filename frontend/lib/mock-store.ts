'use client';

import {
  Comment,
  DashboardData,
  GlobalRole,
  Member,
  ProjectDetail,
  ProjectListItem,
  ProjectPermissions,
  ProjectRole,
  ProjectStatus,
  Task,
  TaskPermissions,
  TaskPriority,
  TaskStatus,
  User,
} from './types';
import {
  INITIAL_COMMENTS,
  INITIAL_MEMBERS,
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_USERS,
} from './mock-data';
import { ApiError } from './api';

const STORAGE_KEY_PREFIX = 'taskflow_prototype_';

function getStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

class MockStore {
  private users: User[];
  private projects: typeof INITIAL_PROJECTS;
  private members: typeof INITIAL_MEMBERS;
  private tasks: typeof INITIAL_TASKS;
  private comments: typeof INITIAL_COMMENTS;
  private currentUserId: string | null;

  constructor() {
    this.users = getStored('users', INITIAL_USERS);
    this.projects = getStored('projects', INITIAL_PROJECTS);
    this.members = getStored('members', INITIAL_MEMBERS);
    this.tasks = getStored('tasks', INITIAL_TASKS);
    this.comments = getStored('comments', INITIAL_COMMENTS);
    this.currentUserId = getStored('currentUser', 'u-admin-1'); // Default to Alice Admin
  }

  private save() {
    setStored('users', this.users);
    setStored('projects', this.projects);
    setStored('members', this.members);
    setStored('tasks', this.tasks);
    setStored('comments', this.comments);
    setStored('currentUser', this.currentUserId);
  }

  // Current authenticated user
  getCurrentUser(): User | null {
    if (!this.currentUserId) return null;
    const user = this.users.find((u) => u.id === this.currentUserId && u.isActive);
    return user || null;
  }

  login(email: string): User {
    const user = this.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (!user) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    if (!user.isActive) {
      throw new ApiError(
        403,
        'ACCOUNT_DEACTIVATED',
        'Your account has been deactivated. Contact an administrator.'
      );
    }
    this.currentUserId = user.id;
    this.save();
    return user;
  }

  logout(): void {
    this.currentUserId = null;
    this.save();
  }

  signup(data: { name: string; email: string; password: string; role?: string }): User {
    const existing = this.users.find(
      (u) => u.email.toLowerCase() === data.email.toLowerCase()
    );
    if (existing) {
      throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    }
    const newUser: User = {
      id: `u-${Date.now()}`,
      name: data.name,
      email: data.email.toLowerCase(),
      role: (data.role as GlobalRole) || 'TEAM_MEMBER',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    this.currentUserId = newUser.id;
    this.save();
    return newUser;
  }

  updateProfile(name: string): User {
    const user = this.getCurrentUser();
    if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Not authenticated');
    user.name = name;
    this.save();
    return user;
  }

  // Helper: compute project permissions
  private computeProjectPermissions(
    project: (typeof INITIAL_PROJECTS)[0],
    role: GlobalRole | ProjectRole | null
  ): ProjectPermissions {
    const isAdmin = role === 'ADMIN';
    const isPM = role === 'PROJECT_MANAGER';
    const isArchived = project.status === 'ARCHIVED';

    return {
      canEdit: !isArchived && (isAdmin || isPM),
      canArchive: isAdmin || isPM,
      canDelete: isAdmin,
      canManageMembers: !isArchived && (isAdmin || isPM),
      canManageProjectManagers: !isArchived && isAdmin,
      canCreateTasks: !isArchived && (isAdmin || isPM),
      canComment: !isArchived && (isAdmin || isPM || role === 'TEAM_MEMBER'),
    };
  }

  // Helper: compute task permissions
  private computeTaskPermissions(
    task: (typeof INITIAL_TASKS)[0],
    project: (typeof INITIAL_PROJECTS)[0],
    actor: User,
    projectRole: ProjectRole | null
  ): TaskPermissions {
    const isAdmin = actor.role === 'ADMIN';
    const isPM = projectRole === 'PROJECT_MANAGER';
    const isTM = projectRole === 'TEAM_MEMBER';
    const isArchived = project.status === 'ARCHIVED';
    const isAssignedToMe = task.assigneeId === actor.id;

    if (isArchived) {
      return {
        canEdit: false,
        canChangeStatus: false,
        canAssign: false,
        canDelete: false,
      };
    }

    if (isAdmin || isPM) {
      return {
        canEdit: true,
        canChangeStatus: true,
        canAssign: true,
        canDelete: true,
      };
    }

    if (isTM && isAssignedToMe) {
      return {
        canEdit: true,
        canChangeStatus: true,
        canAssign: false,
        canDelete: false,
      };
    }

    return {
      canEdit: false,
      canChangeStatus: false,
      canAssign: false,
      canDelete: false,
    };
  }

  // Dashboard Data
  getDashboard(): DashboardData {
    const actor = this.getCurrentUser();
    if (!actor) throw new ApiError(401, 'UNAUTHENTICATED', 'Not authenticated');

    const accessibleProjects = this.getProjects().data;
    const projectIds = accessibleProjects.map((p) => p.id);

    const relevantTasks = this.tasks.filter((t) =>
      projectIds.includes(t.projectId)
    );

    const tasksByStatus = {
      TODO: relevantTasks.filter((t) => t.status === 'TODO').length,
      IN_PROGRESS: relevantTasks.filter((t) => t.status === 'IN_PROGRESS').length,
      IN_REVIEW: relevantTasks.filter((t) => t.status === 'IN_REVIEW').length,
      DONE: relevantTasks.filter((t) => t.status === 'DONE').length,
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const overdueCount = relevantTasks.filter(
      (t) => t.status !== 'DONE' && t.dueDate && t.dueDate < todayStr
    ).length;

    // My Open Tasks
    const myTasks = this.tasks
      .filter((t) => t.assigneeId === actor.id && t.status !== 'DONE')
      .slice(0, 5)
      .map((t) => this.toTaskDto(t, actor));

    return {
      projectCount: accessibleProjects.length,
      tasksByStatus,
      overdueCount,
      myOpenTasks: myTasks,
      recentProjects: accessibleProjects.slice(0, 5),
    };
  }

  // Projects
  getProjects(status?: ProjectStatus, q?: string): { data: ProjectListItem[]; meta: any } {
    const actor = this.getCurrentUser();
    if (!actor) throw new ApiError(401, 'UNAUTHENTICATED', 'Not authenticated');

    let list = this.projects.filter((p) => {
      // Scoping: Admin sees all; others see only projects they belong to
      if (actor.role !== 'ADMIN') {
        const isMember = this.members.some(
          (m) => m.projectId === p.id && m.userId === actor.id
        );
        if (!isMember) return false;
      }
      if (status && p.status !== status) return false;
      if (q) {
        const lowerQ = q.toLowerCase();
        return (
          p.name.toLowerCase().includes(lowerQ) ||
          p.description.toLowerCase().includes(lowerQ)
        );
      }
      return true;
    });

    const items: ProjectListItem[] = list.map((p) => {
      const memberCount = this.members.filter((m) => m.projectId === p.id).length;
      const taskCount = this.tasks.filter((t) => t.projectId === p.id).length;

      let myRole: any = null;
      if (actor.role === 'ADMIN') {
        myRole = 'ADMIN';
      } else {
        const membership = this.members.find(
          (m) => m.projectId === p.id && m.userId === actor.id
        );
        myRole = membership ? membership.role : null;
      }

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        memberCount,
        taskCount,
        myRole,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    return {
      data: items,
      meta: { page: 1, pageSize: 20, total: items.length, totalPages: 1 },
    };
  }

  getProject(id: string): ProjectDetail {
    const actor = this.getCurrentUser();
    if (!actor) throw new ApiError(401, 'UNAUTHENTICATED', 'Not authenticated');

    const project = this.projects.find((p) => p.id === id);
    if (!project) throw new ApiError(404, 'NOT_FOUND', 'Project not found');

    let myRole: any = null;
    if (actor.role === 'ADMIN') {
      myRole = 'ADMIN';
    } else {
      const membership = this.members.find(
        (m) => m.projectId === project.id && m.userId === actor.id
      );
      if (!membership) {
        throw new ApiError(403, 'FORBIDDEN', 'You do not have access to this project');
      }
      myRole = membership.role;
    }

    const memberCount = this.members.filter((m) => m.projectId === project.id).length;
    const taskCount = this.tasks.filter((t) => t.projectId === project.id).length;
    const permissions = this.computeProjectPermissions(project, myRole);

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      memberCount,
      taskCount,
      myRole,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      permissions,
    };
  }

  createProject(data: { name: string; description?: string; projectManagerId?: string }): ProjectDetail {
    const actor = this.getCurrentUser();
    if (!actor || actor.role !== 'ADMIN') {
      throw new ApiError(403, 'FORBIDDEN', 'Only Admins can create projects');
    }

    const newProject = {
      id: `proj-${Date.now()}`,
      name: data.name,
      description: data.description || '',
      status: 'ACTIVE' as ProjectStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.projects.unshift(newProject);

    if (data.projectManagerId) {
      this.members.push({
        projectId: newProject.id,
        userId: data.projectManagerId,
        role: 'PROJECT_MANAGER',
        addedAt: new Date().toISOString(),
      });
    }

    this.save();
    return this.getProject(newProject.id);
  }

  updateProject(id: string, data: { name?: string; description?: string }): ProjectDetail {
    const project = this.projects.find((p) => p.id === id);
    if (!project) throw new ApiError(404, 'NOT_FOUND', 'Project not found');

    if (data.name) project.name = data.name;
    if (data.description !== undefined) project.description = data.description;
    project.updatedAt = new Date().toISOString();

    this.save();
    return this.getProject(id);
  }

  archiveProject(id: string): ProjectDetail {
    const project = this.projects.find((p) => p.id === id);
    if (!project) throw new ApiError(404, 'NOT_FOUND', 'Project not found');
    project.status = 'ARCHIVED';
    project.updatedAt = new Date().toISOString();
    this.save();
    return this.getProject(id);
  }

  unarchiveProject(id: string): ProjectDetail {
    const project = this.projects.find((p) => p.id === id);
    if (!project) throw new ApiError(404, 'NOT_FOUND', 'Project not found');
    project.status = 'ACTIVE';
    project.updatedAt = new Date().toISOString();
    this.save();
    return this.getProject(id);
  }

  deleteProject(id: string): void {
    const actor = this.getCurrentUser();
    if (!actor || actor.role !== 'ADMIN') {
      throw new ApiError(403, 'FORBIDDEN', 'Only Admins can delete projects');
    }

    this.projects = this.projects.filter((p) => p.id !== id);
    this.members = this.members.filter((m) => m.projectId !== id);
    const taskIds = this.tasks.filter((t) => t.projectId === id).map((t) => t.id);
    this.tasks = this.tasks.filter((t) => t.projectId !== id);
    this.comments = this.comments.filter((c) => !taskIds.includes(c.taskId));

    this.save();
  }

  // Members
  getMembers(projectId: string): Member[] {
    const memberships = this.members.filter((m) => m.projectId === projectId);
    return memberships.map((m) => {
      const u = this.users.find((user) => user.id === m.userId)!;
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        globalRole: u.role,
        role: m.role,
        addedAt: m.addedAt,
      };
    });
  }

  getCandidates(projectId: string, q?: string): User[] {
    const existingUserIds = this.members
      .filter((m) => m.projectId === projectId)
      .map((m) => m.userId);

    return this.users.filter((u) => {
      if (!u.isActive) return false;
      if (u.role === 'ADMIN') return false; // Admins have implicit access, not added as members
      if (existingUserIds.includes(u.id)) return false;
      if (q) {
        const lower = q.toLowerCase();
        return u.name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower);
      }
      return true;
    });
  }

  addMember(projectId: string, data: { userId: string; role: ProjectRole }): Member {
    const exists = this.members.some(
      (m) => m.projectId === projectId && m.userId === data.userId
    );
    if (exists) {
      throw new ApiError(409, 'ALREADY_MEMBER', 'User is already a project member');
    }

    const memberRow = {
      projectId,
      userId: data.userId,
      role: data.role,
      addedAt: new Date().toISOString(),
    };
    this.members.push(memberRow);
    this.save();

    const u = this.users.find((user) => user.id === data.userId)!;
    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      globalRole: u.role,
      role: memberRow.role,
      addedAt: memberRow.addedAt,
    };
  }

  updateMemberRole(projectId: string, userId: string, role: ProjectRole): Member {
    const m = this.members.find(
      (mem) => mem.projectId === projectId && mem.userId === userId
    );
    if (!m) throw new ApiError(404, 'NOT_FOUND', 'Member not found');

    m.role = role;
    this.save();

    const u = this.users.find((user) => user.id === userId)!;
    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      globalRole: u.role,
      role: m.role,
      addedAt: m.addedAt,
    };
  }

  removeMember(projectId: string, userId: string): void {
    this.members = this.members.filter(
      (m) => !(m.projectId === projectId && m.userId === userId)
    );
    // Cascade unassign member's tasks per BR-8
    this.tasks.forEach((t) => {
      if (t.projectId === projectId && t.assigneeId === userId) {
        t.assigneeId = null;
      }
    });
    this.save();
  }

  // Tasks
  private toTaskDto(task: (typeof INITIAL_TASKS)[0], actor: User): Task {
    const project = this.projects.find((p) => p.id === task.projectId)!;
    let projectRole: ProjectRole | null = null;
    if (actor.role === 'ADMIN') {
      projectRole = 'PROJECT_MANAGER';
    } else {
      const membership = this.members.find(
        (m) => m.projectId === task.projectId && m.userId === actor.id
      );
      projectRole = membership ? membership.role : null;
    }

    const assigneeUser = task.assigneeId
      ? this.users.find((u) => u.id === task.assigneeId)
      : null;
    const creatorUser = this.users.find((u) => u.id === task.createdById) || actor;

    const permissions = this.computeTaskPermissions(task, project, actor, projectRole);

    return {
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      version: task.version,
      assignee: assigneeUser
        ? { id: assigneeUser.id, name: assigneeUser.name, email: assigneeUser.email }
        : null,
      createdBy: { id: creatorUser.id, name: creatorUser.name },
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      permissions,
    };
  }

  getTasks(
    projectId: string,
    filters?: { q?: string; status?: TaskStatus; priority?: TaskPriority; assigneeId?: string }
  ): { data: Task[]; meta: any } {
    const actor = this.getCurrentUser();
    if (!actor) throw new ApiError(401, 'UNAUTHENTICATED', 'Not authenticated');

    let list = this.tasks.filter((t) => t.projectId === projectId);

    if (filters?.q) {
      const lower = filters.q.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(lower) ||
          t.description?.toLowerCase().includes(lower)
      );
    }
    if (filters?.status && filters.status !== ('ALL' as any)) {
      list = list.filter((t) => t.status === filters.status);
    }
    if (filters?.priority && filters.priority !== ('ALL' as any)) {
      list = list.filter((t) => t.priority === filters.priority);
    }
    if (filters?.assigneeId && filters.assigneeId !== ('ALL' as any)) {
      list = list.filter((t) => t.assigneeId === filters.assigneeId);
    }

    const items = list.map((t) => this.toTaskDto(t, actor));
    return {
      data: items,
      meta: { page: 1, pageSize: 20, total: items.length, totalPages: 1 },
    };
  }

  getMyTasks(status?: TaskStatus): { data: Task[]; meta: any } {
    const actor = this.getCurrentUser();
    if (!actor) throw new ApiError(401, 'UNAUTHENTICATED', 'Not authenticated');

    let list = this.tasks.filter((t) => t.assigneeId === actor.id);
    if (status && status !== ('ALL' as any)) {
      list = list.filter((t) => t.status === status);
    }

    const items = list.map((t) => this.toTaskDto(t, actor));
    return {
      data: items,
      meta: { page: 1, pageSize: 20, total: items.length, totalPages: 1 },
    };
  }

  getTask(id: string): Task {
    const actor = this.getCurrentUser();
    if (!actor) throw new ApiError(401, 'UNAUTHENTICATED', 'Not authenticated');

    const task = this.tasks.find((t) => t.id === id);
    if (!task) throw new ApiError(404, 'NOT_FOUND', 'Task not found');

    return this.toTaskDto(task, actor);
  }

  createTask(projectId: string, data: any): Task {
    const actor = this.getCurrentUser();
    if (!actor) throw new ApiError(401, 'UNAUTHENTICATED', 'Not authenticated');

    const newTask = {
      id: `t-${Date.now()}`,
      projectId,
      title: data.title,
      description: data.description || '',
      status: data.status || 'TODO',
      priority: data.priority || 'MEDIUM',
      assigneeId: data.assigneeId || null,
      createdById: actor.id,
      dueDate: data.dueDate || null,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.tasks.unshift(newTask);
    this.save();
    return this.toTaskDto(newTask, actor);
  }

  // Optimistic Locking Update Task Implementation
  updateTask(id: string, data: any): Task {
    const actor = this.getCurrentUser();
    if (!actor) throw new ApiError(401, 'UNAUTHENTICATED', 'Not authenticated');

    const task = this.tasks.find((t) => t.id === id);
    if (!task) throw new ApiError(404, 'NOT_FOUND', 'Task not found');

    // CONCURRENT UPDATE CHECK (Optimistic Locking)
    if (data.version !== undefined && data.version !== task.version) {
      const currentTaskDto = this.toTaskDto(task, actor);
      throw new ApiError(
        409,
        'VERSION_CONFLICT',
        'This task was modified by someone else. Review the latest version.',
        { currentTask: currentTaskDto }
      );
    }

    // Apply updates
    if (data.title !== undefined) task.title = data.title;
    if (data.description !== undefined) task.description = data.description;
    if (data.status !== undefined) task.status = data.status;
    if (data.priority !== undefined) task.priority = data.priority;
    if (data.assigneeId !== undefined) task.assigneeId = data.assigneeId;
    if (data.dueDate !== undefined) task.dueDate = data.dueDate;

    task.version += 1;
    task.updatedAt = new Date().toISOString();

    this.save();
    return this.toTaskDto(task, actor);
  }

  deleteTask(id: string): void {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.comments = this.comments.filter((c) => c.taskId !== id);
    this.save();
  }

  // Comments
  getComments(taskId: string): Comment[] {
    const actor = this.getCurrentUser();
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return [];

    const taskComments = this.comments.filter((c) => c.taskId === taskId);
    return taskComments.map((c) => {
      const author = this.users.find((u) => u.id === c.authorId) || {
        id: c.authorId,
        name: 'User',
      };
      const canDelete =
        actor?.role === 'ADMIN' ||
        c.authorId === actor?.id ||
        actor?.role === 'PROJECT_MANAGER';

      return {
        id: c.id,
        taskId: c.taskId,
        body: c.body,
        author: { id: author.id, name: author.name },
        createdAt: c.createdAt,
        canDelete: !!canDelete,
      };
    });
  }

  createComment(taskId: string, bodyText: string): Comment {
    const actor = this.getCurrentUser();
    if (!actor) throw new ApiError(401, 'UNAUTHENTICATED', 'Not authenticated');

    const newComment = {
      id: `c-${Date.now()}`,
      taskId,
      authorId: actor.id,
      body: bodyText,
      createdAt: new Date().toISOString(),
    };

    this.comments.push(newComment);
    this.save();

    return {
      id: newComment.id,
      taskId: newComment.taskId,
      body: newComment.body,
      author: { id: actor.id, name: actor.name },
      createdAt: newComment.createdAt,
      canDelete: true,
    };
  }

  deleteComment(commentId: string): void {
    this.comments = this.comments.filter((c) => c.id !== commentId);
    this.save();
  }

  // Users (Admin)
  getUsers(filters?: { q?: string; role?: string; isActive?: boolean }): { data: User[]; meta: any } {
    let list = [...this.users];
    if (filters?.q) {
      const lower = filters.q.toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(lower) ||
          u.email.toLowerCase().includes(lower)
      );
    }
    if (filters?.role && filters.role !== 'ALL') {
      list = list.filter((u) => u.role === filters.role);
    }
    if (filters?.isActive !== undefined) {
      list = list.filter((u) => u.isActive === filters.isActive);
    }

    return {
      data: list,
      meta: { page: 1, pageSize: 20, total: list.length, totalPages: 1 },
    };
  }

  createUser(data: { name: string; email: string; role: GlobalRole }): User {
    const exists = this.users.some(
      (u) => u.email.toLowerCase() === data.email.toLowerCase()
    );
    if (exists) {
      throw new ApiError(409, 'EMAIL_TAKEN', 'A user with this email already exists');
    }

    const newUser: User = {
      id: `u-${Date.now()}`,
      name: data.name,
      email: data.email.toLowerCase(),
      role: data.role,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    this.users.push(newUser);
    this.save();
    return newUser;
  }

  updateUser(id: string, data: { name?: string; email?: string; role?: GlobalRole }): User {
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');

    if (data.name) user.name = data.name;
    if (data.email) user.email = data.email.toLowerCase();
    if (data.role) user.role = data.role;

    this.save();
    return user;
  }

  toggleUserActive(id: string, isActive: boolean): User {
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');
    user.isActive = isActive;
    this.save();
    return user;
  }

  // Reset demo data helper
  resetToDefaults(): void {
    this.users = INITIAL_USERS;
    this.projects = INITIAL_PROJECTS;
    this.members = INITIAL_MEMBERS;
    this.tasks = INITIAL_TASKS;
    this.comments = INITIAL_COMMENTS;
    this.currentUserId = 'u-admin-1';
    this.save();
  }
}

export const mockStore = new MockStore();
