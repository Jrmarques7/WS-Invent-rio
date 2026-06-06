import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthTokens, LoginCredentials } from '@/types/auth';
import api from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        try {
          set({ isLoading: true, error: null });
          const res = await api.post(endpoints.auth.login, credentials);
          const { access, refresh, user } = res.data.data;

          if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
          }

          set({ user, tokens: { access, refresh }, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
          const msg = err.response?.data?.error || 'Falha ao fazer login.';
          set({ isLoading: false, error: msg, isAuthenticated: false });
          throw err;
        }
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
        set({ user: null, tokens: null, isAuthenticated: false });
        window.location.href = '/auth/login';
      },

      refreshToken: async () => {
        const refresh = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
        if (!refresh) return;
        const res = await api.post(endpoints.auth.refresh, { refresh });
        const { access } = res.data.data;
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', access);
        }
        set(state => ({ tokens: state.tokens ? { ...state.tokens, access } : null }));
      },

      clearError: () => set({ error: null }),
    }),
    { name: 'auth-store' }
  )
);
