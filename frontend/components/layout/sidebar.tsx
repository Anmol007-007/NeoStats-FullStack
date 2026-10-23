'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  UserCheck,
  LogOut,
  Layers,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn, getRoleBadgeStyle, getRoleLabel } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      name: 'Projects',
      href: '/projects',
      icon: FolderKanban,
      active: pathname.startsWith('/projects'),
    },
    {
      name: 'My Tasks',
      href: '/tasks',
      icon: CheckSquare,
      active: pathname === '/tasks' || (pathname.startsWith('/tasks/') && !pathname.includes('/projects')),
    },
    ...(user?.role === 'ADMIN'
      ? [
          {
            name: 'Users',
            href: '/users',
            icon: Users,
            active: pathname.startsWith('/users'),
          },
        ]
      : []),
    {
      name: 'Profile',
      href: '/profile',
      icon: UserCheck,
      active: pathname === '/profile',
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-200/80 bg-white flex flex-col justify-between h-screen sticky top-0 select-none shadow-xs">
      <div>
        
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
          <div className="h-9 w-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm shadow-teal-500/20">
            <Layers className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              TaskFlow
              <span className="text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.2 rounded-md">
                v1
              </span>
            </span>
            <span className="text-[11px] text-slate-400">
              Project Management
            </span>
          </div>
        </div>

        
        {user && (
          <div className="mx-4 my-4 p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-slate-800 truncate">
                  {user.name}
                </span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-sm font-medium w-fit border',
                    getRoleBadgeStyle(user.role)
                  )}
                >
                  {getRoleLabel(user.role)}
                </span>
              </div>
            </div>
            {user.role === 'ADMIN' && (
              <Shield className="h-4 w-4 text-purple-600 shrink-0" />
            )}
          </div>
        )}

        
        <nav className="px-3 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                  item.active
                    ? 'bg-teal-50/80 text-teal-800 font-semibold border border-teal-100 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'h-4 w-4 transition-colors',
                      item.active
                        ? 'text-teal-600'
                        : 'text-slate-400 group-hover:text-slate-600'
                    )}
                  />
                  <span>{item.name}</span>
                </div>
                {item.active && (
                  <ChevronRight className="h-4 w-4 text-teal-600" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      
      <div className="p-4 border-t border-slate-100 space-y-2">
        <button
          onClick={() => logout()}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
