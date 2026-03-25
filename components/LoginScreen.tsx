import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSession } from '../context/SessionContext';

export default function LoginScreen() {
  const { signIn, signInWithBiometric, isAuthenticating, biometricEnabled, biometricAvailable } = useSession();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validate = (): string | null => {
    const trimmed = userName.trim();
    if (!trimmed) return 'ユーザー名を入力してください';
    if (trimmed.length > 50) return 'ユーザー名は50文字以内で入力してください';
    // 英数字・アンダースコア・ハイフン・ドット・@のみ許可（SQL特殊文字を排除）
    if (!/^[a-zA-Z0-9_.@-]+$/.test(trimmed)) return 'ユーザー名に使用できない文字が含まれています';
    if (!password) return 'パスワードを入力してください';
    if (password.length < 8) return 'パスワードは8文字以上で入力してください';
    if (password.length > 100) return 'パスワードは100文字以内で入力してください';
    return null;
  };

  const handleLogin = async () => {
    setErrorMessage(null);
    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    const result = await signIn(userName.trim(), password);
    if (!result.ok) {
      setErrorMessage(result.message ?? 'ログインに失敗しました');
    }
  };

  const handleBiometric = async () => {
    setErrorMessage(null);
    const result = await signInWithBiometric();
    if (!result.ok) {
      setErrorMessage(result.message ?? '認証に失敗しました');
    }
  };

  const showBiometricButton = biometricAvailable && biometricEnabled;

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>ログイン</Text>
        <Text style={styles.description}>ユーザー名とパスワードを入力してください。</Text>

        <View style={styles.field}>
          <Text style={styles.label}>ユーザー名</Text>
          <TextInput
            style={styles.input}
            value={userName}
            onChangeText={setUserName}
            placeholder="username"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>パスワード</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="password"
            secureTextEntry
          />
        </View>

        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        <Pressable
          style={[styles.button, (!userName || !password || isAuthenticating) && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={!userName || !password || isAuthenticating}
        >
          {isAuthenticating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>ログイン</Text>
          )}
        </Pressable>

        {showBiometricButton && (
          <Pressable
            style={[styles.biometricButton, isAuthenticating && styles.buttonDisabled]}
            onPress={handleBiometric}
            disabled={isAuthenticating}
          >
            <MaterialCommunityIcons name="fingerprint" size={28} color="#4F46E5" />
            <Text style={styles.biometricButtonText}>指紋認証でログイン</Text>
          </Pressable>
        )}

        <Pressable style={styles.linkButton} onPress={() => router.push('/register' as Href)}>
          <Text style={styles.linkButtonText}>新規登録</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#F4F5F9',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  field: {
    marginTop: 16,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    fontSize: 14,
    color: '#111827',
  },
  errorText: {
    marginTop: 12,
    color: '#DC2626',
    fontSize: 13,
  },
  button: {
    marginTop: 20,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  biometricButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#4F46E5',
  },
  biometricButtonText: {
    color: '#4F46E5',
    fontSize: 15,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4338CA',
  },
});
