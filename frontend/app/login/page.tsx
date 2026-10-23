'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Layers,
  ArrowRight,
  AlertCircle,
  UserCheck,
} from 'lucide-react';

export default function LoginPage() {
  const { login, signup } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'TEAM_MEMBER' | 'PROJECT_MANAGER' | 'VIEWER'>('TEAM_MEMBER');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isSignUp) {
      if (!name.trim() || !email.trim() || !password) return;
      if (password.length < 8) {
        setErrorMessage('Password must be at least 8 characters long');
        return;
      }
      setIsLoading(true);
      try {
        await signup(name.trim(), email.trim(), password, role);
      } catch (err: any) {
        setErrorMessage(
          err?.message || 'Registration failed. An account with this email may already exist.'
        );
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!email.trim() || !password) return;
      setIsLoading(true);
      try {
        await login(email.trim(), password);
      } catch (err: any) {
        setErrorMessage(
          err?.message || 'Login failed. Please verify your email and password.'
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-100 via-slate-50 to-teal-50/30 p-4">
      <div className="w-full max-w-md space-y-6">
        
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-teal-600 items-center justify-center text-white shadow-lg shadow-teal-600/30 mb-2">
            <Layers className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isSignUp ? 'Create your Account' : 'Welcome to TaskFlow'}
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {isSignUp
              ? 'Join your team and start managing projects with real-time locking.'
              : 'Collaborative project management with optimistic locking & real-time MongoDB Atlas sync.'}
          </p>
        </div>

        
        <Card className="border border-slate-200/90 shadow-xl shadow-slate-200/50 backdrop-blur-md">
          <CardContent className="pt-6">
            
            <div className="flex bg-slate-100 p-1 rounded-xl mb-5 border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  !isSignUp
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isSignUp
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div
                  role="alert"
                  data-testid="error-message"
                  className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <div>
                    <p className="font-semibold text-rose-800">
                      {isSignUp ? 'Registration Error' : 'Authentication Error'}
                    </p>
                    <p className="text-rose-600">{errorMessage}</p>
                  </div>
                </div>
              )}

              {isSignUp && (
                <div>
                  <Input
                    label="Full Name"
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoComplete="name"
                  />
                </div>
              )}

              <div>
                <Input
                  label="Email Address"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoComplete="email"
                />
              </div>

              <div>
                <Input
                  label="Password"
                  type="password"
                  required
                  placeholder={isSignUp ? 'At least 8 characters' : '••••••••'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
                {isSignUp && (
                  <p className="text-[10px] text-slate-400 mt-1">Must be at least 8 characters</p>
                )}
              </div>

              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Initial Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'TEAM_MEMBER', label: 'Team Member' },
                      { key: 'PROJECT_MANAGER', label: 'Project Mgr' },
                      { key: 'VIEWER', label: 'Viewer' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setRole(item.key as any)}
                        className={`py-1.5 px-2 text-[11px] font-medium rounded-lg border transition-all text-center cursor-pointer ${
                          role === item.key
                            ? 'bg-teal-50 border-teal-500 text-teal-800 font-semibold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                type="submit"
                variant="teal"
                size="lg"
                className="w-full text-sm font-semibold tracking-wide shadow-md shadow-teal-600/20 mt-2"
                isLoading={isLoading}
              >
                {isSignUp ? 'Create Account' : 'Sign In'}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                {isSignUp ? 'Already have an account? ' : "Don't have an account yet? "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setErrorMessage(null);
                  }}
                  className="font-semibold text-teal-600 hover:text-teal-700 hover:underline cursor-pointer"
                >
                  {isSignUp ? 'Sign In' : 'Sign up now'}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
