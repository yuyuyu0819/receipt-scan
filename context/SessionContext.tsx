import React, { createContext, useContext, useMemo, useState } from 'react';
import { API_BASE_URL } from '../utils/api';

export type SessionUser = {
  id: number;
  username: string;
};

type SessionContextValue = {
  user: SessionUser | null;
  isAuthenticating: boolean;
  signIn: (username: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const parseUserFromResponse = (data: unknown, username: string): SessionUser | null => {
  if (!data || typeof data !== 'object') {
    return { id: 0, username };
  }

  const record = data as Record<string, unknown>;
  const candidate = record.user && typeof record.user === 'object' ? (record.user as Record<string, unknown>) : record;
  const idValue = candidate.id ?? candidate.userId ?? candidate.useId;
  const id = Number(idValue);
  const resolvedId = Number.isFinite(id) ? id : 0;
  const resolvedUsername =
    typeof candidate.username === 'string'
      ? candidate.username
      : typeof record.username === 'string'
        ? record.username
        : username;

  return {
    id: resolvedId,
    username: resolvedUsername,
  };
};

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const signIn = async (username: string, password: string) => {
    setIsAuthenticating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        return { ok: false, message: 'ログインに失敗しました' };
      }

      const data = await response.json().catch(() => ({}));
      const nextUser = parseUserFromResponse(data, username);
      if (!nextUser) {
        return { ok: false, message: 'ユーザー情報を取得できませんでした' };
      }

      setUser(nextUser);
      return { ok: true };
    } catch (error) {
      console.error('ログインエラー:', error);
      return { ok: false, message: '通信に失敗しました' };
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signOut = () => setUser(null);

  const value = useMemo(
    () => ({
      user,
      isAuthenticating,
      signIn,
      signOut,
    }),
    [user, isAuthenticating]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
