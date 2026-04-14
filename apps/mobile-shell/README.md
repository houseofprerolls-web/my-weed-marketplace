# DaTreehouse mobile shell (Capacitor)

Thin native wrapper that opens the **hosted** GreenZone Bolt site in a WebView. Use this path to ship on the **Apple App Store** and **Google Play** without rewriting the Next.js app.

## Prerequisites

- Node 18+
- **iOS:** macOS with Xcode and CocoaPods (`sudo gem install cocoapods` if needed)
- **Android:** Android Studio (JDK), SDK, and an emulator or device

## Setup

```bash
cd apps/mobile-shell
npm install
npx cap add ios
npx cap add android
npx cap sync
```

Remote server URL is set in [`capacitor.config.json`](capacitor.config.json) under `server.url` (default: `https://www.datreehouse.com`). Change it there for staging or another host, then run `npx cap sync` again.

## Open native projects

```bash
npm run cap:ios      # Xcode
npm run cap:android  # Android Studio
```

In **Xcode**: pick your team, set a unique **Bundle Identifier** if `com.datreehouse.directory` is taken, add **App Icons** and **Launch Screen**, then **Archive** for App Store Connect.

In **Android Studio**: set **applicationId** if needed, configure **signing config**, build **Signed App Bundle (AAB)** for Play Console.

## Store compliance checklist (product + legal)

Use your **production** canonical URLs in store listings and review notes.

| Item | Notes |
|------|--------|
| **Privacy policy** | Web app route: `/privacy` — must match what you declare in App Privacy / Data safety. |
| **Terms** | `/terms`, vendor agreements as applicable. |
| **Age / cannabis** | App and store text must match jurisdiction (e.g. 21+ CA). Apple/Google policies on regulated goods — verify current rules before submission. |
| **Account / deletion** | If you collect accounts, provide support contact and data deletion path per store rules. |
| **Tracking** | Disclose analytics, ads, third-party SDKs accurately (ATT on iOS if required). |
| **Export compliance** | Answer encryption questions in App Store Connect (standard HTTPS typically exempt). |

This README is not legal advice; have counsel review store copy and disclosures.

## Service worker

The main Next app does **not** ship a mandatory service worker here. Offline behavior follows the live site. Add a scoped PWA worker in GreenZone Bolt only if product needs offline install.
