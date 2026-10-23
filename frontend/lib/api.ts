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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

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

  const token = typeof window !== 'undefined' ? localStorage.getItem('taskflow_token') : null;
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

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

// ----------------- Production API Endpoints -----------------

export const api = {
  // Auth
  auth: {
    login: async (credentials: { email: string; password: string }) => {
      return apiRequest<ApiDataResponse<User> & { token?: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    },
    signup: async (data: { name: string; email: string; password: string; role?: string }) => {
      return apiRequest<ApiDataResponse<User> & { token?: string }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    logout: async () => {
      return apiRequest<void>('/auth/logout', { method: 'POST' });
    },
    getMe: async () => {
      return apiRequest<ApiDataResponse<User>>('/auth/me');
    },
    updateMe: async (data: { name: string }) => {
      return apiRequest<ApiDataResponse<User>>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    changePassword: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest<void>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
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
      return apiRequest<ApiListResponse<User>>('/users', { params });
    },
    get: async (id: string) => {
      return apiRequest<ApiDataResponse<User>>(`/users/${id}`);
    },
    create: async (data: {
      name: string;
      email: string;
      password: string;
      role: any;
    }) => {
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
      return apiRequest<ApiDataResponse<User>>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    deactivate: async (id: string) => {
      return apiRequest<ApiDataResponse<User>>(`/users/${id}/deactivate`, {
        method: 'POST',
      });
    },
    activate: async (id: string) => {
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
      return apiRequest<ApiListResponse<ProjectListItem>>('/projects', { params });
    },
    get: async (id: string) => {
      return apiRequest<ApiDataResponse<ProjectDetail>>(`/projects/${id}`);
    },
    create: async (data: {
      name: string;
      description?: string;
      projectManagerId?: string;
    }) => {
      return apiRequest<ApiDataResponse<ProjectDetail>>('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, data: { name?: string; description?: string }) => {
      return apiRequest<ApiDataResponse<ProjectDetail>>(`/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    archive: async (id: string) => {
      return apiRequest<ApiDataResponse<ProjectDetail>>(`/projects/${id}/archive`, {
        method: 'POST',
      });
    },
    unarchive: async (id: string) => {
      return apiRequest<ApiDataResponse<ProjectDetail>>(`/projects/${id}/unarchive`, {
        method: 'POST',
      });
    },
    delete: async (id: string) => {
      return apiRequest<void>(`/projects/${id}`, { method: 'DELETE' });
    },
  },

  // Members
  members: {
    list: async (projectId: string) => {
      return apiRequest<ApiDataResponse<Member[]>>(`/projects/${projectId}/members`);
    },
    candidates: async (projectId: string, q?: string) => {
      return apiRequest<ApiDataResponse<User[]>>(
        `/projects/${projectId}/member-candidates`,
        { params: { q } }
      );
    },
    add: async (projectId: string, data: { userId: string; role: ProjectRole }) => {
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
      return apiRequest<ApiDataResponse<Member>>(
        `/projects/${projectId}/members/${userId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        }
      );
    },
    remove: async (projectId: string, userId: string) => {
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
      return apiRequest<ApiListResponse<Task>>('/tasks', {
        params: { assignee: 'me', ...params },
      });
    },
    get: async (id: string) => {
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
      return apiRequest<ApiDataResponse<Task>>(`/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (
      id: string,
      data: {
        version: number;
        title?: string;
        description?: string;
        status?: TaskStatus;
        priority?: TaskPriority;
        assigneeId?: string | null;
        dueDate?: string | null;
      }
    ) => {
      return apiRequest<ApiDataResponse<Task>>(`/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string) => {
      return apiRequest<void>(`/tasks/${id}`, { method: 'DELETE' });
    },
  },

  // Comments
  comments: {
    list: async (
      taskId: string,
      params?: { page?: number; pageSize?: number }
    ) => {
      return apiRequest<ApiListResponse<Comment>>(`/tasks/${taskId}/comments`, { params });
    },
    create: async (taskId: string, data: { body: string }) => {
      return apiRequest<ApiDataResponse<Comment>>(`/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    delete: async (commentId: string) => {
      return apiRequest<void>(`/comments/${commentId}`, { method: 'DELETE' });
    },
  },

  // Dashboard
  dashboard: {
    get: async () => {
      return apiRequest<ApiDataResponse<DashboardData>>('/dashboard');
    },
  },
};
