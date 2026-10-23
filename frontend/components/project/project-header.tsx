'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ProjectDetail } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Archive,
  ArchiveRestore,
  Trash2,
  Edit3,
  Layers,
  CheckSquare,
  Users,
  Info,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getRoleBadgeStyle, getRoleLabel } from '@/lib/utils';

interface ProjectHeaderProps {
  project: ProjectDetail;
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editDesc, setEditDesc] = useState(project.description || '');

  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [isUnarchiveConfirmOpen, setIsUnarchiveConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  
  const editMutation = useMutation({
    mutationFn: () =>
      api.projects.update(project.id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Project updated');
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update project');
    },
  });

  
  const archiveMutation = useMutation({
    mutationFn: () => api.projects.archive(project.id),
    onSuccess: () => {
      toast.success('Project archived');
      setIsArchiveConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to archive project');
    },
  });

  
  const unarchiveMutation = useMutation({
    mutationFn: () => api.projects.unarchive(project.id),
    onSuccess: () => {
      toast.success('Project unarchived');
      setIsUnarchiveConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to unarchive project');
    },
  });

  
  const deleteMutation = useMutation({
    mutationFn: () => api.projects.delete(project.id),
    onSuccess: () => {
      toast.success('Project deleted');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.push('/projects');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete project');
    },
  });

  const tabs = [
    {
      name: 'Overview',
      href: `/projects/${project.id}`,
      icon: Info,
      active: pathname === `/projects/${project.id}`,
    },
    {
      name: 'Tasks',
      href: `/projects/${project.id}/tasks`,
      icon: CheckSquare,
      active: pathname === `/projects/${project.id}/tasks`,
    },
    {
      name: 'Team',
      href: `/projects/${project.id}/team`,
      icon: Users,
      active: pathname === `/projects/${project.id}/team`,
    },
  ];

  return (
    <div className="space-y-4">
      
      {project.status === 'ARCHIVED' && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Archived Project:</strong> This workspace is in read-only
              mode. Modifying tasks, comments, and members is restricted.
            </span>
          </div>
          {project.permissions.canArchive && (
            <Button
              variant="outline"
              size="sm"
              className="bg-white text-xs h-7"
              onClick={() => setIsUnarchiveConfirmOpen(true)}
            >
              <ArchiveRestore className="h-3 w-3 mr-1" />
              Unarchive
            </Button>
          )}
        </div>
      )}

      
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {project.name}
              </h1>
              {project.status === 'ARCHIVED' ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-700 font-medium">
                  Archived
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                  Active
                </span>
              )}
              {project.myRole && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getRoleBadgeStyle(
                    project.myRole
                  )}`}
                >
                  My Role: {getRoleLabel(project.myRole)}
                </span>
              )}
            </div>

            {project.description && (
              <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          
          <div className="flex items-center gap-2 flex-wrap">
            {project.permissions.canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditName(project.name);
                  setEditDesc(project.description || '');
                  setIsEditOpen(true);
                }}
              >
                <Edit3 className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            )}

            {project.permissions.canArchive &&
              (project.status === 'ACTIVE' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsArchiveConfirmOpen(true)}
                >
                  <Archive className="h-3.5 w-3.5 mr-1 text-slate-500" />
                  Archive
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUnarchiveConfirmOpen(true)}
                >
                  <ArchiveRestore className="h-3.5 w-3.5 mr-1 text-teal-600" />
                  Unarchive
                </Button>
              ))}

            {project.permissions.canDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsDeleteConfirmOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>

        
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  tab.active
                    ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 ${
                    tab.active ? 'text-teal-600' : 'text-slate-400'
                  }`}
                />
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Project Details"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            editMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Project Name"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <Textarea
            label="Description"
            rows={3}
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="teal"
              size="sm"
              isLoading={editMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      
      <ConfirmDialog
        isOpen={isArchiveConfirmOpen}
        onClose={() => setIsArchiveConfirmOpen(false)}
        onConfirm={() => archiveMutation.mutate()}
        title="Archive Project"
        message="Archiving will make this project read-only. Tasks and comments cannot be modified until it is unarchived."
        confirmText="Archive Project"
        isLoading={archiveMutation.isPending}
      />

      
      <ConfirmDialog
        isOpen={isUnarchiveConfirmOpen}
        onClose={() => setIsUnarchiveConfirmOpen(false)}
        onConfirm={() => unarchiveMutation.mutate()}
        title="Unarchive Project"
        message="Unarchiving will restore full editing and task management permissions."
        confirmText="Unarchive Project"
        variant="primary"
        isLoading={unarchiveMutation.isPending}
      />

      
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Project Permanently"
        message="Are you sure you want to delete this project? This will permanently delete all tasks, comments, and member assignments. This action cannot be undone."
        confirmText="Delete Project"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
