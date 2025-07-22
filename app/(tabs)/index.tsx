import React, { useState } from 'react';
import { Button, Image, View, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

// ✅ GPTに送るプロンプト作成関数
const prompt = (ocrText: string) => `
次のレシートのテキストを読み取り、日付、店名、商品名と価格、合計金額をJSON形式にしてください。

レシート内容:
${ocrText}

JSON形式:
{
  "date": "YYYY-MM-DD",
  "store": "店舗名",
  "items": [
    { "name": "商品名", "price": 金額 }
  ],
  "total": 合計金額
}
`;

// ✅ GPT API呼び出し関数
const sendToGPT = async (ocrText: string): Promise<string> => {
  const openaiApiKey = '';

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt(ocrText) }],
        temperature: 0,
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      console.error('GPTエラー詳細:', error);
      throw new Error('GPT API エラー');
    }

    const data = await res.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('GPTエラー:', error);
    return 'GPTでの解析に失敗しました';
  }
};


// ✅ base64変換関数
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

// ✅ 画面本体
export default function HomeScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [textResult, setTextResult] = useState<string>('');

  // 📷 カメラ起動 → OCR → GPT
  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setImage(asset.uri);
      await sendToOCR(asset.uri);
    } else {
      console.log('撮影キャンセル');
    }
  };

  // 🧠 OCR処理＋GPTへ送信
  const sendToOCR = async (uri: string) => {
    try {
      setTextResult('OCR・GPT解析中...');

      const base64 = await getBase64FromUri(uri);
      const visionApiKey = ''; 

      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`,
        {
          requests: [
            {
              image: { content: base64 },
              features: [{ type: 'TEXT_DETECTION' }],
            },
          ],
        }
      );

      const text = response.data.responses[0]?.fullTextAnnotation?.text;

      if (!text) {
        setTextResult('文字が読み取れませんでした');
        return;
      }

      console.log('OCR結果:', text);
      const json = await sendToGPT(text);
      setTextResult(json);
    } catch (error) {
      console.error('OCR処理エラー:', error);
      Alert.alert('エラー', 'OCRまたはGPTの処理に失敗しました');
      setTextResult('処理に失敗しました');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button title="レシートを撮影" onPress={pickImage} />
      {image && <Image source={{ uri: image }} style={styles.image} />}
      <Text style={styles.text}>{textResult}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  image: { width: 300, height: 400, marginTop: 20 },
  text: { marginTop: 20, fontSize: 14},
});
