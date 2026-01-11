import * as ImagePicker from 'expo-image-picker';
import { useRouter, type Href } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSession } from '../context/SessionContext';
import { API_BASE_URL } from '../utils/api';

type ReceiptItem = {
  name: string;
  price: string;
};

type ReceiptData = {
  store: string;
  date: string;
  total: string;
  items: ReceiptItem[];
};

const createEmptyReceipt = (): ReceiptData => ({
  store: '',
  date: '',
  total: '',
  items: [],
});

const parseFormattedReceipt = (formatted: {
  store?: string;
  date?: string;
  total?: number;
  items?: Array<{ name?: string; price?: number }>;
}): ReceiptData => ({
  store: formatted.store ?? '',
  date: formatted.date ?? '',
  total: formatted.total !== undefined ? String(formatted.total) : '',
  items: Array.isArray(formatted.items)
    ? formatted.items.map((item) => ({
        name: item?.name ?? '',
        price: item?.price !== undefined ? String(item.price) : '',
      }))
    : [],
});

const getBase64FromUri = async (uri: string): Promise<string> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default function ReceiptFlow() {
  const [step, setStep] = useState<'select' | 'confirm' | 'result'>('select');
  const [image, setImage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loadingProgress = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const { user, token } = useSession();
  const { width: windowWidth } = useWindowDimensions();
  const progressContainerWidth = Math.min(280, Math.max(180, windowWidth - 96));
  const progressBarWidth = Math.max(80, progressContainerWidth * 0.35);

  useEffect(() => {
    if (!isLoading) {
      loadingProgress.stopAnimation();
      loadingProgress.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.timing(loadingProgress, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => {
      animation.stop();
      loadingProgress.setValue(0);
    };
  }, [isLoading, loadingProgress]);

  const itemsTotal = useMemo(() => {
    if (!receipt) return 0;
    return receipt.items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  }, [receipt]);

  const pickImage = async (source: 'camera' | 'library') => {
    setErrorMessage(null);
    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 1,
      });
    }

    if (!result.canceled) {
      const asset = result.assets[0];
      setImage(asset.uri);
      setStep('confirm');
    }
  };

  const sendToOCR = async (uri: string) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const base64 = await getBase64FromUri(uri);

      const response = await fetch(`${API_BASE_URL}/api/ocr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64 : base64 }),
      });

      if (!response.ok) {
        throw new Error(`OCR API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data?.formatted) {
        setErrorMessage('解析結果を読み取れませんでした');
        setReceipt(createEmptyReceipt());
        return;
      }

      setReceipt(parseFormattedReceipt(data.formatted));
    } catch (error) {
      console.error('OCR処理エラー:', error);
      Alert.alert('エラー', 'OCRまたはGPTの処理に失敗しました');
      setErrorMessage('処理に失敗しました');
      setReceipt(createEmptyReceipt());
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!image) return;
    await sendToOCR(image);
    setStep('result');
  };

  const handleRetry = () => {
    setImage(null);
    setReceipt(null);
    setStep('select');
  };

  const updateReceiptField = (field: keyof ReceiptData, value: string) => {
    if (!receipt) return;
    setReceipt({
      ...receipt,
      [field]: value,
    });
  };

  const updateItem = (index: number, field: keyof ReceiptItem, value: string) => {
    if (!receipt) return;
    const nextItems = [...receipt.items];
    nextItems[index] = { ...nextItems[index], [field]: value };
    setReceipt({
      ...receipt,
      items: nextItems,
    });
  };

  const addItem = () => {
    if (!receipt) return;
    setReceipt({
      ...receipt,
      items: [...receipt.items, { name: '', price: '' }],
    });
  };

  const handleRegister = async () => {
    if (!receipt) return;
    if (!user || !token) {
      Alert.alert('エラー', 'ログイン情報がありません');
      return;
    }

    try {
      const payload = {
        store: receipt.store,
        date: receipt.date,
        total: Number(receipt.total || 0),
        items: receipt.items.map((item) => ({
          name: item.name,
          price: Number(item.price || 0),
        })),
      };

      const response = await fetch(`${API_BASE_URL}/api/receipts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Register API error: ${response.status}`);
      }

      Alert.alert('登録', 'レシートを登録しました', [
        {
          text: 'OK',
          onPress: () => router.replace('/'),
        },
      ]);
    } catch (error) {
      console.error('登録エラー:', error);
      Alert.alert('エラー', '登録に失敗しました');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>レシート登録</Text>
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingTitle}>レシートを解析中...</Text>
            <View style={[styles.progressTrack, { width: progressContainerWidth }]}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressBarWidth,
                    transform: [
                      {
                        translateX: loadingProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-progressBarWidth, progressContainerWidth],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
            <Text style={styles.loadingHint}>完了までしばらくお待ちください。</Text>
          </View>
        </View>
      )}

      {step === 'select' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>画像の登録方法を選択</Text>
          <Text style={styles.cardDescription}>レシート撮影または画像の添付が可能です。</Text>
          <View style={styles.buttonRow}>
            <Pressable style={[styles.actionButton, styles.primary]} onPress={() => pickImage('camera')}>
              <Text style={styles.actionButtonText}>レシートを撮影</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, styles.secondary]} onPress={() => pickImage('library')}>
              <Text style={styles.actionButtonText}>画像を添付</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === 'confirm' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>この画像を登録しますか？</Text>
          <Text style={styles.cardDescription}>
            撮影または添付したレシート画像を確認してください。
          </Text>
          {image && <Image source={{ uri: image }} style={styles.previewImage} />}
          <View style={styles.dialogRow}>
            <Pressable style={[styles.actionButton, styles.primary]} onPress={handleConfirm}>
              <Text style={styles.actionButtonText}>はい</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, styles.secondary]} onPress={handleRetry}>
              <Text style={styles.actionButtonText}>いいえ</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === 'result' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>レシート内容の確認</Text>
          <Text style={styles.cardDescription}>内容を確認し、必要に応じて修正してください。</Text>

          {!isLoading && errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          {!isLoading && receipt && (
            <View style={styles.table}>
              <View style={styles.row}>
                <Text style={styles.label}>店舗名</Text>
                <TextInput
                  style={styles.input}
                  value={receipt.store}
                  onChangeText={(value) => updateReceiptField('store', value)}
                  placeholder="例: イトーヨーカドー 古淵店"
                />
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>日付</Text>
                <TextInput
                  style={styles.input}
                  value={receipt.date}
                  onChangeText={(value) => updateReceiptField('date', value)}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>合計金額</Text>
                <TextInput
                  style={styles.input}
                  value={receipt.total}
                  onChangeText={(value) => updateReceiptField('total', value)}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.itemsHeader}>
                <View>
                  <Text style={styles.itemsTitle}>購入品</Text>
                  <Text style={styles.itemsSubtitle}>合計: {itemsTotal.toLocaleString()}円</Text>
                </View>
                <Pressable style={styles.addItemButton} onPress={addItem}>
                  <Text style={styles.addItemButtonText}>購入品を追加</Text>
                </Pressable>
              </View>

              {receipt.items.map((item, index) => (
                <View style={styles.itemRow} key={`${item.name}-${index}`}>
                  <TextInput
                    style={[styles.input, styles.itemName]}
                    value={item.name}
                    onChangeText={(value) => updateItem(index, 'name', value)}
                    placeholder="商品名"
                  />
                  <TextInput
                    style={[styles.input, styles.itemPrice]}
                    value={item.price}
                    onChangeText={(value) => updateItem(index, 'price', value)}
                    placeholder="金額"
                    keyboardType="numeric"
                  />
                </View>
              ))}
            </View>
          )}

          <View style={styles.resultActions}>
            <Pressable style={[styles.actionButton, styles.ghost]} onPress={handleRetry}>
              <Text style={styles.ghostText}>再撮影・再選択</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, styles.primary]} onPress={handleRegister}>
              <Text style={styles.actionButtonText}>登録</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#F4F5F9',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#6B7280',
  },
  linkButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  linkButtonText: {
    color: '#4338CA',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  cardDescription: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  buttonRow: {
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  primary: {
    backgroundColor: '#4F46E5',
  },
  secondary: {
    backgroundColor: '#6366F1',
  },
  ghost: {
    backgroundColor: '#EEF2FF',
  },
  ghostText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4338CA',
  },
  previewImage: {
    width: '100%',
    height: 360,
    borderRadius: 16,
    marginTop: 20,
  },
  dialogRow: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingCard: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 6,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  loadingHint: {
    fontSize: 13,
    color: '#6B7280',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E0E7FF',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#4F46E5',
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    color: '#DC2626',
  },
  table: {
    marginTop: 16,
    gap: 12,
  },
  row: {
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
  itemsHeader: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  itemsSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  addItemButton: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  addItemButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338CA',
  },
  itemRow: {
    flexDirection: 'row',
    gap: 10,
  },
  itemName: {
    flex: 2,
  },
  itemPrice: {
    flex: 1,
  },
  resultActions: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
});
