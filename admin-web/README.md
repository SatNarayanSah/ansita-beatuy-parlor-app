# Ansita Beauty Parlour website

One Next.js site with three areas:

| Area | URLs | Who |
| --- | --- | --- |
| Public website | `/`, `/services`, `/offers`, `/academy`, `/team`, `/about`, `/contact` | Anyone. Browse services, live offers, courses and the team; send an enquiry |
| Customer portal | `/account`, `/account/book`, `/account/appointments`, `/account/courses`, `/account/notifications`, `/account/profile` | Signed-in customers. Dashboard with loyalty points, online booking (sent as a request for the parlour to confirm), cancel, review visits, course progress, profile and password |
| Admin studio | `/admin/...` | Parlour admins (see below) |

Everyone signs in at `/login`, and each role lands in its own area. New customers register at `/register`; a returning walk-in customer who registers with the same phone number keeps their history.

The site is built with **Next.js 16**, **Tailwind CSS 4**, **Motion** (Framer Motion), **TanStack Query** and **Recharts**.

The site talks to the FastAPI backend in [`../backend`](../backend), and the backend owns the database (SQLite locally, Postgres on Neon in production). So the website and the mobile app share one live dataset and one set of business rules: no double-booking, shift and holiday checks, payment limits, loyalty points, seat limits and certificate rules.

## Admin studio: what you can manage

| Page | What it does |
| --- | --- |
| Dashboard | KPIs that count up, a 14-day revenue chart, this month's status mix, today's timeline, one-click confirm/decline for app booking requests, top services, latest reviews |
| Appointments | Filterable list plus a per-stylist **day board**; a 4-step booking wizard with live staff and slot availability; status changes, payments, rescheduling, delete |
| Customers | Search, tag filters, create/edit, a profile drawer with visit stats, history and loyalty points (read-only; earned on completed visits) |
| Services | Categories and services, price and duration, active toggle |
| Staff | Profiles, specialties, weekly working-hours editor, daily schedule, reviews |
| Courses | Courses, syllabus builder, batches with live seat availability |
| Enrollments | Enrol students, fee payments, attendance (single or whole batch), certificates |
| Reviews | Rating breakdown, filters, replies |
| Offers | Coupon-style offers with live, scheduled and expired states |
| Notifications | Read, mark all, delete, deep links |
| Settings | Business profile and hours, holidays, loyalty rules, admin alerts, your account and password |

Includes light and dark mode (follows the system, with a toggle) and respects *reduce motion*.

## Run locally

1. Start the backend (see [`../backend/README.md`](../backend/README.md)):

   ```bash
   cd backend
   .venv\Scripts\activate
   uvicorn app.main:app --reload --port 8000
   ```

2. Start the website:

   ```bash
   cd admin-web
   npm install
   cp .env.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:8000
   npm run dev
   ```

3. Open http://localhost:3000. For the admin studio, sign in with the backend's `ADMIN_EMAIL` / `ADMIN_PASSWORD`; customers can register from the site.

## Deploy (Vercel, free)

1. Import the repo in [Vercel](https://vercel.com) and set **Root Directory** to `admin-web`.
2. Add the environment variable `NEXT_PUBLIC_API_URL` = your Render API URL (e.g. `https://ansita-api.onrender.com`).
3. On Render, set the API's `CORS_ORIGINS` to your Vercel URL (e.g. `https://ansita-admin.vercel.app`). `*` also works.

The free Render API sleeps when idle, so the first sign-in after a break can take 30–60 seconds.

## Structure

```
src/
  app/
    (site)/             public website (header + footer layout)
    login/, register/   sign-in and sign-up
    account/            customer portal (customer-only)
    admin/              admin studio (admin-only)
  components/
    layout/             shared sidebar shell, role gate, nav
    site/               public header, footer, cards, enquiry form
    ui/                 buttons, fields, modal/drawer, tables, stat cards, motion helpers
  lib/
    api.ts              fetch wrapper (Bearer token, ApiError {code, message})
    queries.ts          TanStack Query hooks for every resource + useAction for writes
    types/              the same TypeScript types as the mobile app
```
