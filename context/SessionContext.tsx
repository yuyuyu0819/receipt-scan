import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { API_BASE_URL } from '../utils/api';

export type SessionUser = {
  id: number;
  userName: string;
};

type SessionContextValue = {
  user: SessionUser | null;
  token: string | null;
  isAuthenticating: boolean;
  isLoading: boolean;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  signIn: (userName: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  signInWithBiometric: () => Promise<{ ok: boolean; message?: string }>;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const STORE_KEY_USER = 'session_user';
const STORE_KEY_TOKEN = 'session_token';
const STORE_KEY_EXPIRY = 'session_expiry';
const STORE_KEY_BIOMETRIC_ENABLED = 'biometric_enabled';
const STORE_KEY_BIOMETRIC_CREDS = 'biometric_creds';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 1ヶ月

const parseUserFromResponse = (data: unknown, userName: string): SessionUser | null => {
  if (!data || typeof data !== 'object') {
    return { id: 0, userName };
  }

  const record = data as Record<string, unknown>;
  const candidate = record.user && typeof record.user === 'object' ? (record.user as Record<string, unknown>) : record;
  const idValue = candidate.id ?? candidate.userId ?? candidate.useId;
  const id = Number(idValue);
  const resolvedId = Number.isFinite(id) ? id : 0;
  const resolvedUserName =
    typeof candidate.userName === 'string'
      ? candidate.userName
      : typeof candidate.username === 'string'
        ? candidate.username
      : typeof record.userName === 'string'
        ? record.userName
        : typeof record.username === 'string'
          ? record.username
        : userName;

  return { id: resolvedId, userName: resolvedUserName };
};

const callLoginAPI = async (userName: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName, password }),
  });
  if (!response.ok) return null;
  return response.json().catch(() => ({}));
};

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // 生体認証が利用可能か確認
        const [hasHardware, isEnrolled, storedEnabled] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
          SecureStore.getItemAsync(STORE_KEY_BIOMETRIC_ENABLED),
        ]);
        const available = hasHardware && isEnrolled;
        setBiometricAvailable(available);
        setBiometricEnabled(available && storedEnabled === '1');

        // 保存済みセッションを復元
        const [storedUser, storedToken, storedExpiry] = await Promise.all([
          SecureStore.getItemAsync(STORE_KEY_USER),
          SecureStore.getItemAsync(STORE_KEY_TOKEN),
          SecureStore.getItemAsync(STORE_KEY_EXPIRY),
        ]);

        if (storedUser && storedExpiry) {
          const expiry = Number(storedExpiry);
          if (Date.now() < expiry) {
            setUser(JSON.parse(storedUser) as SessionUser);
            setToken(storedToken);
          } else {
            await clearStore();
          }
        }
      } catch {
        // 失敗時はログイン画面へ
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const clearStore = async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(STORE_KEY_USER),
      SecureStore.deleteItemAsync(STORE_KEY_TOKEN),
      SecureStore.deleteItemAsync(STORE_KEY_EXPIRY),
    ]);
  };

  const saveSession = async (nextUser: SessionUser, nextToken: string | null) => {
    const expiry = Date.now() + SESSION_DURATION_MS;
    await Promise.all([
      SecureStore.setItemAsync(STORE_KEY_USER, JSON.stringify(nextUser)),
      SecureStore.setItemAsync(STORE_KEY_TOKEN, nextToken ?? ''),
      SecureStore.setItemAsync(STORE_KEY_EXPIRY, String(expiry)),
    ]);
    setUser(nextUser);
    setToken(nextToken);
  };

  const offerBiometricSetup = (userName: string, password: string) => {
    Alert.alert(
      '生体認証でログイン',
      '次回から指紋認証（または顔認証）でログインしますか？',
      [
        { text: 'いいえ', style: 'cancel' },
        {
          text: 'はい',
          onPress: async () => {
            await Promise.all([
              SecureStore.setItemAsync(STORE_KEY_BIOMETRIC_ENABLED, '1'),
              SecureStore.setItemAsync(STORE_KEY_BIOMETRIC_CREDS, JSON.stringify({ userName, password })),
            ]);
            setBiometricEnabled(true);
          },
        },
      ]
    );
  };

  const signIn = async (userName: string, password: string) => {
    setIsAuthenticating(true);
    try {
      const data = await callLoginAPI(userName, password);
      if (!data) return { ok: false, message: 'ログインに失敗しました' };

      const nextUser = parseUserFromResponse(data, userName);
      if (!nextUser) return { ok: false, message: 'ユーザー情報を取得できませんでした' };

      const nextToken = typeof (data as { token?: unknown })?.token === 'string' ? (data as { token: string }).token : null;
      await saveSession(nextUser, nextToken);

      // 生体認証が利用可能で未設定の場合は設定を促す
      if (biometricAvailable && !biometricEnabled) {
        offerBiometricSetup(userName, password);
      }

      return { ok: true };
    } catch (error) {
      console.error('ログインエラー:', error);
      return { ok: false, message: '通信に失敗しました' };
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signInWithBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: '指紋認証でログイン',
        cancelLabel: 'キャンセル',
        fallbackLabel: 'パスワードでログイン',
      });

      if (!result.success) {
        return { ok: false, message: '認証に失敗しました' };
      }

      const stored = await SecureStore.getItemAsync(STORE_KEY_BIOMETRIC_CREDS);
      if (!stored) return { ok: false, message: '認証情報が見つかりません。パスワードでログインしてください。' };

      const { userName, password } = JSON.parse(stored) as { userName: string; password: string };

      setIsAuthenticating(true);
      const data = await callLoginAPI(userName, password);
      if (!data) return { ok: false, message: 'ログインに失敗しました' };

      const nextUser = parseUserFromResponse(data, userName);
      if (!nextUser) return { ok: false, message: 'ユーザー情報を取得できませんでした' };

      const nextToken = typeof (data as { token?: unknown })?.token === 'string' ? (data as { token: string }).token : null;
      await saveSession(nextUser, nextToken);

      return { ok: true };
    } catch {
      return { ok: false, message: '通信に失敗しました' };
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signOut = async () => {
    await clearStore();
    setUser(null);
    setToken(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticating,
      isLoading,
      biometricAvailable,
      biometricEnabled,
      signIn,
      signInWithBiometric,
      signOut,
    }),
    [user, token, isAuthenticating, isLoading, biometricAvailable, biometricEnabled]
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
