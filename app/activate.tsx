import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

export default function ActivationCompleteScreen() {
  const router = useRouter();

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>有効化完了</Text>
        <Text style={styles.description}>
          メールアドレスの確認が完了しました。レシートの登録を始めましょう。
        </Text>
        <Pressable style={styles.button} onPress={() => router.replace('/scan')}>
          <Text style={styles.buttonText}>はじめる</Text>
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
    lineHeight: 20,
  },
  button: {
    marginTop: 20,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
