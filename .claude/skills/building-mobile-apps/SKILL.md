---
name: building-mobile-apps
description: How the Android and iOS apps of «Контроль» are built with Capacitor 7 — config, native push setup (FCM channels, APNs), token storage, deep links, building and distribution constraints. Use before touching capacitor config, native projects, native push, or app releases.
---

# Мобільні застосунки (Capacitor 7)

## Принцип
Один код інтерфейсу (`client/`) → веб, Android, iOS. Нативне — лише те, чого веб не вміє: push, безпечне сховище токена, канали сповіщень.

## Вимоги середовища (Capacitor 7)
Node 20+, Android minSdk 23 / target 35, JDK 21, Android Studio; iOS 14+, Xcode 16+ на macOS. **iOS збирається лише на macOS.**

## Конфігурація
- `client/capacitor.config.ts`: `appId` має бути від домену власника (змінюється лише до першої публікації), `webDir: 'dist'`, `plugins.PushNotifications.presentationOptions`.
- Застосунок ходить на сервер за адресою `VITE_API_URL` (обов'язкова для нативної збірки). Сервер дозволяє CORS для `capacitor://localhost` і `https://localhost`.
- Вхід у застосунку — токен у `Authorization: Bearer`, зберігається в Keychain/Keystore (не в Preferences/localStorage).

## Push
- Спершу підписатися на події (`registration`, `pushNotificationActionPerformed`), потім `register()` — інакше перший токен губиться.
- Android 13+: дозвіл `POST_NOTIFICATIONS` (через `requestPermissions()`); канали `tasks` (важливість 4) і `urgent` (5) створюються під час старту. Важливість каналу після створення не змінюється — лише новий id каналу.
- `google-services.json` кладемо в `android/app/`, **не комітимо**.
- iOS: можливість Push Notifications і Time Sensitive Notifications у Xcode; AppDelegate передає токен у Capacitor. На iOS плагін дає **APNs-токен** — сервер шле напряму в APNs.
- Натискання на сповіщення → `data.url` → навігація на `/t/:id`.

## Оновлення нативних проєктів
```bash
cd client && npm run build && npx cap sync      # після зміни веб-коду чи плагінів
```

## Розповсюдження (рішення за власником)
- Android: Google Play ($25 разово) / Managed Google Play / MDM.
- iOS: Apple Developer Program ($99/рік, D-U-N-S); Unlisted App або Custom App через Apple Business Manager. Ризик рев'ю — Guideline 4.2 («обгортка сайту»): тримаємо нативні можливості (push, канали, дії в сповіщенні).
