'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConflictDialog } from '@/components/ui/conflict-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  ArrowLeft,
  MessageSquare,
  Send,
  AlertCircle,
  FolderKanban,
  User as UserIcon,
  ShieldAlert,
} from 'lucide-react';
import {
  formatDate,
  formatDateTime,
  getPriorityBadgeStyle,
  getStatusBadgeStyle,
  getStatusLabel,
} from '@/lib/utils';
import { Task, TaskPriority, TaskStatus } from '@/lib/types';
import { toast } from 'sonner';

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [currentVersion, setCurrentVersion] = useState<number>(1);

  
  const [commentBody, setCommentBody] = useState('');

  
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [conflictServerTask, setConflictServerTask] = useState<Task | null>(null);

  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  
  const {
    data: task,
    isLoading: isTaskLoading,
    error: taskError,
  } = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const res = await api.tasks.get(taskId);
      return res.data;
    },
  });

  
  const { data: members } = useQuery({
    queryKey: ['members', task?.projectId],
    queryFn: async () => {
      if (!task?.projectId) return [];
      const res = await api.members.list(task.projectId);
      return res.data;
    },
    enabled: !!task?.projectId,
  });

  
  const { data: commentsData, isLoading: isCommentsLoading } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: async () => {
      const res = await api.comments.list(taskId, { pageSize: 50 });
      return res.data;
    },
  });

  
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setAssigneeId(task.assignee?.id || '');
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      setCurrentVersion(task.version);
    }
  }, [task]);

  
  const updateMutation = useMutation({
    mutationFn: async (overrideVersion?: number) => {
      const ver = overrideVersion !== undefined ? overrideVersion : currentVersion;
      return api.tasks.update(taskId, {
        version: ver,
        title: task?.permissions.canEdit ? title : undefined,
        description: task?.permissions.canEdit ? description : undefined,
        status: task?.permissions.canChangeStatus ? status : undefined,
        priority: task?.permissions.canEdit ? priority : undefined,
        assigneeId: task?.permissions.canAssign ? (assigneeId || null) : undefined,
        dueDate: task?.permissions.canEdit ? (dueDate || null) : undefined,
      });
    },
    onSuccess: (res) => {
      toast.success(`Task saved successfully! (now v${res.data.version})`);
      setIsConflictOpen(false);
      setConflictServerTask(null);
      setCurrentVersion(res.data.version);
      queryClient.setQueryData(['task', taskId], res.data);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      if (err instanceof ApiError && err.code === 'VERSION_CONFLICT') {
        const latestTask = err.details?.currentTask as Task | undefined;
        if (latestTask) {
          setConflictServerTask(latestTask);
          setIsConflictOpen(true);
          return;
        }
      }
      toast.error(err.message || 'Failed to update task');
    },
  });

  
  const handleLoadLatest = (latestTask: Task) => {
    setTitle(latestTask.title);
    setDescription(latestTask.description || '');
    setStatus(latestTask.status);
    setPriority(latestTask.priority);
    setAssigneeId(latestTask.assignee?.id || '');
    setDueDate(latestTask.dueDate ? latestTask.dueDate.split('T')[0] : '');
    setCurrentVersion(latestTask.version);
    setIsConflictOpen(false);
    queryClient.setQueryData(['task', taskId], latestTask);
    toast.info(`Loaded latest version v${latestTask.version}`);
  };

  
  const handleReapplyChanges = (latestTask: Task) => {
    setCurrentVersion(latestTask.version);
    updateMutation.mutate(latestTask.version);
  };

  
  const deleteMutation = useMutation({
    mutationFn: () => api.tasks.delete(taskId),
    onSuccess: () => {
      toast.success('Task deleted');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (task?.projectId) {
        router.push(`/projects/${task.projectId}/tasks`);
      } else {
        router.push('/dashboard');
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete task');
    },
  });

  
  const addCommentMutation = useMutation({
    mutationFn: (bodyText: string) => api.comments.create(taskId, { body: bodyText }),
    onSuccess: () => {
      setCommentBody('');
      toast.success('Comment posted');
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to post comment');
    },
  });

  
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => api.comments.delete(commentId),
    onSuccess: () => {
      toast.success('Comment deleted');
      setCommentToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete comment');
    },
  });

  if (isTaskLoading) {
    return (
      <AppLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  if (!task) {
    return (
      <AppLayout>
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200 max-w-md mx-auto">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-2" />
          <h2 className="text-base font-semibold text-slate-800">
            Task Not Found or Forbidden
          </h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            You may not have permission to view this task or it may have been deleted.
          </p>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const permissions = task.permissions;
  const isReadOnly = !permissions.canEdit && !permissions.canChangeStatus;
  const eligibleAssignees = members?.filter((m) => m.role !== 'VIEWER') || [];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <Link
            href={`/projects/${task.projectId}/tasks`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Project Tasks
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
              Version v{task.version}
            </span>

            {permissions.canDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete Task
              </Button>
            )}
          </div>
        </div>

        
        <Card className="border border-slate-200 shadow-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate(currentVersion);
            }}
          >
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full border ${getStatusBadgeStyle(
                      status
                    )}`}
                  >
                    {getStatusLabel(status)}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full border ${getPriorityBadgeStyle(
                      priority
                    )}`}
                  >
                    {priority}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Created by {task.createdBy.name} • {formatDate(task.createdAt)}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              
              <div>
                <Input
                  label="Task Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!permissions.canEdit}
                  required
                  className="font-semibold text-base"
                />
              </div>

              
              <div>
                <Textarea
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!permissions.canEdit}
                  rows={4}
                  placeholder={
                    permissions.canEdit
                      ? 'Add task description, steps, or notes...'
                      : 'No description provided.'
                  }
                />
              </div>

              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  disabled={!permissions.canChangeStatus}
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Done</option>
                </Select>

                <Select
                  label="Priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  disabled={!permissions.canEdit}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </Select>
              </div>

              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Assignee"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  disabled={!permissions.canAssign}
                  helperText={
                    !permissions.canAssign
                      ? 'Only Admin and Project Managers may reassign tasks.'
                      : undefined
                  }
                >
                  <option value="">Unassigned</option>
                  {eligibleAssignees.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </Select>

                <Input
                  label="Due Date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={!permissions.canEdit}
                />
              </div>

              
              {!isReadOnly && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      toast.info('Simulating concurrent update conflict with version mismatch...');
                      updateMutation.mutate(currentVersion - 1);
                    }}
                    className="text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Intentionally submits an outdated version to demo optimistic locking and conflict resolution"
                  >
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                    Simulate 409 Conflict (Demo)
                  </button>

                  <Button
                    type="submit"
                    variant="teal"
                    size="md"
                    isLoading={updateMutation.isPending}
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </CardContent>
          </form>
        </Card>

        
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-teal-600" />
              Activity & Comments ({commentsData?.length || 0})
            </CardTitle>
            <CardDescription>
              Collaborate and post updates on this task
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!commentBody.trim()) return;
                addCommentMutation.mutate(commentBody.trim());
              }}
              className="space-y-2"
            >
              <Textarea
                placeholder="Write a comment..."
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                rows={2}
                disabled={addCommentMutation.isPending}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!commentBody.trim()}
                  isLoading={addCommentMutation.isPending}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Post Comment
                </Button>
              </div>
            </form>

            
            <div className="space-y-3 pt-2">
              {isCommentsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !commentsData?.length ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  No comments yet. Start the conversation!
                </p>
              ) : (
                commentsData.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5 transition-all hover:border-slate-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center">
                          {comment.author.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-800">
                          {comment.author.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>

                      {comment.canDelete && (
                        <button
                          type="button"
                          onClick={() => setCommentToDelete(comment.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Delete comment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="text-slate-700 whitespace-pre-wrap pl-8">
                      {comment.body}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        
        <ConflictDialog
          isOpen={isConflictOpen}
          onClose={() => setIsConflictOpen(false)}
          currentTask={conflictServerTask}
          myDraft={{
            title,
            description,
            status,
            priority,
            dueDate,
            assigneeId,
          }}
          onLoadLatest={handleLoadLatest}
          onReapplyChanges={handleReapplyChanges}
          isReapplying={updateMutation.isPending}
        />

        
        <ConfirmDialog
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={() => deleteMutation.mutate()}
          title="Delete Task"
          message="Are you sure you want to permanently delete this task? All comments associated with this task will also be deleted."
          confirmText="Delete Task"
          isLoading={deleteMutation.isPending}
        />

        
        <ConfirmDialog
          isOpen={!!commentToDelete}
          onClose={() => setCommentToDelete(null)}
          onConfirm={() =>
            commentToDelete && deleteCommentMutation.mutate(commentToDelete)
          }
          title="Delete Comment"
          message="Are you sure you want to delete this comment? This action cannot be undone."
          confirmText="Delete"
          isLoading={deleteCommentMutation.isPending}
        />
      </div>
    </AppLayout>
  );
}
