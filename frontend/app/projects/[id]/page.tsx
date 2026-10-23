'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AppLayout } from '@/components/layout/app-layout';
import { ProjectHeader } from '@/components/project/project-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  CheckSquare,
  Users,
  Calendar,
  Clock,
  ArrowRight,
  Plus,
} from 'lucide-react';
import {
  formatDate,
  getPriorityBadgeStyle,
  getRoleBadgeStyle,
  getRoleLabel,
  getStatusBadgeStyle,
  getStatusLabel,
} from '@/lib/utils';

export default function ProjectOverviewPage() {
  const params = useParams();
  const projectId = params.id as string;

  // Project details
  const { data: project, isLoading: isProjectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await api.projects.get(projectId);
      return res.data;
    },
  });

  // Project tasks
  const { data: tasksData, isLoading: isTasksLoading } = useQuery({
    queryKey: ['tasks', projectId, { pageSize: 5 }],
    queryFn: async () => {
      const res = await api.tasks.list(projectId, { pageSize: 5 });
      return res;
    },
  });

  // Project members
  const { data: members, isLoading: isMembersLoading } = useQuery({
    queryKey: ['members', projectId],
    queryFn: async () => {
      const res = await api.members.list(projectId);
      return res.data;
    },
  });

  if (isProjectLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-44 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">
            Project not found or access denied
          </h2>
          <Link href="/projects" className="mt-3 inline-block">
            <Button variant="outline" size="sm">
              Back to Projects
            </Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <ProjectHeader project={project} />

        {/* Project Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Tasks
                </p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  {tasksData?.meta.total ?? project.taskCount}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tasks in this workspace
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center">
                <CheckSquare className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Team Members
                </p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  {members?.length ?? project.memberCount}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Collaborators on board
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Created On
                </p>
                <h3 className="text-sm font-bold text-slate-800 mt-2">
                  {formatDate(project.createdAt)}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Last updated {formatDate(project.updatedAt)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two Columns: Recent Tasks & Team Members */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm">Recent Tasks</CardTitle>
                <CardDescription>Latest tasks created in this project</CardDescription>
              </div>
              <Link
                href={`/projects/${project.id}/tasks`}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                View all tasks <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {isTasksLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !tasksData?.data?.length ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No tasks created yet in this project.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tasksData.data.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="py-3 flex items-center justify-between hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors group"
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
                      {task.assignee ? (
                        <div className="text-[11px] text-slate-500 font-medium shrink-0">
                          {task.assignee.name}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic shrink-0">
                          Unassigned
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Roster Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm">Project Team</CardTitle>
                <CardDescription>Collaborators assigned to this workspace</CardDescription>
              </div>
              <Link
                href={`/projects/${project.id}/team`}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                Manage team <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {isMembersLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !members?.length ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No team members added yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {members.map((member) => (
                    <div
                      key={member.userId}
                      className="py-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center text-xs font-bold">
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">
                            {member.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(
                          member.role
                        )}`}
                      >
                        {getRoleLabel(member.role)}
                      </span>
                    </div>
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
