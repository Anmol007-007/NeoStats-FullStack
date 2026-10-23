import {
  ApiDataResponse,
  ApiErrorResponse,
  ApiListResponse,
  Comment,
  DashboardData,
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
import { mockStore } from './mock-store';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// Connect directly to live Express backend with MongoDB
const IS_PROTOTYPE_MODE = process.env.NEXT_PUBLIC_ENABLE_MOCK === 'true';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown> & {
    fieldErrors?: Record<string, string[]>;
    currentTask?: Task;
  };

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown> & {
      fieldErrors?: Record<string, string[]>;
      currentTask?: Task;
    }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, ...restOptions } = options;

  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const response = await fetch(url, {
    ...restOptions,
    credentials: 'include',
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  });

  if (response.status === 204) {
    return {} as T;
  }

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorBody = data as ApiErrorResponse | null;
    const errorCode = errorBody?.error?.code || 'UNKNOWN_ERROR';
    const errorMessage =
      errorBody?.error?.message ||
      (typeof data === 'string' && data) ||
      response.statusText ||
      'An unexpected error occurred';
    const errorDetails = errorBody?.error?.details;

    if (
      response.status === 401 &&
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login')
    ) {
      window.location.href = '/login';
    }

    throw new ApiError(
      response.status,
      errorCode,
      errorMessage,
      errorDetails as any
    );
  }

  return data as T;
}

// ----------------- API Endpoints (With Prototype Fallback) -----------------

export const api = {
  // Auth
  auth: {
    login: async (credentials: { email: string; password: string }) => {
      if (IS_PROTOTYPE_MODE) {
        const user = mockStore.login(credentials.email);
        return { data: user };
      }
      return apiRequest<ApiDataResponse<User>>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    },
    logout: async () => {
      if (IS_PROTOTYPE_MODE) {
        mockStore.logout();
        return;
      }
      return apiRequest<void>('/auth/logout', { method: 'POST' });
    },
    getMe: async () => {
      if (IS_PROTOTYPE_MODE) {
        const user = mockStore.getCurrentUser();
        if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Not authenticated');
        return { data: user };
      }
      return apiRequest<ApiDataResponse<User>>('/auth/me');
    },
    updateMe: async (data: { name: string }) => {
      if (IS_PROTOTYPE_MODE) {
        const user = mockStore.updateProfile(data.name);
        return { data: user };
      }
      return apiRequest<ApiDataResponse<User>>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    changePassword: async (_data: { currentPassword: string; newPassword: string }) => {
      if (IS_PROTOTYPE_MODE) {
        return;
      }
      return apiRequest<void>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(_data),
      });
    },
  },

  // Users (Admin)
  users: {
    list: async (params?: {
      page?: number;
      pageSize?: number;
      q?: string;
      role?: string;
      isActive?: boolean;
    }) => {
      if (IS_PROTOTYPE_MODE) {
        return mockStore.getUsers(params);
      }
      return apiRequest<ApiListResponse<User>>('/users', { params });
    },
    get: async (id: string) => {
      if (IS_PROTOTYPE_MODE) {
        const users = mockStore.getUsers().data;
        const u = users.find((user) => user.id === id);
        if (!u) throw new ApiError(404, 'NOT_FOUND', 'User not found');
        return { data: u };
      }
      return apiRequest<ApiDataResponse<User>>(`/users/${id}`);
    },
    create: async (data: {
      name: string;
      email: string;
      password: string;
      role: any;
    }) => {
      if (IS_PROTOTYPE_MODE) {
        const user = mockStore.createUser(data);
        return { data: user };
      }
      return apiRequest<ApiDataResponse<User>>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (
      id: string,
      data: {
        name?: string;
        email?: string;
        role?: any;
        password?: string;
      }
    ) => {
      if (IS_PROTOTYPE_MODE) {
        const user = mockStore.updateUser(id, data);
        return { data: user };
      }
      return apiRequest<ApiDataResponse<User>>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    deactivate: async (id: string) => {
      if (IS_PROTOTYPE_MODE) {
        const user = mockStore.toggleUserActive(id, false);
        return { data: user };
      }
      return apiRequest<ApiDataResponse<User>>(`/users/${id}/deactivate`, {
        method: 'POST',
      });
    },
    activate: async (id: string) => {
      if (IS_PROTOTYPE_MODE) {
        const user = mockStore.toggleUserActive(id, true);
        return { data: user };
      }
      return apiRequest<ApiDataResponse<User>>(`/users/${id}/activate`, {
        method: 'POST',
      });
    },
  },

  // Projects
  projects: {
    list: async (params?: {
      page?: number;
      pageSize?: number;
      q?: string;
      status?: ProjectStatus;
    }) => {
      if (IS_PROTOTYPE_MODE) {
        return mockStore.getProjects(params?.status, params?.q);
      }
      return apiRequest<ApiListResponse<ProjectListItem>>('/projects', { params });
    },
    get: async (id: string) => {
      if (IS_PROTOTYPE_MODE) {
        const project = mockStore.getProject(id);
        return { data: project };
      }
      return apiRequest<ApiDataResponse<ProjectDetail>>(`/projects/${id}`);
    },
    create: async (data: {
      name: string;
      description?: string;
      projectManagerId?: string;
    }) => {
      if (IS_PROTOTYPE_MODE) {
        const project = mockStore.createProject(data);
        return { data: project };
      }
      return apiRequest<ApiDataResponse<ProjectDetail>>('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, data: { name?: string; description?: string }) => {
      if (IS_PROTOTYPE_MODE) {
        const project = mockStore.updateProject(id, data);
        return { data: project };
      }
      return apiRequest<ApiDataResponse<ProjectDetail>>(`/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    archive: async (id: string) => {
      if (IS_PROTOTYPE_MODE) {
        const project = mockStore.archiveProject(id);
        return { data: project };
      }
      return apiRequest<ApiDataResponse<ProjectDetail>>(`/projects/${id}/archive`, {
        method: 'POST',
      });
    },
    unarchive: async (id: string) => {
      if (IS_PROTOTYPE_MODE) {
        const project = mockStore.unarchiveProject(id);
        return { data: project };
      }
      return apiRequest<ApiDataResponse<ProjectDetail>>(`/projects/${id}/unarchive`, {
        method: 'POST',
      });
    },
    delete: async (id: string) => {
      if (IS_PROTOTYPE_MODE) {
        mockStore.deleteProject(id);
        return;
      }
      return apiRequest<void>(`/projects/${id}`, { method: 'DELETE' });
    },
  },

  // Members
  members: {
    list: async (projectId: string) => {
      if (IS_PROTOTYPE_MODE) {
        return { data: mockStore.getMembers(projectId) };
      }
      return apiRequest<ApiDataResponse<Member[]>>(`/projects/${projectId}/members`);
    },
    candidates: async (projectId: string, q?: string) => {
      if (IS_PROTOTYPE_MODE) {
        return { data: mockStore.getCandidates(projectId, q) };
      }
      return apiRequest<ApiDataResponse<User[]>>(
        `/projects/${projectId}/member-candidates`,
        { params: { q } }
      );
    },
    add: async (projectId: string, data: { userId: string; role: ProjectRole }) => {
      if (IS_PROTOTYPE_MODE) {
        const m = mockStore.addMember(projectId, data);
        return { data: m };
      }
      return apiRequest<ApiDataResponse<Member>>(`/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    updateRole: async (
      projectId: string,
      userId: string,
      data: { role: ProjectRole }
    ) => {
      if (IS_PROTOTYPE_MODE) {
        const m = mockStore.updateMemberRole(projectId, userId, data.role);
        return { data: m };
      }
      return apiRequest<ApiDataResponse<Member>>(
        `/projects/${projectId}/members/${userId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        }
      );
    },
    remove: async (projectId: string, userId: string) => {
      if (IS_PROTOTYPE_MODE) {
        mockStore.removeMember(projectId, userId);
        return;
      }
      return apiRequest<void>(`/projects/${projectId}/members/${userId}`, {
        method: 'DELETE',
      });
    },
  },

  // Tasks
  tasks: {
    list: async (
      projectId: string,
      params?: {
        page?: number;
        pageSize?: number;
        q?: string;
        status?: TaskStatus;
        priority?: TaskPriority;
        assigneeId?: string;
        sort?: 'createdAt' | 'dueDate' | 'priority' | 'updatedAt';
        order?: 'asc' | 'desc';
      }
    ) => {
      if (IS_PROTOTYPE_MODE) {
        return mockStore.getTasks(projectId, params);
      }
      return apiRequest<ApiListResponse<Task>>(`/projects/${projectId}/tasks`, {
        params,
      });
    },
    listMyTasks: async (params?: {
      page?: number;
      pageSize?: number;
      status?: TaskStatus;
      assignee?: 'me';
    }) => {
      if (IS_PROTOTYPE_MODE) {
        return mockStore.getMyTasks(params?.status);
      }
      return apiRequest<ApiListResponse<Task>>('/tasks', {
        params: { assignee: 'me', ...params },
      });
    },
    get: async (id: string) => {
      if (IS_PROTOTYPE_MODE) {
        return { data: mockStore.getTask(id) };
      }
      return apiRequest<ApiDataResponse<Task>>(`/tasks/${id}`);
    },
    create: async (
      projectId: string,
      data: {
        title: string;
        description?: string;
        status?: TaskStatus;
        priority?: TaskPriority;
        assigneeId?: string | null;
        dueDate?: string | null;
      }
    ) => {
      if (IS_PROTOTYPE_MODE) {
        return { data: mockStore.createTask(projectId, data) };
      }
      return apiRequest<ApiDataResponse<Task>>(`/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (
      id: string,
      data: {
        version: number; // Required for optimistic concurrency!
        title?: string;
        description?: string;
        status?: TaskStatus;
        priority?: TaskPriority;
        assigneeId?: string | null;
        dueDate?: string | null;
      }
    ) => {
      if (IS_PROTOTYPE_MODE) {
        return { data: mockStore.updateTask(id, data) };
      }
      return apiRequest<ApiDataResponse<Task>>(`/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string) => {
      if (IS_PROTOTYPE_MODE) {
        mockStore.deleteTask(id);
        return;
      }
      return apiRequest<void>(`/tasks/${id}`, { method: 'DELETE' });
    },
  },

  // Comments
  comments: {
    list: async (
      taskId: string,
      params?: { page?: number; pageSize?: number }
    ) => {
      if (IS_PROTOTYPE_MODE) {
        return { data: mockStore.getComments(taskId), meta: { page: 1, pageSize: 50, total: 3, totalPages: 1 } };
      }
      return apiRequest<ApiListResponse<Comment>>(`/tasks/${taskId}/comments`, { params });
    },
    create: async (taskId: string, data: { body: string }) => {
      if (IS_PROTOTYPE_MODE) {
        return { data: mockStore.createComment(taskId, data.body) };
      }
      return apiRequest<ApiDataResponse<Comment>>(`/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    delete: async (commentId: string) => {
      if (IS_PROTOTYPE_MODE) {
        mockStore.deleteComment(commentId);
        return;
      }
      return apiRequest<void>(`/comments/${commentId}`, { method: 'DELETE' });
    },
  },

  // Dashboard
  dashboard: {
    get: async () => {
      if (IS_PROTOTYPE_MODE) {
        return { data: mockStore.getDashboard() };
      }
      return apiRequest<ApiDataResponse<DashboardData>>('/dashboard');
    },
  },
};
