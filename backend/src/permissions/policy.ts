import { GlobalRole, ProjectRole } from '../types/index.js';

export interface ActorContext {
  id: string;
  role: GlobalRole;
  isActive: boolean;
}

export function canAccessProject(
  actor: ActorContext,
  membershipRole: ProjectRole | null
): boolean {
  if (actor.role === 'ADMIN') return true;
  return membershipRole !== null;
}

export function canEditProject(
  actor: ActorContext,
  isArchived: boolean,
  membershipRole: ProjectRole | null
): boolean {
  if (isArchived) return false;
  return actor.role === 'ADMIN' || membershipRole === 'PROJECT_MANAGER';
}

export function canArchiveProject(
  actor: ActorContext,
  membershipRole: ProjectRole | null
): boolean {
  return actor.role === 'ADMIN' || membershipRole === 'PROJECT_MANAGER';
}

export function canDeleteProject(actor: ActorContext): boolean {
  return actor.role === 'ADMIN';
}

export function canManageMembers(
  actor: ActorContext,
  isArchived: boolean,
  membershipRole: ProjectRole | null
): boolean {
  if (isArchived) return false;
  return actor.role === 'ADMIN' || membershipRole === 'PROJECT_MANAGER';
}

export function canManageProjectManagers(
  actor: ActorContext,
  isArchived: boolean
): boolean {
  if (isArchived) return false;
  
  return actor.role === 'ADMIN';
}

export function canCreateTask(
  actor: ActorContext,
  isArchived: boolean,
  membershipRole: ProjectRole | null
): boolean {
  if (isArchived) return false;
  return actor.role === 'ADMIN' || membershipRole === 'PROJECT_MANAGER';
}

export function canEditTask(
  actor: ActorContext,
  isArchived: boolean,
  membershipRole: ProjectRole | null,
  taskAssigneeId: string | null
): boolean {
  if (isArchived) return false;
  if (actor.role === 'ADMIN' || membershipRole === 'PROJECT_MANAGER') return true;
  if (membershipRole === 'TEAM_MEMBER' && taskAssigneeId === actor.id) return true;
  return false;
}

export function canChangeTaskStatus(
  actor: ActorContext,
  isArchived: boolean,
  membershipRole: ProjectRole | null,
  taskAssigneeId: string | null
): boolean {
  if (isArchived) return false;
  if (actor.role === 'ADMIN' || membershipRole === 'PROJECT_MANAGER') return true;
  if (membershipRole === 'TEAM_MEMBER' && taskAssigneeId === actor.id) return true;
  return false;
}

export function canAssignTask(
  actor: ActorContext,
  isArchived: boolean,
  membershipRole: ProjectRole | null
): boolean {
  if (isArchived) return false;
  return actor.role === 'ADMIN' || membershipRole === 'PROJECT_MANAGER';
}

export function canDeleteTask(
  actor: ActorContext,
  isArchived: boolean,
  membershipRole: ProjectRole | null
): boolean {
  if (isArchived) return false;
  return actor.role === 'ADMIN' || membershipRole === 'PROJECT_MANAGER';
}

export function canCreateComment(
  actor: ActorContext,
  isArchived: boolean,
  membershipRole: ProjectRole | null
): boolean {
  if (isArchived) return false;
  if (actor.role === 'ADMIN') return true;
  return membershipRole === 'PROJECT_MANAGER' || membershipRole === 'TEAM_MEMBER';
}

export function canDeleteComment(
  actor: ActorContext,
  membershipRole: ProjectRole | null,
  commentAuthorId: string
): boolean {
  if (actor.role === 'ADMIN') return true;
  if (membershipRole === 'PROJECT_MANAGER') return true;
  return commentAuthorId === actor.id;
}
