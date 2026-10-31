# Ansita Beauty Parlour & Training Centre

A React Native (Expo) app for **Ansita Beauty Parlour & Training Centre, Janakpur-8** (अंशिता ब्युटी पार्लर तथा प्रशिक्षण केन्द्र, जनकपुर-८), with two sides in one app:

- **Customers** browse services, book and manage appointments, enroll in beauty courses, collect loyalty points and get notifications.
- **Admins** run the day: calendar and approvals, walk-in bookings with conflict detection, payments, a customer CRM, services and staff schedules, the training centre (batches, attendance, fees, certificates), reports and business settings.

All data lives on the **Python backend** in [`../backend`](../backend/README.md) (FastAPI + Postgres). Every phone sees the same bookings, customers and courses, and the server enforces the business rules and permissions. See [Connecting to the backend](#connecting-to-the-backend).

---

## Contents

- [Screenshots](#screenshots)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Running on a phone with Expo Go](#running-on-a-phone-with-expo-go)
- [Building an Android APK for the client (EAS)](#building-an-android-apk-for-the-client-eas)
- [Connecting to the backend](#connecting-to-the-backend)
- [Scripts](#scripts)
- [Folder structure](#folder-structure)
- [How the app is put together](#how-the-app-is-put-together)
- [Testing](#testing)
- [Known limitations](#known-limitations)

---

## Screenshots

> Screenshots are not committed yet. Capture them from the preview build (or Expo Go) and save them under `docs/screenshots/` with the names below; the table will pick them up.

| Customer | | |
| --- | --- | --- |
| ![Home](docs/screenshots/customer-home.png) | ![Booking](docs/screenshots/customer-booking.png) | ![My appointments](docs/screenshots/customer-appointments.png) |
| Home | Booking flow | My appointments |

| Admin | | |
| --- | --- | --- |
| ![Dashboard](docs/screenshots/admin-dashboard.png) | ![Calendar](docs/screenshots/admin-calendar.png) | ![Reports](docs/screenshots/admin-reports.png) |
| Dashboard | Day calendar | Reports |

---

## Tech stack

| Area | Library |
| --- | --- |
| Framework | Expo SDK 58, React Native 0.88, React 19, TypeScript (strict) |
| Navigation | React Navigation 7 (native stack + bottom tabs, custom tab bar) |
| State | Zustand with AsyncStorage persistence |
| Forms | react-hook-form + zod |
| Animation | Reanimated 4 |
| Charts | react-native-gifted-charts (+ react-native-svg, expo-linear-gradient) |
| Calendar | react-native-calendars |
| Device | expo-image, expo-image-picker, expo-haptics, expo-splash-screen |
| Dates | date-fns |

---

## Getting started

**Prerequisites**

- Node.js **22.18 or newer** (the verification scripts run TypeScript directly), npm 10+
- The **Expo Go** app for SDK 58 on your phone, or an Android emulator / iOS simulator

```bash
git clone <repo-url>
cd ansita-parlor-app
npm install
npx expo start
```

Press `a` for Android emulator, `i` for iOS simulator, or scan the QR code with Expo Go (below). Use `npx expo start -c` if you see stale bundles after switching branches.

> Always add packages with `npx expo install <package>` so versions match the Expo SDK.

---

## Running on a phone with Expo Go

1. Install **Expo Go** from the Play Store / App Store (it must support **SDK 58**).
2. Connect the phone and computer to the **same Wi-Fi**.
3. Run `npx expo start` and scan the QR code: **Android** from inside Expo Go, **iPhone** with the Camera app.
4. On office/guest networks that block local traffic, use `npx expo start --tunnel`.

Everything in the app works in Expo Go. Two things only appear in a real build: the **app icon** and the **native splash screen** (Expo Go shows its own).

---

## Building an Android APK for the client (EAS)

The `preview` profile in [`eas.json`](eas.json) builds an installable **APK** in the cloud; no Android Studio needed.

```bash
# One-time: log in (create a free Expo account if needed)
npx eas-cli@latest login

# One-time: link this folder to an EAS project (adds the project id to app.json)
npx eas-cli@latest init

# Build the APK (≈10–20 min in the cloud)
npx eas-cli@latest build --platform android --profile preview
```

When the build finishes, the CLI prints a link and QR code. Open it on the client's Android phone, download the APK and install it (allow *Install unknown apps* for the browser when asked). Share the same link with anyone who should test.

Other builds:

```bash
# Play Store bundle (.aab), version auto-incremented
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest submit --platform android   # upload to Google Play

# iOS Simulator build (no Apple developer account needed)
npx eas-cli@latest build --platform ios --profile preview
```

> **Before the first store build**, confirm the app identifiers in `app.json`: `ios.bundleIdentifier` and `android.package` are set to `com.ansita.parlor`. They cannot be changed once the app is published.
>
> A *development build* profile is not included because it needs `expo-dev-client`. If you need one: `npx expo install expo-dev-client`, then add `"development": { "developmentClient": true, "distribution": "internal" }` under `build` in `eas.json`.

---

## Connecting to the backend

1. Start the backend (see [`../backend/README.md`](../backend/README.md)):
   ```bash
   cd ../backend
   .venv\Scripts\activate
   python -m app.seed            # first time only: services, staff, courses, admin account
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
2. Run `npx expo start`. In development the app automatically talks to **port 8000 on the computer running Expo**, so a phone on the same Wi-Fi works with no setup. Allow Python through Windows Firewall if the phone can't connect.
3. To use another server, set `EXPO_PUBLIC_API_URL` (e.g. in a `.env` file: `EXPO_PUBLIC_API_URL=https://ansita-api.onrender.com`) and restart Expo with `-c`.
4. Sign in with the admin account created by the seed (`ADMIN_EMAIL` / `ADMIN_PASSWORD`, default `admin@ansita.com` / `admin123`; change it before going live). Customers create their own accounts from **Create an account**; admins add walk-in customers in the CRM.

**Settings → App → Server** shows which server the app is using and whether it can reach it. A banner appears at the top whenever the server can't be reached; tap it to retry.

Builds made with EAS take the server address from `EXPO_PUBLIC_API_URL` in [`eas.json`](eas.json). It is set to `https://ansita-api.onrender.com`, the address Render gives the service in `render.yaml`. **Check it matches your Render URL before building.**

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` / `npx expo start` | Start the dev server |
| `npm run start:clear` | Start with a cleared bundler cache |
| `npm run android` / `npm run ios` / `npm run web` | Start and open on a platform |
| `npm run typecheck` | TypeScript (strict, no unused code allowed) |
| `npm run lint` | ESLint with Expo's config (incl. React Compiler rules) |
| `npm run verify:api` | Runs the app's real service layer against a running backend (`EXPO_PUBLIC_API_URL=http://localhost:8000`): sign-up, booking, admin approval, notifications, payment limits, permissions, cancellation |
| `npm run verify:contrast` | WCAG AA contrast audit of every theme text/background pair (light theme; dark tokens kept for later) |
| `npm run verify` | Typecheck, lint and contrast; run before every merge (run `verify:api` too when a backend is up) |

---

## Folder structure

```
.
├── app.json                 Expo config: name, icons, splash, plugins
├── eas.json                 EAS build profiles (preview APK, production AAB)
├── assets/                  logo.png (client original) + icons/splash/in-app logo generated from it
├── docs/
│   └── QA_CHECKLIST.md      Manual test checklist for both roles + known limitations
├── scripts/verify/          Node-run checks (seed, flows, contrast) + module loader
└── src/
    ├── app/                 App root: providers, animated splash, error boundary
    ├── components/
    │   ├── ui/              Design-system kit: Button, Input, Card, BottomSheet, ListScreen, Skeleton, Toast…
    │   ├── admin/           Admin-only pieces: charts, timeline calendar, payment sheet, pickers, certificate
    │   ├── customer/        Customer pieces: appointment/service/course cards, offer carousel, sheets
    │   ├── form/            react-hook-form bindings for the kit inputs
    │   ├── layout/          Greeting header, sign-out row, offline banner
    │   ├── navigation/      Custom animated tab bar
    │   └── brand/           Logo and wordmark
    ├── data/                Seed generators (deterministic, relative to today)
    ├── hooks/               useServiceQuery, useAsyncAction, booking availability, guards…
    ├── i18n/                English / Nepali labels for the main UI
    ├── navigation/          Root stack (auth-aware), admin and customer tabs, typed params
    ├── screens/
    │   ├── auth/            Onboarding, login, register, forgot password
    │   ├── customer/        Home, services, booking, appointments, courses, profile…
    │   ├── admin/           Dashboard, calendar, CRM, services, staff, training, reports, settings
    │   └── shared/          Notifications, settings, UI kit (dev only)
    ├── services/            ★ API client: the only layer that talks to the backend
    ├── store/               Zustand stores: session + preferences (saved), cache of server data (memory)
    ├── theme/               Colour tokens (light-only app, WCAG AA), Poppins typography, spacing, shadows
    ├── types/               Domain types (Appointment, Customer, Course…)
    └── utils/               Dates, phone (+977), formatting, analytics, zod schemas, haptics
```

---

## How the app is put together

```
Screen ──calls──▶ services/*Service.ts ──HTTP──▶ Python backend (validation, permissions, notifications)
   ▲                     │
   │                     └──caches results in──▶ store/*Store.ts (in memory; cleared on sign-out)
   └── useServiceQuery(fetcher, deps, { refetchOn: [stores] }) re-fetches silently when a store changes
```

- **Screens never write to stores.** Every change goes through a service, which calls the server and caches the saved result.
- **Reads go through services too**, via `useServiceQuery`, which gives every screen loading skeletons, error + retry, pull-to-refresh and live updates (`refetchOn`).
- The **stores are a cache** of server data, filled after sign-in (`services/sync.ts`). Screens read them for quick lookups (id → name, badges, counts). They are refreshed every minute and when the app returns to the foreground, so changes made on other phones appear.
- The **session** (account + access token) is kept in the phone's secure storage (`expo-secure-store`); device preferences such as haptics and language stay in AsyncStorage.
- **Navigation is auth-aware**: guest and signed-in screens are separate groups, keyed by user id.

---

## Testing

1. `npm run verify` must pass (typecheck, lint, contrast), and `npm run verify:api` against a running backend. The backend has its own tests (`pytest` in `../backend`).
2. Walk through the manual checklist in [`docs/QA_CHECKLIST.md`](docs/QA_CHECKLIST.md) on one Android phone and one iPhone.

---

## Known limitations

- **No real payments**: eSewa/Khalti/Fonepay/card are labels; admins record payments manually.
- **No push notifications, email or SMS**: notifications are in-app (refreshed every minute). Password-reset codes are shown on screen until the server sends them (`EXPOSE_RESET_CODE`).
- **Photos** (avatars, service images) are stored as the phone's local file path, so they only show on that phone until uploads to cloud storage are added.
- **Not implemented yet**: add to calendar, CSV export, certificate download/share, appointment reminders.
- Portrait only; Nepali covers the main labels only and needs a native-speaker review.
