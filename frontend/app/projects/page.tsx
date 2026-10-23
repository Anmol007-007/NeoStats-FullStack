'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FolderKanban,
  Plus,
  Search,
  Users,
  CheckSquare,
  ArrowRight,
  Archive,
  Layers,
} from 'lucide-react';
import {
  formatDate,
  getRoleBadgeStyle,
  getRoleLabel,
} from '@/lib/utils';
import { ProjectStatus } from '@/lib/types';
import { toast } from 'sonner';

export default function ProjectsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProjectStatus>('ALL');
  const [page, setPage] = useState(1);

  // New Project modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectPmId, setNewProjectPmId] = useState('');
  const [formError, setFormError] = useState('');

  // Fetch projects
  const {
    data: projectsData,
    isLoading,
    isPlaceholderData,
  } = useQuery({
    queryKey: ['projects', { page, q: search, status: statusFilter === 'ALL' ? undefined : statusFilter }],
    queryFn: async () => {
      const res = await api.projects.list({
        page,
        pageSize: 12,
        q: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      return res;
    },
  });

  // Fetch PM candidates for the initial PM selector (Admin only)
  const { data: pmUsers } = useQuery({
    queryKey: ['users', { role: 'PROJECT_MANAGER', isActive: true }],
    queryFn: async () => {
      if (user?.role !== 'ADMIN') return [];
      const res = await api.users.list({
        role: 'PROJECT_MANAGER',
        isActive: true,
        pageSize: 50,
      });
      return res.data;
    },
    enabled: user?.role === 'ADMIN' && isCreateOpen,
  });

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!newProjectName.trim()) {
        throw new Error('Project name is required');
      }
      return api.projects.create({
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || undefined,
        projectManagerId: newProjectPmId || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Project created successfully!');
      setIsCreateOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
      setNewProjectPmId('');
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      const msg = err instanceof ApiError ? err.message : err.message || 'Failed to create project';
      setFormError(msg);
      toast.error(msg);
    },
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header and Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Projects
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {user?.role === 'ADMIN'
                ? 'All projects across the organization'
                : 'Projects you are an active member of'}
            </p>
          </div>

          {user?.role === 'ADMIN' && (
            <Button
              variant="teal"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Project
            </Button>
          )}
        </div>

        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {(['ALL', 'ACTIVE', 'ARCHIVED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === status
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Project Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : !projectsData?.data?.length ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200/80">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FolderKanban className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">
              No projects found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search
                ? `No projects matched "${search}". Try adjusting your search or filters.`
                : 'No projects available. Admins can create new projects anytime.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectsData.data.map((project) => (
              <Card
                key={project.id}
                className="hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-base font-bold text-slate-900 group-hover:text-teal-600 transition-colors line-clamp-1"
                    >
                      {project.name}
                    </Link>
                    {project.status === 'ARCHIVED' && (
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-300 flex items-center gap-1 shrink-0">
                        <Archive className="h-3 w-3" />
                        Archived
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px]">
                    {project.description || 'No description provided.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {project.memberCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckSquare className="h-3.5 w-3.5 text-slate-400" />
                        {project.taskCount}
                      </span>
                    </div>

                    {project.myRole && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(
                          project.myRole
                        )}`}
                      >
                        {getRoleLabel(project.myRole)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/projects/${project.id}/tasks`}
                      className="font-medium text-slate-600 hover:text-teal-600 transition-colors"
                    >
                      Tasks
                    </Link>
                    <span className="text-slate-300">•</span>
                    <Link
                      href={`/projects/${project.id}/team`}
                      className="font-medium text-slate-600 hover:text-teal-600 transition-colors"
                    >
                      Team
                    </Link>
                  </div>
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 transition-colors"
                  >
                    Details <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination controls */}
        {projectsData?.meta && projectsData.meta.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <span className="text-xs text-slate-500">
              Showing page {projectsData.meta.page} of {projectsData.meta.totalPages} ({projectsData.meta.total} total)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= projectsData.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Create Project Modal (Admin Only) */}
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create New Project"
          description="Create a workspace project and optionally assign an initial Project Manager."
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="space-y-4"
          >
            {formError && (
              <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                {formError}
              </div>
            )}

            <Input
              label="Project Name"
              required
              placeholder="e.g. Website Redesign"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />

            <Textarea
              label="Description (Optional)"
              placeholder="Brief summary of the project goals..."
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              rows={3}
            />

            <Select
              label="Initial Project Manager (Optional)"
              value={newProjectPmId}
              onChange={(e) => setNewProjectPmId(e.target.value)}
            >
              <option value="">No initial Project Manager</option>
              {pmUsers?.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {pm.name} ({pm.email})
                </option>
              ))}
            </Select>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="teal"
                size="sm"
                isLoading={createMutation.isPending}
              >
                Create Project
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
