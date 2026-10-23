'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertOctagon,
  ArrowRight,
  Plus,
  Users,
  Calendar,
} from 'lucide-react';
import {
  formatDate,
  getPriorityBadgeStyle,
  getRoleBadgeStyle,
  getRoleLabel,
  getStatusBadgeStyle,
  getStatusLabel,
} from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();

  const {
    data: dashboardData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.dashboard.get();
      return res.data;
    },
  });

  const totalOpenTasks =
    (dashboardData?.tasksByStatus.TODO || 0) +
    (dashboardData?.tasksByStatus.IN_PROGRESS || 0) +
    (dashboardData?.tasksByStatus.IN_REVIEW || 0);

  return (
    <AppLayout>
      <div className="space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back, {user?.name}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Here is what is happening across your projects today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/projects">
              <Button variant="outline" size="sm">
                <FolderKanban className="h-4 w-4 mr-1.5" />
                All Projects
              </Button>
            </Link>
            {user?.role === 'ADMIN' && (
              <Link href="/projects?create=true">
                <Button variant="teal" size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  New Project
                </Button>
              </Link>
            )}
          </div>
        </div>

        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <Card className="hover:border-slate-300 transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Active Projects
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-14 mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">
                    {dashboardData?.projectCount ?? 0}
                  </h3>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  Projects accessible to you
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center">
                <FolderKanban className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          
          <Card className="hover:border-slate-300 transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Open Tasks
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-14 mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold text-blue-600 mt-1">
                    {totalOpenTasks}
                  </h3>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  Todo, in progress, in review
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          
          <Card className="hover:border-slate-300 transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Completed Tasks
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-14 mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                    {dashboardData?.tasksByStatus.DONE ?? 0}
                  </h3>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  Tasks marked as done
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          
          <Card className="hover:border-slate-300 transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Overdue Tasks
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-14 mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold text-rose-600 mt-1">
                    {dashboardData?.overdueCount ?? 0}
                  </h3>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  Past due date & uncompleted
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
                <AlertOctagon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        
        {dashboardData?.tasksByStatus && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Task Status Breakdown</CardTitle>
              <CardDescription>
                Overview of task flow stages across your projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs font-medium text-slate-500">To Do</div>
                  <div className="text-lg font-bold text-slate-800">
                    {dashboardData.tasksByStatus.TODO}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200">
                  <div className="text-xs font-medium text-blue-600">In Progress</div>
                  <div className="text-lg font-bold text-blue-800">
                    {dashboardData.tasksByStatus.IN_PROGRESS}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200">
                  <div className="text-xs font-medium text-amber-600">In Review</div>
                  <div className="text-lg font-bold text-amber-800">
                    {dashboardData.tasksByStatus.IN_REVIEW}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200">
                  <div className="text-xs font-medium text-emerald-600">Done</div>
                  <div className="text-lg font-bold text-emerald-800">
                    {dashboardData.tasksByStatus.DONE}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm">My Open Tasks</CardTitle>
                <CardDescription>Tasks assigned to you that need action</CardDescription>
              </div>
              <Link
                href="/tasks"
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !dashboardData?.myOpenTasks?.length ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No open tasks assigned to you. You are all caught up!
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {dashboardData.myOpenTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="py-3 flex items-center justify-between hover:bg-slate-50/80 -mx-2 px-2 rounded-lg transition-colors group"
                    >
                      <div className="min-w-0 pr-3">
                        <p className="text-xs font-semibold text-slate-800 group-hover:text-teal-600 transition-colors truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusBadgeStyle(
                              task.status
                            )}`}
                          >
                            {getStatusLabel(task.status)}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border ${getPriorityBadgeStyle(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>
                        </div>
                      </div>
                      {task.dueDate && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                          <Calendar className="h-3 w-3" />
                          {formatDate(task.dueDate)}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm">Recent Projects</CardTitle>
                <CardDescription>Projects you have recently accessed</CardDescription>
              </div>
              <Link
                href="/projects"
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !dashboardData?.recentProjects?.length ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No projects available yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {dashboardData.recentProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="py-3 flex items-center justify-between hover:bg-slate-50/80 -mx-2 px-2 rounded-lg transition-colors group"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-slate-800 group-hover:text-teal-600 transition-colors truncate">
                            {project.name}
                          </p>
                          {project.status === 'ARCHIVED' && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border">
                              Archived
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {project.memberCount} members
                          </span>
                          <span>•</span>
                          <span>{project.taskCount} tasks</span>
                        </div>
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
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
