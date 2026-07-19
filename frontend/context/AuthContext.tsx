'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, LoginCredentials, RegisterData, AuthResponse } from '@/lib/types';
import { login as apiLogin, register as apiRegister } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (creds: LoginCredentials) => Promise<AuthResponse>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const t = localStorage.getItem('tickora_token');
      const u = localStorage.getItem('tickora_user');
      if (t && u) {
        setToken(t);
        setUser(JSON.parse(u) as User);
      }
    } catch {
      // ignore parse errors
    }
    setLoading(false);
  }, []);

  async function login(creds: LoginCredentials): Promise<AuthResponse> {
    const res = await apiLogin(creds);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('tickora_token', res.token);
    localStorage.setItem('tickora_user', JSON.stringify(res.user));
    return res;
  }

  async function register(data: RegisterData) {
    const res = await apiRegister(data);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('tickora_token', res.token);
    localStorage.setItem('tickora_user', JSON.stringify(res.user));
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('tickora_token');
    localStorage.removeItem('tickora_user');
  }

  function updateUser(updated: User) {
    setUser(updated);
    localStorage.setItem('tickora_user', JSON.stringify(updated));
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
