'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { api, ApiError } from '@/lib/api';
import { formatDate, getRoleBadgeStyle, getRoleLabel } from '@/lib/utils';
import { User, Lock, Shield, Check, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, refetchUser, logout } = useAuth();

  // Name Update State
  const [name, setName] = useState(user?.name || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsUpdatingName(true);
    try {
      await api.auth.updateMe({ name: name.trim() });
      await refetchUser();
      toast.success('Profile name updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update name');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.auth.changePassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Account & Profile
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your personal details, credentials, and platform security settings.
          </p>
        </div>

        {/* Profile Info Overview Card */}
        <Card className="border border-slate-200 shadow-xs">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-slate-900 text-white font-bold text-lg flex items-center justify-center shadow-md">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {user.name}
                  </h2>
                  <p className="text-xs text-slate-500">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(
                        user.role
                      )}`}
                    >
                      {getRoleLabel(user.role)}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Member since {formatDate(user.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => logout()}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Update Name Form */}
        <Card className="border border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm">Personal Information</CardTitle>
            <CardDescription>Update your display name</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleUpdateName} className="space-y-4 max-w-md">
              <Input
                label="Full Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Input
                label="Email Address"
                value={user.email}
                disabled
                helperText="Email address cannot be changed directly."
              />

              <Button
                type="submit"
                variant="teal"
                size="sm"
                isLoading={isUpdatingName}
              >
                Save Name
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password Form */}
        <Card className="border border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm">Security & Password</CardTitle>
            <CardDescription>
              Ensure your account stays secure by using a strong password of at least 8 characters.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <Input
                label="Current Password"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />

              <Input
                label="New Password"
                type="password"
                required
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              <Input
                label="Confirm New Password"
                type="password"
                required
                placeholder="Re-type new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isChangingPassword}
              >
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
