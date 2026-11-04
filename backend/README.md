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

**Online payments ("I've paid"):** admins set the parlour's eSewa, Khalti, Fonepay and bank accounts (number/ID, optional uploaded QR, instructions) and whether customers may send requests with `PATCH /settings/payments`; `GET /settings` returns them under `payments`. A customer who paid sends `POST /payment-requests` `{targetType: "appointment"|"enrollment", targetId, amount, method: esewa|khalti|fonepay|bank, reference, paidOn, note?, proof?}`. The server checks: own bill, still payable, method enabled, amount at most the balance minus other pending requests, at most 3 pending per bill, date not in the future and within 60 days, and the transaction ID not already used. Admins are notified; the bill does not change yet. `POST /payment-requests/{id}/approve` `{amount?, note?}` records the payment (dated `paidOn`, with the transaction ID) using the same code as "Record payment", re-checking the balance at that moment. `POST /payment-requests/{id}/reject` `{reason}` needs a reason. The customer is notified either way and can `POST /payment-requests/{id}/cancel` while it is pending. Also `GET /payment-requests?status&targetType&targetId` (customers see only their own) and `GET /payment-requests/pending-count` (admin). Payment method `bank` was added.

**Starter service photos:** `app/assets/services/<service id>.jpg` (free Unsplash photos, see `CREDITS.md` there). `python -m app.seed`, which runs on every Render start, stores each one as an upload and sets it on its seeded service, once only: a photo an admin later removes or replaces is never put back. Each service also has `benefits` (a list of up to 8 short points) shown on its page.

**Image uploads:** `POST /uploads` (any signed-in user: admins for pictures, customers for their profile photo) takes the raw image bytes as the body, with `Content-Type: image/jpeg|png|webp|gif`, up to 5 MB. The type is checked from the file's own bytes; SVG is refused. It returns `{id, url, contentType, size}`; save `url` in the record's `image` or `avatar`. `GET /uploads/{id}` (public) serves the image with a one-year cache. Images are stored in the database, because Render's disk is wiped on every deploy. Records store upload links without a host (`/uploads/<id>`), and every response turns them into full links on the address that client used to reach the API, or on `PUBLIC_URL` when that is set. So a photo uploaded from the office computer (`localhost`) also loads on phones that reach the API by the computer's Wi-Fi address, and after a deploy. Render's forwarded https headers are trusted.

| App service function | Endpoint |
| --- | --- |
| `authService.login` / `register` | `POST /auth/login`, `POST /auth/register` (needs `emailVerificationToken`) |
| `sendEmailCode` / `verifyEmailCode` | `POST /auth/email/send-code` `{email}`, `POST /auth/email/verify` `{email, code}` → `{verificationToken}` |
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
| `redeemPoints` / `removePointsDiscount` | `POST /appointments/{id}/redeem-points` `{points}` (admin; needs the customer to have `minRedeemPoints`, 500 by default, and the discount must fit the balance due), `DELETE /appointments/{id}/redeem-points` (gives the points back; cancelling or a no-show does too) |
| `catalogService` categories | `GET/POST /categories`, `PATCH/DELETE /categories/{id}` |
| `catalogService` services | `GET /services?query&categoryId&activeOnly`, `GET/PATCH/DELETE /services/{id}`, `POST /services`, `POST /services/{id}/active` `{isActive}` |
| `staffService` | `GET /staff?query&activeOnly`, `GET/PATCH/DELETE /staff/{id}`, `POST /staff`, `POST /staff/{id}/active`, `GET /staff/{id}/schedule?date`, `GET /staff/{id}/reviews` |
| `customerService` | `GET /customers?query&tag`, `GET/PATCH/DELETE /customers/{id}`, `POST /customers`, `GET /customers/{id}/stats` |
| `courseService` | `GET /courses?query&activeOnly`, `GET/PATCH/DELETE /courses/{id}`, `POST /courses`, `POST /courses/{id}/active`, `GET /courses/{id}/batches/availability`, `POST /courses/{id}/batches`, `PATCH/DELETE /courses/{id}/batches/{batchId}` |
| `enrollmentService` | `GET /enrollments?courseId&batchId&studentId&status`, `GET /enrollments/{id}`, `POST /enrollments`, `POST /enrollments/{id}/status`, `POST /enrollments/{id}/payments`, `POST /enrollments/{id}/attendance` `{date, status}`, `POST /enrollments/attendance` `{date, entries}`, `POST /enrollments/{id}/certificate` |
| `reviewService` | `GET /reviews?staffId&customerId`, `GET /reviews/by-appointment/{appointmentId}` (may be `null`), `POST /reviews`, `POST /reviews/{id}/reply`, `DELETE /reviews/{id}` |
| `notificationService` | `GET /notifications`, `GET /notifications/unread-count` → `{count}`, `POST /notifications/{id}/read`, `POST /notifications/read-all`, `DELETE /notifications/{id}`, `DELETE /notifications` |
| `offerService` | `GET /offers`, `GET/PATCH/DELETE /offers/{id}`, `POST /offers`, `POST /offers/{id}/active` |
| `businessService` | `GET /settings`, `PATCH /settings/profile`, `POST /settings/holidays`, `DELETE /settings/holidays/{date}`, `PATCH /settings/loyalty`, `PATCH /settings/alerts` |

Not on the server: the demo-only helpers `loginAsDemo`, `switchDemoRole`, `getDemoAccounts` and `demoService.resetDemoData`.

## Security notes

- **Forgotten admin password:** run `python -m app.set_password <admin email>` on the server (Render: the service's Shell tab). With email configured, the admin also gets reset codes by email (to the admin's own inbox); without it, admin codes are never returned.
- **Email verification:** sign-up and changing the sign-in email need a 6-digit code emailed to the address (`POST /auth/email/send-code`, then `/auth/email/verify`, which returns a 30-minute `verificationToken`). The domain is checked with a DNS lookup first (`EMAIL_CHECK_DELIVERABILITY`). Emails go out over SMTP (`SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAIL_FROM_EMAIL`; see `.env.example`). The design is the editable template in `app/email_templates/` (preview with `python -m app.preview_email > preview.html`).
- **Codes on screen (dev):** while no email provider is configured, `EXPOSE_RESET_CODE=true` returns verification and customer reset codes in the API response so the app can show them. Anyone who knows a customer's email could then reset that password. Configure email before going live; codes are never returned once it is.
- **Mobile numbers:** Nepali numbers (+977) must be NTC (984, 985, 986, 974, 975, 976) or Ncell (980, 981, 982, 970, 971) — checked at sign-up, profile changes and when adding customers (`app/utils.py`, `NEPAL_OPERATOR_PREFIXES`). Numbers saved earlier keep working until changed.
- **Rate limits** (`app/rate_limit.py`, in memory, per process): failed logins, reset requests and codes, sign-ups and the contact form. Requests over the limit get HTTP 429.
- Set `CORS_ORIGINS` to the website's address and `PUBLIC_URL` to the API's address in production.

## Not done yet

- **Connecting the app.** Follow the app README's *Backend Migration Guide*: replace `simulateRequest` with a `fetch` wrapper that uses `EXPO_PUBLIC_API_URL` and stores the token in `expo-secure-store`, then swap each service body for the matching call above.
- **Push notifications** (Expo push tokens) and real eSewa/Khalti payment verification.
- **Database migrations.** Tables are created automatically on start. Add Alembic before changing columns on a live database.
