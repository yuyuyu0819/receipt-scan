# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## AI Rules (from AGENTS.md)

- **Language: Japanese only** — respond in Japanese
- Focus on fixing errors, not explanations unless asked
- Commands must be copy-paste ready

## Commands

```bash
# Development
npm run start          # Expo dev server (port 3000)
npm run android        # Android dev environment
npm run ios            # iOS dev environment
npm run web            # Web dev environment

# Code quality
npm run lint           # ESLint validation

# EAS builds
eas build --platform android --profile preview     # Internal APK for testers
eas build --platform android --profile production  # App Bundle for Play Store

# OTA updates
eas update --branch production --message "メッセージ"
eas update --branch preview --message "メッセージ"
```

## Architecture

**App Name:** レシート家計簿 (Expo + React Native, TypeScript)
**Routing:** Expo Router (file-based, `app/` directory)
**Auth State:** React Context (`context/SessionContext.tsx`) — provides `useSession()` hook with `signIn`, `signOut`, user `id` and `userName`
**Backend:** REST API at `http://35.74.206.197:8080` (configured in `utils/api.ts`)
**Builds:** EAS — `preview` (internal APK) and `production` (Play Store) profiles

### Navigation Flow

```
index.tsx
  ├─ No session → LoginScreen (component)
  └─ Session exists → ReceiptMenu (component)
       ├─ /receipts → receipts.tsx (list, grouped by period)
       └─ /scan → scan.tsx → ReceiptFlow (component)
            1. select: camera or library
            2. confirm: image preview
            3. result: OCR → edit → submit
```

### API Endpoints

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/login` | — |
| POST | `/api/user/register` | — |
| POST | `/api/ocr` | — |
| GET | `/api/receipts` | Bearer token |
| POST | `/api/receipts` | Bearer token |

### Key Files

- `app/_layout.tsx` — root layout, wraps app in `SessionProvider`
- `components/ReceiptFlow.tsx` — full receipt capture/OCR/submit workflow
- `components/LoginScreen.tsx` — login form
- `context/SessionContext.tsx` — auth context and token management
- `utils/api.ts` — `API_BASE_URL` constant
- `constants/Colors.ts` — light/dark color palette (primary: `#4F46E5`)

### Environment Variables

Defined in `.env`:
- `EXPO_PUBLIC_API_BASE_URL` — backend base URL (currently `auto`, resolved at runtime)
- `EXPO_PUBLIC_RECAPTCHA_SITE_KEY` — reCAPTCHA site key

### Styling

Custom inline `StyleSheet` throughout — no CSS-in-JS framework. Light/dark mode via `useColorScheme` and `useThemeColor` hooks. Use `useWindowDimensions` for responsive layouts.

### No Tests

テストフレームワークは未設定。
