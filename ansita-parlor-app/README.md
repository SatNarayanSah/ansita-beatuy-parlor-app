# Ansita Beauty Parlour & Training Centre

A React Native (Expo) app for **Ansita Beauty Parlour & Training Centre, Janakpur-8** (अंशिता ब्युटी पार्लर तथा प्रशिक्षण केन्द्र, जनकपुर-८), with two sides in one app:

- **Customers** browse services, book and manage appointments, enroll in beauty courses, collect loyalty points and get notifications.
- **Admins** run the day: calendar and approvals, walk-in bookings with conflict detection, payments, a customer CRM, services and staff schedules, the training centre (batches, attendance, fees, certificates), reports and business settings.

This build is a **client demo**: everything runs on the device against a realistic, auto-generated Nepali dataset through a fake API that behaves like a server (latency, validation, permissions, errors). Swapping in a real backend means replacing the service files only. See the [Backend Migration Guide](#backend-migration-guide).

---

## Contents

- [Screenshots](#screenshots)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Running on a phone with Expo Go](#running-on-a-phone-with-expo-go)
- [Building an Android APK for the client (EAS)](#building-an-android-apk-for-the-client-eas)
- [Demo accounts](#demo-accounts)
- [Scripts](#scripts)
- [Folder structure](#folder-structure)
- [How the app is put together](#how-the-app-is-put-together)
- [Testing](#testing)
- [Known limitations](#known-limitations)
- [Backend Migration Guide](#backend-migration-guide)

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

# Build the demo APK (≈10–20 min in the cloud)
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

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin (Ansita Shrestha, owner) | `admin@ansita.com` | `admin123` |
| Customer (Priya Sharma) | `customer@ansita.com` | `customer123` |

- The Login screen has one-tap **Demo admin** / **Demo customer** buttons.
- **Settings → Demo → View the app as** switches between the two sides without signing out.
- **Settings → Reset demo data** regenerates everything around today's date (your language and sign-in are kept).
- **Forgot password** shows the 6-digit code on screen (no email is sent in the demo).

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` / `npx expo start` | Start the dev server |
| `npm run start:clear` | Start with a cleared bundler cache |
| `npm run android` / `npm run ios` / `npm run web` | Start and open on a platform |
| `npm run typecheck` | TypeScript (strict, no unused code allowed) |
| `npm run lint` | ESLint with Expo's config (incl. React Compiler rules) |
| `npm run verify:seed` | Checks the generated demo data: no double-booking, shifts, payments, links, determinism |
| `npm run verify:flows` | Runs real service flows for both roles under Node (booking → approval → notification, conflicts, holidays, payments, certificates, permissions, offline) |
| `npm run verify:contrast` | WCAG AA contrast audit of every theme text/background pair (light theme; dark tokens kept for later) |
| `npm run verify` | All of the above; run before every demo or merge |

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
    │   └── shared/          Notifications, settings, demo tools, UI kit (dev only)
    ├── services/            ★ The fake API: the only layer screens call to change data
    ├── store/               Zustand stores (persisted). In the demo they are the "database"
    ├── theme/               Colour tokens (light-only app, WCAG AA), Poppins typography, spacing, shadows
    ├── types/               Domain types (Appointment, Customer, Course…)
    └── utils/               Dates, phone (+977), formatting, analytics, zod schemas, haptics
```

---

## How the app is put together

```
Screen ──calls──▶ services/*Service.ts ──read/write──▶ store/*Store.ts ──persist──▶ AsyncStorage
   ▲                (fake API: latency,                (the demo "database",
   │                 validation, permissions)            seeded from data/)
   └── useServiceQuery(fetcher, deps, { refetchOn: [stores] }) re-fetches silently when a store changes
```

- **Screens never write to stores.** Every change goes through a service, which validates, enforces permissions (e.g. a customer can only cancel their own booking) and creates notifications for the other side.
- **Reads go through services too**, via `useServiceQuery`, which gives every screen loading skeletons, error + retry, pull-to-refresh and live updates (`refetchOn`).
- A few screens read **public catalogue data** (services, staff, categories) and **device settings** directly from stores for lookups. These are listed in the migration guide.
- **Navigation is auth-aware**: guest and signed-in screens are separate groups; the signed-in group is keyed by user id so the demo role switch resets cleanly.

---

## Testing

1. `npm run verify` must pass (typecheck, lint, seed, flows, contrast).
2. Walk through the manual checklist in [`docs/QA_CHECKLIST.md`](docs/QA_CHECKLIST.md) on one Android phone and one iPhone.

---

## Known limitations

This is a demo. In short (full list in the [QA checklist](docs/QA_CHECKLIST.md#known-limitations-of-the-demo)):

- **No real backend**: data lives on each device; two phones don't share bookings.
- **No real payments**: eSewa/Khalti/Fonepay/card are labels; admins record payments manually.
- **No push notifications, email or SMS**: notifications are in-app only; reset codes are shown on screen.
- **Security is simulated**: plain-text demo passwords; permission checks run on the device.
- **Mocked**: add to calendar, CSV export, certificate download/share, the offline banner.
- Portrait only; Nepali covers the main labels only and needs a native-speaker review.

---

## Backend Migration Guide

The app was built so a real backend replaces **one layer**. Screens depend only on the **function signatures** in `src/services/`; keep those signatures, replace the bodies, and the UI keeps working.

### 1. What to replace, file by file

| File | Today (demo) | Replace with |
| --- | --- | --- |
| `services/client.ts` | `simulateRequest()` adds latency and random/offline failures, then runs the handler against stores. `ApiError` with codes. | An HTTP/SDK wrapper, e.g. `api<T>(method, path, body)`, that attaches the auth token and **maps responses to `ApiError` codes** (`401→UNAUTHORIZED`, `403→FORBIDDEN`, `404→NOT_FOUND`, `409→CONFLICT`, `422→VALIDATION`, network failure→`NETWORK`). Keep `ApiError`, `getErrorMessage`, `isApiError`: the UI relies on them. |
| `services/config.ts` | Fake latency, error rate, offline switch. | Base URL / keys from `app.json` `extra` or `EXPO_PUBLIC_*` env vars. Keep the mock switches only for dev builds, or delete. |
| `services/session.ts` | `requireUser` / `requireAdmin` / `requireCustomerAccess` check roles **on the device**. | **Server-side authorisation** (route guards, Supabase RLS, Firebase rules). Client-side you only need the current user for UI. |
| `services/notify.ts` | Creates notification records for the other role. | **Delete.** The server creates notifications (and sends push) when bookings/payments change. |
| `services/authService.ts` | Matches demo credentials in the auth store; session id in AsyncStorage. | Real sign-in/up, password reset by email/SMS, profile update. Store tokens in **expo-secure-store** (not AsyncStorage). Delete `loginAsDemo`, `switchDemoRole`, `getDemoAccounts`. |
| `services/appointmentService.ts` | Slots, booking, reschedule, status changes, payments, with all validation. | `GET /appointments`, `GET /availability`, `POST /appointments`, `PATCH /appointments/:id`, `POST /appointments/:id/status`, `POST /appointments/:id/payments`. **Move the rules server-side** (section 4). |
| `services/catalogService.ts` | Services & categories CRUD. | `/services`, `/categories`. |
| `services/staffService.ts` | Staff CRUD, schedule, reviews; blocks hour changes that strand bookings. | `/staff`, `/staff/:id/schedule`. Keep the stranding check on the server. |
| `services/customerService.ts` | CRM, stats, loyalty adjustments, delete rules. | `/customers`, `/customers/:id/stats`, `/customers/:id/points`. |
| `services/courseService.ts`, `enrollmentService.ts` | Courses, batches, seats, enrollments, fees, attendance, certificates. | `/courses`, `/batches`, `/enrollments`, `/enrollments/:id/payments`, `/attendance`, `/enrollments/:id/certificate`. |
| `services/reviewService.ts`, `notificationService.ts`, `offerService.ts` | Reviews (+ staff rating sync), notifications, offers. | Matching endpoints; compute ratings in the database. |
| `services/businessService.ts` | Profile, holidays, loyalty rules, admin alert switches. | `/settings` (admin-only writes). |
| `services/demoService.ts` | Reset demo data. | **Delete** (and remove the Demo section from `SettingsScreen`). |

**Unchanged:** all screens and components, `types/`, `theme/`, `utils/`, `i18n/`, navigation, `hooks/useServiceQuery` and `useAsyncAction`.

### 2. What happens to the stores

In the demo, the domain stores (`appointmentStore`, `customerStore`, `courseStore`, …) **are the database**. With a backend:

- **Delete** the persisted domain stores and the seed generators in `src/data/` (keep `data/` as a reference for a server seed script if useful).
- **Keep** `settingsStore` (device preferences: language, haptics, onboarding) and a slimmed `authStore` that only holds the session/current user.
- Screens that read catalogue data directly for lookups (below) should get it from a query instead, or from a small cache store filled by `catalogService` / `staffService` at sign-in.

Direct store reads to migrate (outside `refetchOn`):

| Where | Reads | Replace with |
| --- | --- | --- |
| `hooks/useCatalog.ts` (`useServiceMap`, `useCategoryMap`, `useStaffMap`, `useCourseMap`, `useCustomerMap`) | Id → entity lookups used across screens | A cached catalogue query (or cache store) |
| `hooks/useBookingAvailability.ts` | Staff, services, holidays for the booking calendar | Same catalogue cache + `/settings` |
| `navigation/AdminTabs.tsx`, `screens/admin/MoreScreen.tsx`, `DashboardScreen.tsx`, `customer/ProfileScreen.tsx` | Pending count / unread badges | A small `/badges` query or realtime counter |
| `screens/admin/BusinessSettingsScreen.tsx`, `customer/HelpContactScreen.tsx`, `customer/HomeScreen.tsx`, `customer/LoyaltyHistoryScreen.tsx`, `admin/AppointmentDetailScreen.tsx` | Business profile, holidays, loyalty rule | `businessService.getSettings()` via `useServiceQuery` |
| `screens/customer/PreferencesScreen.tsx`, `ServiceDetailScreen.tsx`, `admin/AppointmentFormScreen.tsx`, `EnrollStudentScreen.tsx` | Staff / customers / services lists | The corresponding list services |
| `screens/shared/DemoDataScreen.tsx` | Record counts | Delete with the demo tools |

### 3. Live updates (`refetchOn`)

`useServiceQuery(fetcher, deps, { refetchOn: [useAppointmentStore] })` re-fetches when a store changes. That is how a customer's booking appears instantly in the admin's pending list on the same device. Any object with `subscribe(listener) => unsubscribe` works, so replace stores with **invalidation topics**:

```ts
// src/services/events.ts
type Listener = () => void;
export const createTopic = () => {
  const listeners = new Set<Listener>();
  return {
    subscribe: (listener: Listener) => (listeners.add(listener), () => void listeners.delete(listener)),
    emit: () => listeners.forEach((listener) => listener()),
  };
};
export const appointmentsChanged = createTopic();
```

- Services call `appointmentsChanged.emit()` after a successful mutation.
- Screens change `refetchOn: [useAppointmentStore]` → `refetchOn: [appointmentsChanged]`.
- For changes made **by other people** (customer books → admin sees it), feed the same topic from realtime:

```ts
// Supabase
supabase.channel('appointments')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => appointmentsChanged.emit())
  .subscribe();

// Firebase
onSnapshot(query(collection(db, 'appointments'), where('date', '>=', today)), () => appointmentsChanged.emit());
```

(If you adopt TanStack Query instead, `useServiceQuery` maps 1:1 to `useQuery` and topics to `queryClient.invalidateQueries`.)

### 4. Business rules that must move to the server

These live in the service bodies today. They **must** be enforced server-side, or a modified client could bypass them:

| Rule | Where it is now |
| --- | --- |
| No double-booking of a stylist or customer; booking inside the stylist's shift; not in the past; not on a holiday | `appointmentService.ts` → `validateBooking` |
| Allowed status transitions; customers may only cancel; complete only after start | `appointmentService.ts` → `ALLOWED_STATUS_TRANSITIONS`, `updateStatus` |
| Payments can't exceed the balance; payment status derived | `appointmentService.recordPayment`, `enrollmentService.recordFeePayment` |
| Loyalty points on completion at the configured rate | `appointmentService.updateStatus` + `store/businessStore.selectPointsFor` |
| Holidays can't close a day with bookings | `businessService.addHoliday` |
| Staff hours/deactivation can't strand bookings | `staffService.ts` → `assertNoStrandedBookings` |
| Seats per batch; no duplicate enrollment; certificate only when completed and paid | `enrollmentService.ts` |
| Who may do what (admin vs customer vs own records) | `session.ts` + every service |

For Supabase/Postgres, make the double-booking rule a database constraint so it holds even under concurrent requests:

```sql
create extension if not exists btree_gist;
alter table appointments add constraint no_staff_overlap
  exclude using gist (staff_id with =, tsrange(starts_at, ends_at) with &&)
  where (status in ('pending', 'confirmed'));
```

With Firebase, do the conflict check and write inside a Firestore **transaction** in a Cloud Function.

### 5. Example: one service, three backends

The screen code doesn't change. Only the body of `listAppointments` / `createAppointment` does.

**REST**

```ts
// services/client.ts
export const api = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
  const token = await SecureStore.getItemAsync('token');
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('NETWORK');
  }
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(STATUS_TO_CODE[response.status] ?? 'VALIDATION', json.message);
  return json as T;
};

// services/appointmentService.ts
listAppointments: (filter: AppointmentFilter = {}) => api<Appointment[]>('GET', `/appointments?${toQuery(filter)}`),
createAppointment: async (input: AppointmentInput) => {
  const created = await api<Appointment>('POST', '/appointments', input);
  appointmentsChanged.emit();
  return created;
},
```

**Supabase** (`npx expo install @supabase/supabase-js`)

```ts
listAppointments: async (filter = {}) => {
  let q = supabase.from('appointments').select('*').order('date').order('start_time');
  if (filter.status) q = q.eq('status', filter.status);
  if (filter.date) q = q.eq('date', filter.date);
  const { data, error } = await q;           // RLS returns only the customer's own rows
  if (error) throw toApiError(error);       // map Postgres/PostgREST codes → ApiError
  return data.map(fromRow);                 // snake_case → Appointment
},
createAppointment: async (input) => {
  const { data, error } = await supabase.rpc('create_appointment', toRpcArgs(input)); // validation in SQL/Edge Function
  if (error) throw toApiError(error);       // exclusion-constraint violation → CONFLICT
  appointmentsChanged.emit();
  return fromRow(data);
},
```

**Firebase** (`npx expo install firebase`)

```ts
listAppointments: async (filter = {}) => {
  const constraints = [orderBy('date'), orderBy('startTime')];
  if (filter.status) constraints.unshift(where('status', '==', filter.status));
  const snapshot = await getDocs(query(collection(db, 'appointments'), ...constraints)); // rules limit customers to own docs
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Appointment);
},
createAppointment: async (input) => {
  const result = await httpsCallable<AppointmentInput, Appointment>(functions, 'createAppointment')(input); // transaction + checks
  appointmentsChanged.emit();
  return result.data;
},
```

### 6. Payments, push and email

- **Payments:** integrate eSewa / Khalti / Fonepay through their merchant APIs **from the server**. The app opens the provider's checkout, the server verifies the transaction and records it with the same `recordPayment` shape. Never trust a client-reported payment.
- **Push notifications:** `npx expo install expo-notifications`, register the Expo push token after sign-in, store it on the user, and send from the server via the Expo Push API when a notification is created. Appointment reminders (the customer's *Preferences*) become scheduled server jobs.
- **Email/SMS:** password reset and booking confirmations via your provider (e.g. Sparrow SMS for Nepal).

### 7. After migrating

- `npm run verify:flows` exercises the **fake** service layer; replace it with API integration tests against a staging backend (the scenarios in `scripts/verify/flows.ts` are a good list).
- Remove the demo-only UI: Demo section in Settings, demo login buttons, on-screen reset code, `DemoDataScreen`, "Simulate offline".
- Re-run the manual [QA checklist](docs/QA_CHECKLIST.md).
