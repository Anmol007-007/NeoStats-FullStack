'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { AppLayout } from '@/components/layout/app-layout';
import { ProjectHeader } from '@/components/project/project-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Search,
  CheckSquare,
  Calendar,
  User,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import {
  formatDate,
  getPriorityBadgeStyle,
  getStatusBadgeStyle,
  getStatusLabel,
} from '@/lib/utils';
import { TaskPriority, TaskStatus } from '@/lib/types';
import { toast } from 'sonner';

export default function ProjectTasksPage() {
  const params = useParams();
  const projectId = params.id as string;
  const queryClient = useQueryClient();

  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'createdAt' | 'dueDate' | 'priority' | 'updatedAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState<TaskStatus>('TODO');
  const [newPriority, setNewPriority] = useState<TaskPriority>('MEDIUM');
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [formError, setFormError] = useState('');

  
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await api.projects.get(projectId);
      return res.data;
    },
  });

  
  const { data: members } = useQuery({
    queryKey: ['members', projectId],
    queryFn: async () => {
      const res = await api.members.list(projectId);
      return res.data;
    },
  });

  
  const eligibleAssignees = members?.filter((m) => m.role !== 'VIEWER') || [];

  
  const {
    data: tasksData,
    isLoading: isTasksLoading,
  } = useQuery({
    queryKey: [
      'tasks',
      projectId,
      {
        page,
        q: search || undefined,
        status: statusFilter === 'ALL' ? undefined : (statusFilter as TaskStatus),
        priority: priorityFilter === 'ALL' ? undefined : (priorityFilter as TaskPriority),
        assigneeId: assigneeFilter === 'ALL' ? undefined : assigneeFilter,
        sort: sortField,
        order: sortOrder,
      },
    ],
    queryFn: async () => {
      const res = await api.tasks.list(projectId, {
        page,
        pageSize: 15,
        q: search || undefined,
        status: statusFilter === 'ALL' ? undefined : (statusFilter as TaskStatus),
        priority: priorityFilter === 'ALL' ? undefined : (priorityFilter as TaskPriority),
        assigneeId: assigneeFilter === 'ALL' ? undefined : assigneeFilter,
        sort: sortField,
        order: sortOrder,
      });
      return res;
    },
  });

  
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!newTitle.trim()) {
        throw new Error('Task title is required');
      }
      return api.tasks.create(projectId, {
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        status: newStatus,
        priority: newPriority,
        assigneeId: newAssigneeId || null,
        dueDate: newDueDate || null,
      });
    },
    onSuccess: () => {
      toast.success('Task created successfully!');
      setIsCreateOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewStatus('TODO');
      setNewPriority('MEDIUM');
      setNewAssigneeId('');
      setNewDueDate('');
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      const msg = err instanceof ApiError ? err.message : err.message || 'Failed to create task';
      setFormError(msg);
      toast.error(msg);
    },
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {project && <ProjectHeader project={project} />}

        
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            
            <div className="relative w-full sm:w-80">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            
            {project?.permissions.canCreateTasks && project.status !== 'ARCHIVED' && (
              <Button
                variant="teal"
                size="sm"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Create Task
              </Button>
            )}
          </div>

          
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Filter className="h-3.5 w-3.5" />
              <span>Filters:</span>
            </div>

            
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs cursor-pointer hover:border-slate-300"
            >
              <option value="ALL">All Statuses</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Done</option>
            </select>

            
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs cursor-pointer hover:border-slate-300"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>

            
            <select
              value={assigneeFilter}
              onChange={(e) => {
                setAssigneeFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs cursor-pointer hover:border-slate-300"
            >
              <option value="ALL">All Assignees</option>
              {members?.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </select>

            
            <div className="ml-auto flex items-center gap-2">
              <span className="text-slate-400">Sort:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as any)}
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs cursor-pointer hover:border-slate-300"
              >
                <option value="createdAt">Date Created</option>
                <option value="dueDate">Due Date</option>
                <option value="priority">Priority</option>
                <option value="updatedAt">Last Updated</option>
              </select>

              <button
                onClick={() =>
                  setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                }
                className="h-8 px-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                <ArrowUpDown className="h-3 w-3" />
                <span className="uppercase text-[10px] font-semibold">
                  {sortOrder}
                </span>
              </button>
            </div>
          </div>
        </div>

        
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          {isTasksLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !tasksData?.data?.length ? (
            <div className="text-center py-16">
              <CheckSquare className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800">
                No tasks found
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {search || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
                  ? 'No tasks matched your active filter settings. Try clearing filters.'
                  : 'Get started by creating your first task in this project.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              <div className="grid grid-cols-12 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <div className="col-span-5">Task</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Priority</div>
                <div className="col-span-2">Assignee</div>
                <div className="col-span-1 text-right">Due Date</div>
              </div>

              {tasksData.data.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="grid grid-cols-12 px-4 py-3.5 items-center hover:bg-teal-50/40 transition-colors group text-xs"
                >
                  <div className="col-span-5 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors line-clamp-1">
                        {task.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1 py-0.2 rounded shrink-0">
                        v{task.version}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <span
                      className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${getStatusBadgeStyle(
                        task.status
                      )}`}
                    >
                      {getStatusLabel(task.status)}
                    </span>
                  </div>

                  <div className="col-span-2">
                    <span
                      className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${getPriorityBadgeStyle(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center gap-1.5 text-slate-600 truncate">
                    {task.assignee ? (
                      <>
                        <div className="h-5 w-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {task.assignee.name.charAt(0)}
                        </div>
                        <span className="truncate">{task.assignee.name}</span>
                      </>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </div>

                  <div className="col-span-1 text-right text-[11px] text-slate-500">
                    {formatDate(task.dueDate)}
                  </div>
                </Link>
              ))}
            </div>
          )}

          
          {tasksData?.meta && tasksData.meta.totalPages > 1 && (
            <div className="flex items-center justify-between p-3.5 border-t border-slate-100 bg-slate-50/50">
              <span className="text-xs text-slate-500">
                Page {tasksData.meta.page} of {tasksData.meta.totalPages} ({tasksData.meta.total} tasks)
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
                  disabled={page >= tasksData.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create New Task"
          description="Create a task with priority, status, assignee, and optional due date."
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
              label="Task Title"
              required
              placeholder="e.g. Design authentication modal"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />

            <Textarea
              label="Description (Optional)"
              placeholder="Acceptance criteria, notes, or implementation details..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={3}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </Select>

              <Select
                label="Priority"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Assignee"
                value={newAssigneeId}
                onChange={(e) => setNewAssigneeId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {eligibleAssignees.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </Select>

              <Input
                label="Due Date"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
                Create Task
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
