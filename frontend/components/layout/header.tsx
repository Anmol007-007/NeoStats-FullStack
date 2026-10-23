'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Badge } from '../ui/badge';
import { getRoleBadgeStyle, getRoleLabel } from '@/lib/utils';
import { User, Bell, ChevronRight } from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Generate breadcrumb items from pathname
  const segments = pathname.split('/').filter(Boolean);

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6 shadow-2xs">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/dashboard" className="hover:text-slate-900 transition-colors">
          Home
        </Link>
        {segments.map((seg, idx) => {
          const href = '/' + segments.slice(0, idx + 1).join('/');
          const isLast = idx === segments.length - 1;
          const label =
            seg.length > 20
              ? `${seg.slice(0, 8)}...`
              : seg.charAt(0).toUpperCase() + seg.slice(1);

          return (
            <React.Fragment key={href}>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
              {isLast ? (
                <span className="text-slate-900 font-semibold">{label}</span>
              ) : (
                <Link
                  href={href}
                  className="hover:text-slate-900 transition-colors"
                >
                  {label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2.5">
            <span
              className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getRoleBadgeStyle(
                user.role
              )}`}
            >
              {getRoleLabel(user.role)}
            </span>
            <Link
              href="/profile"
              className="flex items-center gap-2 text-xs font-medium text-slate-700 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold text-xs border border-slate-300">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline-block max-w-[120px] truncate">
                {user.name}
              </span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
