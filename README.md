# レシート家計簿（Expo）

## セットアップ

```bash
cd /workspace/receipt-scan
npm install
```

## 開発起動

```bash
npm run start
```

## 既存 Expo プロジェクトへ修正反映（EAS Update）

対象プロジェクト:
- `https://expo.dev/accounts/yuyuyu0819/projects/receipt-kakeibo`

### 1. ログイン

```bash
npx eas-cli login
```

### 2. プロジェクト紐付け（未設定時のみ）

```bash
npx eas-cli project:info
```

### 3. 本番向け修正反映（ストア再審査不要のOTA更新）

```bash
npx eas-cli update --branch production --message "api base url fix"
```

### 4. プレビュー反映

```bash
npx eas-cli update --branch preview --message "preview update"
```

## Play Store 提出用ビルド

```bash
npx eas-cli build -p android --profile production
```

## テスター配布用 APK ビルド

```bash
npx eas-cli build -p android --profile preview
```
