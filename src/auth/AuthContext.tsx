import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Permission } from './permissions';
import {
  api,
  AuthCredentials,
  AuthUser,
  useGetAuthStatusQuery,
  useLazyGetCurrentUserQuery,
  useLoginMutation,
  useSetupMutation,
} from '../services/api';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  setupRequired: boolean;
  login: (credentials: AuthCredentials) => Promise<void>;
  setup: (credentials: Required<AuthCredentials>) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
};

const TOKEN_KEY = 'sab_auth_token';
const AuthContext = createContext<AuthContextValue | null>(null);

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string; error?: string } }).data;
    return data?.message || data?.error || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch();
  const { data: authStatus, isError: isAuthStatusError } = useGetAuthStatusQuery();
  const [getCurrentUser] = useLazyGetCurrentUserQuery();
  const [loginRequest] = useLoginMutation();
  const [setupRequest] = useSetupMutation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    if (!authStatus && !isAuthStatusError) return;

    async function restoreSession() {
      try {
        if (isAuthStatusError) {
          throw new Error('Auth holatini tekshirib bo‘lmadi');
        }

        setSetupRequired(authStatus.setupRequired);

        const token = localStorage.getItem(TOKEN_KEY);

        if (!token || authStatus.setupRequired) {
          return;
        }

        const currentUser = await getCurrentUser().unwrap();
        setUser(currentUser);
      } catch (_error) {
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, [authStatus, getCurrentUser, isAuthStatusError]);

  async function authenticate(path: 'login' | 'setup', credentials: AuthCredentials) {
    try {
      const data = path === 'setup'
        ? await setupRequest(credentials as Required<AuthCredentials>).unwrap()
        : await loginRequest(credentials).unwrap();

      localStorage.setItem(TOKEN_KEY, data.token);
      dispatch(api.util.resetApiState());
      setUser(data.user);
      setSetupRequired(false);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Tizimga kirib bo‘lmadi'));
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    dispatch(api.util.resetApiState());
    setUser(null);
  }

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    setupRequired,
    login: (credentials) => authenticate('login', credentials),
    setup: (credentials) => authenticate('setup', credentials),
    logout,
    hasPermission: (permission) => Boolean(user && (user.role === 'owner' || user.permissions.includes(permission))),
  }), [dispatch, loading, setupRequired, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth AuthProvider ichida ishlatilishi kerak');
  }

  return context;
}
