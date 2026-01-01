import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { API_BASE_URL } from '../utils/api';

export default function RegisterScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recaptchaMessage, setRecaptchaMessage] = useState<string | null>(null);
  const recaptchaSiteKey = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY ?? '6LelzDosAAAAAEY0zjnsUjdplEJdAT2QAZkJc1Xx';
  const recaptchaWebViewRef = useRef<WebView>(null);

  const trimmedUserId = userId.trim();

  const recaptchaHtml = useMemo(() => {
    return `<!DOCTYPE html>
      <html lang="ja">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <script src="https://www.google.com/recaptcha/enterprise.js?render=${recaptchaSiteKey}"></script>
          <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
            #status { font-size: 12px; color: #6B7280; padding: 8px 12px; }
          </style>
        </head>
        <body>
          <div id="status">reCAPTCHAの準備中です。</div>
          <script>
            const statusEl = document.getElementById('status');
            function updateStatus(message) {
              statusEl.textContent = message;
            }
            updateStatus('reCAPTCHAの準備ができました。');
            async function executeRecaptcha() {
              try {
                updateStatus('reCAPTCHAを実行しています...');
                const token = await grecaptcha.enterprise.execute('${recaptchaSiteKey}', { action: 'LOGIN' });
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'token', token }));
                updateStatus('reCAPTCHAを確認しました。');
              } catch (error) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error' }));
                updateStatus('reCAPTCHAの実行に失敗しました。');
              }
            }
            window.executeRecaptcha = executeRecaptcha;
          </script>
        </body>
      </html>`;
  }, [recaptchaSiteKey]);

  const handleRegister = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setRecaptchaMessage(null);

    if (!recaptchaToken) {
      setErrorMessage('reCAPTCHAの確認が必要です');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/user/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: trimmedUserId,
          password,
          email: email.trim(),
          recaptchaToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Register API error: ${response.status}`);
      }

      Alert.alert('登録完了', 'ログイン画面からログインしてください');
      router.replace('/');
    } catch (error) {
      console.error('登録エラー:', error);
      setErrorMessage('登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = !trimmedUserId || !password || !email || !recaptchaToken || isSubmitting;

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>新規登録</Text>
        <Text style={styles.description}>ユーザーID・パスワード・メールアドレスを入力してください。</Text>

        <View style={styles.field}>
          <Text style={styles.label}>ユーザーID</Text>
          <TextInput
            style={styles.input}
            value={userId}
            onChangeText={setUserId}
            placeholder="user_id"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>メールアドレス</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="mail@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
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

        <View style={styles.field}>
          <Text style={styles.label}>reCAPTCHA</Text>
          <View style={styles.recaptchaCard}>
            <View style={styles.recaptchaBox}>
              <WebView
                ref={recaptchaWebViewRef}
                originWhitelist={['*']}
                source={{ html: recaptchaHtml }}
                javaScriptEnabled
                onMessage={(event) => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data);
                    if (data.type === 'token') {
                      setRecaptchaToken(data.token);
                      setRecaptchaMessage('reCAPTCHAを確認しました');
                      return;
                    }
                    if (data.type === 'error') {
                      setRecaptchaToken(null);
                      setRecaptchaMessage('reCAPTCHAの実行に失敗しました。');
                    }
                  } catch (error) {
                    console.error('reCAPTCHA message error:', error);
                  }
                }}
              />
            </View>
            <View style={styles.recaptchaActions}>
              <Text style={styles.recaptchaHint}>ボット対策のため確認をお願いします。</Text>
              <Pressable
                style={[styles.recaptchaButton, !recaptchaWebViewRef.current && styles.buttonDisabled]}
                onPress={() => {
                  setRecaptchaMessage(null);
                  setRecaptchaToken(null);
                  recaptchaWebViewRef.current?.injectJavaScript(
                    'window.executeRecaptcha && window.executeRecaptcha(); true;'
                  );
                }}
              >
                <Text style={styles.recaptchaButtonText}>reCAPTCHAを実行</Text>
              </Pressable>
            </View>
            {recaptchaMessage && (
              <View style={styles.recaptchaStatusPill}>
                <Text style={styles.recaptchaStatus}>{recaptchaMessage}</Text>
              </View>
            )}
          </View>
        </View>

        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        <Pressable style={[styles.button, isDisabled && styles.buttonDisabled]} onPress={handleRegister} disabled={isDisabled}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>登録する</Text>
          )}
        </Pressable>

        <Pressable style={styles.linkButton} onPress={() => router.back()}>
          <Text style={styles.linkButtonText}>ログイン画面に戻る</Text>
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
  recaptchaCard: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 12,
    gap: 12,
  },
  recaptchaBox: {
    height: 92,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  recaptchaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  recaptchaHint: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
  },
  recaptchaButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#111827',
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  recaptchaButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  recaptchaStatusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  recaptchaStatus: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '600',
  },
});
