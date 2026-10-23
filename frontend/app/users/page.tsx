'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  UserPlus,
  Search,
  UserCheck,
  UserX,
  Edit,
  Shield,
  Filter,
} from 'lucide-react';
import {
  formatDate,
  getRoleBadgeStyle,
  getRoleLabel,
} from '@/lib/utils';
import { GlobalRole, User } from '@/lib/types';
import { toast } from 'sonner';

export default function UsersManagementPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<GlobalRole>('TEAM_MEMBER');
  const [createError, setCreateError] = useState('');

  // Edit Modal State
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<GlobalRole>('TEAM_MEMBER');
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState('');

  // Deactivate/Activate Confirm State
  const [userToToggleStatus, setUserToToggleStatus] = useState<User | null>(null);

  // Check admin access
  const isAdmin = currentUser?.role === 'ADMIN';

  // Fetch users list
  const {
    data: usersData,
    isLoading,
  } = useQuery({
    queryKey: [
      'users',
      {
        page,
        q: search || undefined,
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        isActive:
          statusFilter === 'ALL'
            ? undefined
            : statusFilter === 'ACTIVE'
            ? true
            : false,
      },
    ],
    queryFn: async () => {
      const res = await api.users.list({
        page,
        pageSize: 15,
        q: search || undefined,
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        isActive:
          statusFilter === 'ALL'
            ? undefined
            : statusFilter === 'ACTIVE'
            ? true
            : false,
      });
      return res;
    },
    enabled: isAdmin,
  });

  // Create User Mutation
  const createMutation = useMutation({
    mutationFn: () =>
      api.users.create({
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
        role: newRole,
      }),
    onSuccess: () => {
      toast.success('User created successfully');
      setIsCreateOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('TEAM_MEMBER');
      setCreateError('');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      const msg = err instanceof ApiError ? err.message : err.message || 'Failed to create user';
      setCreateError(msg);
      toast.error(msg);
    },
  });

  // Edit User Mutation
  const editMutation = useMutation({
    mutationFn: () => {
      if (!userToEdit) throw new Error('No user selected');
      return api.users.update(userToEdit.id, {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        role: editRole,
        password: editPassword || undefined,
      });
    },
    onSuccess: () => {
      toast.success('User updated successfully');
      setUserToEdit(null);
      setEditError('');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      const msg = err instanceof ApiError ? err.message : err.message || 'Failed to update user';
      setEditError(msg);
      toast.error(msg);
    },
  });

  // Toggle Active Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (u: User) => {
      if (u.isActive) {
        return api.users.deactivate(u.id);
      } else {
        return api.users.activate(u.id);
      }
    },
    onSuccess: (_, u) => {
      toast.success(`User ${u.isActive ? 'deactivated' : 'activated'} successfully`);
      setUserToToggleStatus(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update user status');
    },
  });

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
          <Shield className="h-10 w-10 text-rose-500 mx-auto mb-2" />
          <h2 className="text-base font-semibold text-slate-800">
            Access Denied
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            User management is strictly reserved for system Administrators.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header and Add button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              User Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Create and manage user accounts, assign system roles, and control active status.
            </p>
          </div>

          <Button
            variant="teal"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add User
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white cursor-pointer hover:border-slate-400"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="PROJECT_MANAGER">Project Manager</option>
              <option value="TEAM_MEMBER">Team Member</option>
              <option value="VIEWER">Viewer</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white cursor-pointer hover:border-slate-400"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Deactivated</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !usersData?.data?.length ? (
            <div className="text-center py-16">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800">
                No users found
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                No users match your search criteria.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              <div className="grid grid-cols-12 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <div className="col-span-4">User</div>
                <div className="col-span-3">Role</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>

              {usersData.data.map((u) => {
                const isSelf = currentUser?.id === u.id;

                return (
                  <div
                    key={u.id}
                    className="grid grid-cols-12 px-4 py-3.5 items-center hover:bg-slate-50/50 transition-colors text-xs"
                  >
                    {/* User info */}
                    <div className="col-span-4 flex items-center gap-2.5 pr-2">
                      <div className="h-8 w-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-slate-800 truncate">
                            {u.name}
                          </p>
                          {isSelf && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 rounded font-mono">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {u.email}
                        </p>
                      </div>
                    </div>

                    {/* Role badge */}
                    <div className="col-span-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(
                          u.role
                        )}`}
                      >
                        {getRoleLabel(u.role)}
                      </span>
                    </div>

                    {/* Status badge */}
                    <div className="col-span-2">
                      {u.isActive ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-300 font-medium">
                          Deactivated
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-3 flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => {
                          setUserToEdit(u);
                          setEditName(u.name);
                          setEditEmail(u.email);
                          setEditRole(u.role);
                          setEditPassword('');
                          setEditError('');
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>

                      {/* Deactivate/Activate button (Cannot toggle self per BR-3) */}
                      {!isSelf && (
                        <Button
                          variant={u.isActive ? 'outline' : 'secondary'}
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => setUserToToggleStatus(u)}
                        >
                          {u.isActive ? (
                            <>
                              <UserX className="h-3 w-3 mr-1 text-rose-500" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3 w-3 mr-1 text-teal-600" />
                              Activate
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {usersData?.meta && usersData.meta.totalPages > 1 && (
            <div className="flex items-center justify-between p-3.5 border-t border-slate-100 bg-slate-50/50">
              <span className="text-xs text-slate-500">
                Page {usersData.meta.page} of {usersData.meta.totalPages} ({usersData.meta.total} users)
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
                  disabled={page >= usersData.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Create User Modal */}
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create New User"
          description="Register a new platform user and assign their system role."
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="space-y-4"
          >
            {createError && (
              <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                {createError}
              </div>
            )}

            <Input
              label="Full Name"
              required
              placeholder="e.g. Maya Member"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />

            <Input
              label="Email Address"
              type="email"
              required
              placeholder="name@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />

            <Input
              label="Password (min 8 characters)"
              type="password"
              required
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <Select
              label="System Global Role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as GlobalRole)}
            >
              <option value="ADMIN">Admin</option>
              <option value="PROJECT_MANAGER">Project Manager</option>
              <option value="TEAM_MEMBER">Team Member</option>
              <option value="VIEWER">Viewer</option>
            </Select>

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
                Create User
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit User Modal */}
        <Modal
          isOpen={!!userToEdit}
          onClose={() => setUserToEdit(null)}
          title="Edit User Details"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              editMutation.mutate();
            }}
            className="space-y-4"
          >
            {editError && (
              <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                {editError}
              </div>
            )}

            <Input
              label="Full Name"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />

            <Input
              label="Email Address"
              type="email"
              required
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />

            <Select
              label="System Global Role"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as GlobalRole)}
              disabled={currentUser?.id === userToEdit?.id}
              helperText={
                currentUser?.id === userToEdit?.id
                  ? 'You cannot modify your own role (BR-3).'
                  : undefined
              }
            >
              <option value="ADMIN">Admin</option>
              <option value="PROJECT_MANAGER">Project Manager</option>
              <option value="TEAM_MEMBER">Team Member</option>
              <option value="VIEWER">Viewer</option>
            </Select>

            <Input
              label="Reset Password (leave blank to keep current)"
              type="password"
              placeholder="••••••••"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUserToEdit(null)}
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

        {/* Toggle Deactivation Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!userToToggleStatus}
          onClose={() => setUserToToggleStatus(null)}
          onConfirm={() =>
            userToToggleStatus && toggleStatusMutation.mutate(userToToggleStatus)
          }
          title={
            userToToggleStatus?.isActive
              ? 'Deactivate User Account'
              : 'Reactivate User Account'
          }
          message={
            userToToggleStatus?.isActive
              ? `Are you sure you want to deactivate ${userToToggleStatus.name}? Their active sessions will terminate immediately and they will not be able to log in.`
              : `Are you sure you want to reactivate ${userToToggleStatus?.name}? They will be able to log in again.`
          }
          confirmText={
            userToToggleStatus?.isActive ? 'Deactivate User' : 'Reactivate User'
          }
          variant={userToToggleStatus?.isActive ? 'danger' : 'primary'}
          isLoading={toggleStatusMutation.isPending}
        />
      </div>
    </AppLayout>
  );
}
