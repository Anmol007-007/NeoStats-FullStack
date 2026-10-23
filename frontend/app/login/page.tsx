'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Layers, Shield, UserCheck, Users, Eye, Lock, Mail, ArrowRight } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    role: 'ADMIN',
    name: 'Alice Admin',
    email: 'admin@example.com',
    password: 'Admin@123',
    icon: Shield,
    color: 'hover:border-purple-300 hover:bg-purple-50/50 text-purple-700',
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  {
    role: 'PROJECT_MANAGER',
    name: 'Priya Manager',
    email: 'pm1@example.com',
    password: 'Password@123',
    icon: UserCheck,
    color: 'hover:border-teal-300 hover:bg-teal-50/50 text-teal-700',
    badge: 'bg-teal-100 text-teal-700 border-teal-200',
  },
  {
    role: 'TEAM_MEMBER',
    name: 'Maya Member',
    email: 'member1@example.com',
    password: 'Password@123',
    icon: Users,
    color: 'hover:border-blue-300 hover:bg-blue-50/50 text-blue-700',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  {
    role: 'VIEWER',
    name: 'Vera Viewer',
    email: 'viewer@example.com',
    password: 'Password@123',
    icon: Eye,
    color: 'hover:border-slate-300 hover:bg-slate-50 text-slate-700',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    try {
      await login(email, password);
    } catch {
      // Error handled in login method
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-100 via-slate-50 to-teal-50/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-teal-600 items-center justify-center text-white shadow-lg shadow-teal-600/30 mb-2">
            <Layers className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome to TaskFlow
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            High-performance collaborative project management with optimistic locking & RBAC.
          </p>
        </div>

        {/* Login form card */}
        <Card className="border border-slate-200/90 shadow-xl shadow-slate-200/50 backdrop-blur-md">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  label="Email Address"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div>
                <Input
                  label="Password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                variant="teal"
                size="lg"
                className="w-full text-sm font-semibold tracking-wide shadow-md shadow-teal-600/20"
                isLoading={isLoading}
              >
                Sign In
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Accounts Quick-Select for Evaluators */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Evaluator Quick Access
            </span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              return (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickLogin(acc.email, acc.password)}
                  className={`p-3 rounded-xl border border-slate-200 bg-white text-left transition-all hover:shadow-xs flex flex-col gap-1 cursor-pointer group ${acc.color}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${acc.badge}`}
                    >
                      {acc.role.replace('_', ' ')}
                    </span>
                    <Icon className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-xs font-semibold text-slate-800 mt-1">
                    {acc.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {acc.email}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-center text-slate-400 italic">
            Click any demo profile above to populate credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
