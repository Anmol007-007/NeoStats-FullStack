'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/app-layout';
import { ProjectHeader } from '@/components/project/project-header';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  UserPlus,
  Trash2,
  Search,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import {
  formatDate,
  getRoleBadgeStyle,
  getRoleLabel,
} from '@/lib/utils';
import { Member, ProjectRole, User } from '@/lib/types';
import { toast } from 'sonner';

export default function ProjectTeamPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('TEAM_MEMBER');
  const [addError, setAddError] = useState('');

  
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await api.projects.get(projectId);
      return res.data;
    },
  });

  
  const { data: members, isLoading: isMembersLoading } = useQuery({
    queryKey: ['members', projectId],
    queryFn: async () => {
      const res = await api.members.list(projectId);
      return res.data;
    },
  });

  
  const { data: candidates, isLoading: isCandidatesLoading } = useQuery({
    queryKey: ['memberCandidates', projectId, candidateSearch],
    queryFn: async () => {
      const res = await api.members.candidates(projectId, candidateSearch || undefined);
      return res.data;
    },
    enabled: isAddOpen,
  });

  
  const addMutation = useMutation({
    mutationFn: () => {
      if (!selectedUserId) {
        throw new Error('Please select a user');
      }
      return api.members.add(projectId, {
        userId: selectedUserId,
        role: selectedRole,
      });
    },
    onSuccess: () => {
      toast.success('Member added to project');
      setIsAddOpen(false);
      setSelectedUserId('');
      setSelectedRole('TEAM_MEMBER');
      setAddError('');
      queryClient.invalidateQueries({ queryKey: ['members', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (err: any) => {
      const msg = err instanceof ApiError ? err.message : err.message || 'Failed to add member';
      setAddError(msg);
      toast.error(msg);
    },
  });

  
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ProjectRole }) =>
      api.members.updateRole(projectId, userId, { role }),
    onSuccess: () => {
      toast.success('Member role updated');
      queryClient.invalidateQueries({ queryKey: ['members', projectId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update member role');
    },
  });

  
  const removeMutation = useMutation({
    mutationFn: (userId: string) => api.members.remove(projectId, userId),
    onSuccess: () => {
      toast.success('Member removed and their tasks unassigned');
      setMemberToRemove(null);
      queryClient.invalidateQueries({ queryKey: ['members', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to remove member');
    },
  });

  const canManageMembers = project?.permissions.canManageMembers && project.status !== 'ARCHIVED';
  const canManagePM = project?.permissions.canManageProjectManagers && project.status !== 'ARCHIVED';

  return (
    <AppLayout>
      <div className="space-y-6">
        {project && <ProjectHeader project={project} />}

        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Project Members ({members?.length || 0})
            </h2>
            <p className="text-xs text-slate-500">
              Team members collaborate on tasks and discussions.
            </p>
          </div>

          {canManageMembers && (
            <Button
              variant="teal"
              size="sm"
              onClick={() => setIsAddOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              Add Member
            </Button>
          )}
        </div>

        
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          {isMembersLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !members?.length ? (
            <div className="text-center py-16">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800">
                No members found
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Add team members to start assigning tasks.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              <div className="grid grid-cols-12 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <div className="col-span-4">Member</div>
                <div className="col-span-3">Global Role</div>
                <div className="col-span-3">Project Role</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {members.map((member) => (
                <div
                  key={member.userId}
                  className="grid grid-cols-12 px-4 py-3.5 items-center hover:bg-slate-50/50 transition-colors text-xs"
                >
                  
                  <div className="col-span-4 flex items-center gap-2.5 pr-2">
                    <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {member.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">
                        {member.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  
                  <div className="col-span-3">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(
                        member.globalRole
                      )}`}
                    >
                      {getRoleLabel(member.globalRole)}
                    </span>
                  </div>

                  
                  <div className="col-span-3">
                    {canManageMembers ? (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          updateRoleMutation.mutate({
                            userId: member.userId,
                            role: e.target.value as ProjectRole,
                          })
                        }
                        disabled={
                          
                          (!canManagePM && member.role === 'PROJECT_MANAGER') ||
                          updateRoleMutation.isPending
                        }
                        className="h-8 px-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white cursor-pointer hover:border-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {canManagePM && (
                          <option value="PROJECT_MANAGER">
                            Project Manager
                          </option>
                        )}
                        <option value="TEAM_MEMBER">Team Member</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    ) : (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(
                          member.role
                        )}`}
                      >
                        {getRoleLabel(member.role)}
                      </span>
                    )}
                  </div>

                  
                  <div className="col-span-2 text-right">
                    {canManageMembers && (
                      <button
                        onClick={() => setMemberToRemove(member)}
                        disabled={
                          
                          !canManagePM && member.role === 'PROJECT_MANAGER'
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title={
                          !canManagePM && member.role === 'PROJECT_MANAGER'
                            ? 'Only Admin can remove a Project Manager'
                            : 'Remove member'
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        
        <Modal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title="Add Team Member"
          description="Select an active user and assign their role in this project."
        >
          <div className="space-y-4">
            {addError && (
              <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                {addError}
              </div>
            )}

            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Search Users
              </label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter users by name or email..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Select Candidate
              </label>
              <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                {isCandidatesLoading ? (
                  <div className="p-3 text-xs text-slate-400 text-center">
                    Loading users...
                  </div>
                ) : !candidates?.length ? (
                  <div className="p-3 text-xs text-slate-400 text-center">
                    No available candidates found.
                  </div>
                ) : (
                  candidates.map((cand) => (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => setSelectedUserId(cand.id)}
                      className={`w-full p-2.5 text-left flex items-center justify-between transition-colors text-xs cursor-pointer ${
                        selectedUserId === cand.id
                          ? 'bg-teal-50 border-l-3 border-teal-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-slate-800">
                          {cand.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {cand.email}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(
                          cand.role
                        )}`}
                      >
                        {getRoleLabel(cand.role)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            
            <Select
              label="Project Role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
            >
              {canManagePM && (
                <option value="PROJECT_MANAGER">Project Manager</option>
              )}
              <option value="TEAM_MEMBER">Team Member</option>
              <option value="VIEWER">Viewer</option>
            </Select>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="teal"
                size="sm"
                disabled={!selectedUserId}
                isLoading={addMutation.isPending}
                onClick={() => addMutation.mutate()}
              >
                Add Member
              </Button>
            </div>
          </div>
        </Modal>

        
        <ConfirmDialog
          isOpen={!!memberToRemove}
          onClose={() => setMemberToRemove(null)}
          onConfirm={() =>
            memberToRemove && removeMutation.mutate(memberToRemove.userId)
          }
          title="Remove Member"
          message={`Are you sure you want to remove ${memberToRemove?.name}? In accordance with business rules, removing a member automatically unassigns all of their tasks in this project.`}
          confirmText="Remove and Unassign Tasks"
          isLoading={removeMutation.isPending}
        />
      </div>
    </AppLayout>
  );
}
