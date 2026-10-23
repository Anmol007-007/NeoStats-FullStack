'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, ApiError } from './api';
import { User } from './types';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchCurrentUser = async () => {
    try {
      const res = await api.auth.getMe();
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.auth.login({ email, password });
      setUser(res.data);
      toast.success(`Welcome back, ${res.data.name}!`);
      router.push('/dashboard');
      return res.data;
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || 'Login failed');
      } else {
        toast.error('An unexpected error occurred during login');
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Even if logout endpoint fails, clear state
    } finally {
      setUser(null);
      toast.info('Logged out successfully');
      router.push('/login');
    }
  };

  const refetchUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
