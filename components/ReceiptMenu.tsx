import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSession } from '../context/SessionContext';

export default function ReceiptMenu() {
  const router = useRouter();
  const { user } = useSession();

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>メニュー</Text>
        <Text style={styles.description}>
          {user ? `${user.userName}さん、利用したい機能を選択してください。` : '利用したい機能を選択してください。'}
        </Text>

        <Pressable style={[styles.button, styles.primary]} onPress={() => router.push('/receipts' as Href)}>
          <Text style={styles.buttonText}>レシート閲覧</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.secondary]} onPress={() => router.push('/scan' as Href)}>
          <Text style={styles.buttonText}>レシート登録</Text>
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
  button: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#4F46E5',
  },
  secondary: {
    backgroundColor: '#6366F1',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
