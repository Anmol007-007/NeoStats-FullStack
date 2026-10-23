import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GlobalRole, ProjectRole, TaskPriority, TaskStatus } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function getStatusBadgeStyle(status: TaskStatus) {
  switch (status) {
    case 'TODO':
      return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    case 'IN_PROGRESS':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
    case 'IN_REVIEW':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
    case 'DONE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
    default:
      return 'bg-zinc-100 text-zinc-700 border-zinc-200';
  }
}

export function getStatusLabel(status: TaskStatus) {
  switch (status) {
    case 'TODO':
      return 'To Do';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'IN_REVIEW':
      return 'In Review';
    case 'DONE':
      return 'Done';
    default:
      return status;
  }
}

export function getPriorityBadgeStyle(priority: TaskPriority) {
  switch (priority) {
    case 'LOW':
      return 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
    case 'MEDIUM':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800';
    case 'HIGH':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
    case 'URGENT':
      return 'bg-rose-50 text-rose-700 border-rose-200 font-semibold dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 animate-pulse';
    default:
      return 'bg-zinc-100 text-zinc-700 border-zinc-200';
  }
}

export function getRoleBadgeStyle(role: GlobalRole | ProjectRole | string | null | undefined) {
  switch (role) {
    case 'ADMIN':
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
    case 'PROJECT_MANAGER':
      return 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800';
    case 'TEAM_MEMBER':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
    case 'VIEWER':
      return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
    default:
      return 'bg-zinc-100 text-zinc-700 border-zinc-200';
  }
}

export function getRoleLabel(role: GlobalRole | ProjectRole | string | null | undefined) {
  switch (role) {
    case 'ADMIN':
      return 'Admin';
    case 'PROJECT_MANAGER':
      return 'Project Manager';
    case 'TEAM_MEMBER':
      return 'Team Member';
    case 'VIEWER':
      return 'Viewer';
    default:
      return role || 'Member';
  }
}
