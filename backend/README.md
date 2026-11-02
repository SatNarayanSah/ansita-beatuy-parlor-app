# Ansita Beauty Parlour API

Python backend for the Ansita app: **FastAPI**, **SQLAlchemy** and **Postgres** (SQLite locally).

It covers everything the app's fake service layer (`ansita-parlor-app/src/services`) does, with the same business rules running on the server:
- no double-booking, bookings only inside shifts, nothing in the past or on holidays
- appointment status transitions
- payment limits
- loyalty points
- holiday and staff-hour checks that would otherwise strand existing bookings
- batch seat limits, no duplicate enrollments
- certificate rules
- role-based access

Every response uses the app's camelCase TypeScript shapes (`src/types`). Every error has the app's `ApiError` shape:

```json
{ "code": "CONFLICT", "message": "Sarita Maharjan is already booked from 10:00 AM to 11:30 AM." }
```

| HTTP | `code` |
| --- | --- |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 422 | `VALIDATION` |

## Run locally

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements-dev.txt
python -m app.seed                # creates ansita.db with services, staff, courses and the admin
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Interactive API docs: http://localhost:8000/docs
- Admin login: there is no built-in account. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (8+ characters) in `.env` before running the seed; see `.env.example`.
- To reach the API from a phone on the same Wi-Fi, use your PC's LAN IP, e.g. `http://192.168.1.10:8000`.

Run the tests with:

```bash
pytest
```

## Deploy for free (Render + Neon)

1. **Database:** create a free Postgres project at [neon.tech](https://neon.tech) and copy its connection string (`postgresql://…?sslmode=require`).
2. **API:** push this repo to GitHub. In [Render](https://render.com), choose **New → Blueprint** and pick the repo. It reads [`render.yaml`](../render.yaml).
3. When Render asks, set:
   - `DATABASE_URL` to the Neon string
   - `ADMIN_PASSWORD` to a strong password

   `JWT_SECRET` is generated for you.
4. On every start, Render runs `python -m app.seed`. It is safe to repeat: it only adds rows that are missing.

Render's free plan sleeps after about 15 minutes without traffic, so the first request after that takes 30–60 seconds. The app should show a loading state rather than an error for that wait.

## Endpoints

All endpoints except auth and public catalogue reads need `Authorization: Bearer <token>`. Login and register return `{ user, token }`.

**Public (no token), for the website:** `GET /categories`, `GET /services`, `GET /courses`, `GET /offers` and `GET /staff`. Visitors see only what a customer would: active items and offers that are live today. Staff phone and email are blanked for visitors. Also public: `GET /settings/public` (profile, holidays, `loyalty.enabled`), `GET /reviews/featured?limit=6`, `GET /staff/{id}/reviews`, `GET /courses/{id}/batches/availability`, and `POST /contact` `{name, phone?, email?, subject?, message}`. A contact request needs a phone or an email and becomes an admin notification.

**Image uploads:** `POST /uploads` (any signed-in user: admins for pictures, customers for their profile photo) takes the raw image bytes as the body, with `Content-Type: image/jpeg|png|webp|gif`, up to 5 MB. The type is checked from the file's own bytes; SVG is refused. It returns `{id, url, contentType, size}`; save `url` in the record's `image` or `avatar`. `GET /uploads/{id}` (public) serves the image with a one-year cache. Images are stored in the database, because Render's disk is wiped on every deploy. Links are built from `PUBLIC_URL` when set, otherwise from the request (Render's forwarded https headers are trusted).

| App service function | Endpoint |
| --- | --- |
| `authService.login` / `register` | `POST /auth/login`, `POST /auth/register` |
| `getCurrentUser` / `updateProfile` | `GET /auth/me`, `PATCH /auth/me` |
| `changePassword` | `POST /auth/change-password` (returns a new `token`; old tokens stop working) |
| `requestPasswordReset` / `resetPassword` | `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm` |
| `logout` | `POST /auth/logout` (no-op; drop the token on the device) |
| `appointmentService.listAppointments` | `GET /appointments?status&customerId&staffId&date&from&to` |
| `getAppointment` | `GET /appointments/{id}` |
| `getAvailableStaff` | `GET /availability/staff?date&serviceIds=a,b` |
| `getAvailableSlots` | `GET /availability/slots?date&staffId&serviceIds=a,b&excludeAppointmentId` |
| `createAppointment` / `updateAppointment` | `POST /appointments`, `PATCH /appointments/{id}` |
| `updateStatus` | `POST /appointments/{id}/status` `{status, reason?}` |
| `recordPayment` / `deleteAppointment` | `POST /appointments/{id}/payments` `{amount, method}`, `DELETE /appointments/{id}` |
| `catalogService` categories | `GET/POST /categories`, `PATCH/DELETE /categories/{id}` |
| `catalogService` services | `GET /services?query&categoryId&activeOnly`, `GET/PATCH/DELETE /services/{id}`, `POST /services`, `POST /services/{id}/active` `{isActive}` |
| `staffService` | `GET /staff?query&activeOnly`, `GET/PATCH/DELETE /staff/{id}`, `POST /staff`, `POST /staff/{id}/active`, `GET /staff/{id}/schedule?date`, `GET /staff/{id}/reviews` |
| `customerService` | `GET /customers?query&tag`, `GET/PATCH/DELETE /customers/{id}`, `POST /customers`, `POST /customers/{id}/points` `{delta}`, `GET /customers/{id}/stats` |
| `courseService` | `GET /courses?query&activeOnly`, `GET/PATCH/DELETE /courses/{id}`, `POST /courses`, `POST /courses/{id}/active`, `GET /courses/{id}/batches/availability`, `POST /courses/{id}/batches`, `PATCH/DELETE /courses/{id}/batches/{batchId}` |
| `enrollmentService` | `GET /enrollments?courseId&batchId&studentId&status`, `GET /enrollments/{id}`, `POST /enrollments`, `POST /enrollments/{id}/status`, `POST /enrollments/{id}/payments`, `POST /enrollments/{id}/attendance` `{date, status}`, `POST /enrollments/attendance` `{date, entries}`, `POST /enrollments/{id}/certificate` |
| `reviewService` | `GET /reviews?staffId&customerId`, `GET /reviews/by-appointment/{appointmentId}` (may be `null`), `POST /reviews`, `POST /reviews/{id}/reply`, `DELETE /reviews/{id}` |
| `notificationService` | `GET /notifications`, `GET /notifications/unread-count` → `{count}`, `POST /notifications/{id}/read`, `POST /notifications/read-all`, `DELETE /notifications/{id}`, `DELETE /notifications` |
| `offerService` | `GET /offers`, `GET/PATCH/DELETE /offers/{id}`, `POST /offers`, `POST /offers/{id}/active` |
| `businessService` | `GET /settings`, `PATCH /settings/profile`, `POST /settings/holidays`, `DELETE /settings/holidays/{date}`, `PATCH /settings/loyalty`, `PATCH /settings/alerts` |

Not on the server: the demo-only helpers `loginAsDemo`, `switchDemoRole`, `getDemoAccounts` and `demoService.resetDemoData`.

## Not done yet

- **Connecting the app.** Follow the app README's *Backend Migration Guide*: replace `simulateRequest` with a `fetch` wrapper that uses `EXPO_PUBLIC_API_URL` and stores the token in `expo-secure-store`, then swap each service body for the matching call above.
- **Email/SMS** for password-reset codes. Until then `EXPOSE_RESET_CODE=true` returns the code in the response, as the demo does. Set it to `false` once sending works.
- **Push notifications** (Expo push tokens) and real eSewa/Khalti payment verification.
- **Database migrations.** Tables are created automatically on start. Add Alembic before changing columns on a live database.
