'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckSquare,
  Calendar,
  FolderKanban,
  Filter,
} from 'lucide-react';
import {
  formatDate,
  getPriorityBadgeStyle,
  getStatusBadgeStyle,
  getStatusLabel,
} from '@/lib/utils';
import { TaskStatus } from '@/lib/types';

export default function MyTasksPage() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', 'my', { page, status: statusFilter === 'ALL' ? undefined : (statusFilter as TaskStatus) }],
    queryFn: async () => {
      const res = await api.tasks.listMyTasks({
        page,
        pageSize: 15,
        status: statusFilter === 'ALL' ? undefined : (statusFilter as TaskStatus),
      });
      return res;
    },
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My Tasks
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            All tasks currently assigned to you across your active projects.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs w-fit">
          <div className="flex items-center gap-1 text-slate-400 mr-2 text-xs font-medium pl-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Status:</span>
          </div>
          {(['ALL', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const).map(
            (status) => (
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
                {status === 'ALL'
                  ? 'All'
                  : getStatusLabel(status as TaskStatus)}
              </button>
            )
          )}
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !tasksData?.data?.length ? (
            <div className="text-center py-16">
              <CheckSquare className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800">
                No tasks assigned to you
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {statusFilter !== 'ALL'
                  ? 'No tasks found matching this status filter.'
                  : 'You have no open tasks assigned.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              <div className="grid grid-cols-12 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <div className="col-span-6">Task Title</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Priority</div>
                <div className="col-span-2 text-right">Due Date</div>
              </div>

              {tasksData.data.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="grid grid-cols-12 px-4 py-3.5 items-center hover:bg-teal-50/40 transition-colors group text-xs"
                >
                  <div className="col-span-6 pr-4">
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

                  <div className="col-span-2 text-right text-[11px] text-slate-500">
                    {formatDate(task.dueDate)}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
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
      </div>
    </AppLayout>
  );
}
