# Ansita – Manual QA Checklist

Use this before every client demo or release. Tick each box on **one Android phone and one iPhone** (Expo Go or the preview build). The app is light-only: it should stay light even when the phone is in dark mode.

**Before you start:** Settings → Demo → **Reset demo data**. The seed is generated around today's date, so the bookings and dates below are always relative to "today".

There are no demo accounts. Sign in as admin with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` set in `backend/.env` before seeding, and register a fresh customer account (A7) for the customer checks.

Automated checks cover the business rules below the UI. Run `npm run verify` first; it must pass before manual QA starts.

---

## 1. First launch, onboarding & auth

| # | Steps | Expected | ✓ |
|---|---|---|---|
| A1 | Fresh install (or Settings → Replay onboarding, then sign out) and open the app. | Native splash (logo on ivory/dark) hands over to the animated splash with no blank flash, then onboarding. | ☐ |
| A2 | Swipe through the 2 onboarding slides; tap **Get started**. | Dots animate; lands on Login. Onboarding never shows again after this. | ☐ |
| A3 | Login with an empty form. | Inline “Enter a valid email address” and “Enter your password”. | ☐ |
| A4 | Login with your admin email / `wrong`. | Red banner “Invalid email or password.”; no navigation. | ☐ |
| A5 | Login as admin with the correct password. | Admin tabs: Dashboard, Appointments, Customers, Training, More. | ☐ |
| A6 | Sign out (More → Sign out → confirm). Sign in with the customer account from A7. | Customer tabs: Home, Book, Bookings, Profile. No course screens anywhere. | ☐ |
| A7 | Register: mismatched passwords, invalid phone (`12345`), then valid details with a new email and `98XXXXXXXX` phone. | Field errors first; then the new account is signed in on the customer tabs with 0 points. | ☐ |
| A8 | Register again with the same email. | “An account with this email already exists.” | ☐ |
| A9 | Forgot password: unknown email. | “No account found with this email.” | ☐ |
| A10 | Forgot password for the customer account from A7: request code, enter a wrong code, then the demo code shown on screen with a new password. | Wrong code is rejected; success returns to Login with the email filled in; the new password works and the old one doesn't. | ☐ |

## 2. Customer – browsing & booking

| # | Steps | Expected | ✓ |
|---|---|---|---|
| B1 | Open Home. | Skeletons, then greeting, loyalty card, next visit, auto-scrolling offer banners, popular services. No courses section. | ☐ |
| B2 | Pull down to refresh on Home, Book, Bookings, Notifications. | Spinner shows and the list reloads. | ☐ |
| B3 | Book tab: search “facial”, then filter by a category chip, then search “zzz”. | Results narrow; “No services found” empty state with **Clear filters**. | ☐ |
| B4 | Open a service → **Book this**. | Booking opens on step 2 (Stylist) with the service selected. | ☐ |
| B5 | Booking step 1: select a Hair service and a Nails service. | Footer warns “Can't combine”; **Next** disabled. Remove one to continue. | ☐ |
| B6 | Step 2: pick **Any available**; step 3: check the calendar. | Days when no qualified stylist works, and parlour holidays, are greyed out. | ☐ |
| B7 | Step 4: pick a slot. | Only free start times that fit the total duration are listed; with “Any”, the assigned stylist's name shows. | ☐ |
| B8 | Use the system back gesture / hardware back on step 4. | Goes back one step (to Date), not out of the flow. | ☐ |
| B9 | Step 5: add a note, choose eSewa, **Confirm booking**. | Success screen with checkmark animation and a haptic; status **Pending**. | ☐ |
| B10 | Tap **Add to calendar**, then **View my bookings**. | “Added to your calendar (demo)” toast; Bookings → Upcoming shows the new booking as Pending. | ☐ |
| B11 | **Conflict**: start a new booking at exactly the same date/time as B9 (same customer, any stylist). | That time isn't offered for the same stylist; if forced via “Any”, the server rejects it with a clear message and returns to step 4. | ☐ |

## 3. Customer – my appointments

| # | Steps | Expected | ✓ |
|---|---|---|---|
| C1 | Bookings → Upcoming → **Reschedule** the B9 booking to another day/time. | Same stylist; only free slots; toast “Reschedule requested”; status back to **Pending**. | ☐ |
| C2 | **Cancel** an upcoming booking: pick a reason, add a note, confirm. | Moves to the Cancelled tab with the reason shown; admin gets a notification (see E1). | ☐ |
| C3 | Past tab: on the newest completed visit, **Rate & review** (4★ + comment). | Toast “Thank you…”; the card now shows the stars; the button disappears. | ☐ |
| C4 | Past/Cancelled: **Rebook**. | Booking opens with the same services and stylist prefilled. | ☐ |
| C5 | Empty states: a tab with no bookings. | Friendly empty state with a CTA, not a blank screen. | ☐ |

## 4. Customer – profile, notifications

| # | Steps | Expected | ✓ |
|---|---|---|---|
| D5 | Profile → Edit profile: clear the name, invalid email; then valid changes. Back out without saving. | Field errors; leaving with edits asks “Discard changes?”. After saving, Home greets the new name. | ☐ |
| D6 | Profile photo: gallery, camera (deny permission once), remove. | Photo updates everywhere; denied camera shows a helpful toast. | ☐ |
| D7 | Preferences: favourite stylist, payment method, reminders, offer alerts. | Saved instantly; a new booking preselects the favourite stylist and payment method. | ☐ |
| D8 | Loyalty history. | Tier card (Silver/Gold/Platinum), progress to next tier, points per completed visit. | ☐ |
| D9 | Language → नेपाली, then back. | Tab labels, titles and main buttons switch language; content stays English. | ☐ |
| D10 | Help & contact: Call, WhatsApp, Get directions, FAQ. | Opens dialer / WhatsApp / maps (or a toast if unavailable); FAQ expands. | ☐ |
| D11 | Notifications: open one unread, then **Mark all read**. | Tapping opens the related screen and marks it read; badge counts drop to 0. | ☐ |

## 5. Admin – dashboard & appointments

| # | Steps | Expected | ✓ |
|---|---|---|---|
| E1 | As admin, open Dashboard right after C2/B9. | Pending count and list include the customer's booking; notifications bell has unread items. | ☐ |
| E2 | Charts: drag on the revenue line; tap a top-services bar. | Tooltip with date and rupees; bar caption shows the full service name. | ☐ |
| E3 | Pending row → **Confirm**. | Toast; row leaves the list; customer sees **Confirmed** and a notification (switch role to check). | ☐ |
| E4 | Appointments → **Schedule**: tap days on the week strip, use the arrows and **Today**; pick one stylist chip. | Dots mark days with bookings; holidays are struck through. The day lists bookings under To do / Done / Cancelled & no-show; pending ones have an inline **Confirm**. | ☐ |
| E5 | Tap the grid icon on a day, then tap an empty slot. | Staff timeline with day-off columns greyed and a red “now” line today; the new-booking form opens prefilled with stylist, date and time. Tap the list icon to go back. | ☐ |
| E5b | **Requests** tab: confirm one; then **History** with the Completed / Cancelled / No-show chips. | The tab shows the pending count; a confirmed booking leaves Requests; History lists past bookings newest first and filters by status. | ☐ |
| E6 | **New appointment** (walk-in): add a new customer inline (try a duplicate phone first). | Duplicate phone is rejected; the new customer is created and selected. | ☐ |
| E7 | **Conflict detection**: pick a stylist and a time already booked. | Busy slots are disabled; the conflict panel lists that day's bookings and marks the clash; **Book** stays disabled. | ☐ |
| E8 | Book a valid walk-in. | Created as **Confirmed**; opens its detail screen. | ☐ |
| E9 | Detail of a future confirmed booking: **Mark completed** (or **Complete & take payment**). | Asks “Complete before the booked time?”; after confirming, the booking moves to today ending now, shows Completed, and appears in today’s Schedule. | ☐ |
| E10 | Detail of a started confirmed booking: **Complete & take payment** with an amount above the balance, then a partial amount. | Over-balance rejected inline; partial recorded; status Completed / Partly paid; customer earns points at the configured rate. | ☐ |
| E11 | Record the remaining balance. | Payment status **Paid**. | ☐ |
| E12 | **Mark no-show** on a started booking; **Cancel** another with an admin reason. | Confirm dialogs; statuses update; customer notified of the cancellation. | ☐ |
| E13 | **Reschedule** from admin, then **Delete booking** on a test booking. | Edit form prefilled; delete asks to confirm and removes it everywhere. | ☐ |

## 6. Admin – customers, services, staff

| # | Steps | Expected | ✓ |
|---|---|---|---|
| F1 | Customers: search by name and by phone digits; filter VIP; sort by Top spend. | Correct results; virtualised list scrolls smoothly. | ☐ |
| F2 | Customer profile: Call / WhatsApp / Book; toggle tags; edit notes; adjust points by `-99999`. | Deep links open; tags and notes save; points never go below 0. | ☐ |
| F3 | Delete a customer who has an upcoming booking. | Refused: “Cancel this customer's upcoming appointments first.” | ☐ |
| F4 | Add a customer with an invalid email / postal code. | Inline errors; valid data creates and opens the profile. | ☐ |
| F5 | Services: switch a service off. | It disappears from the customer catalogue and booking flow immediately. | ☐ |
| F6 | Edit a price; add a service; delete a service with upcoming bookings. | Price updates for new bookings only; delete is refused with advice to switch it off. | ☐ |
| F7 | Categories: add one (icon + colour); delete a non-empty one. | Created; non-empty delete refused. | ☐ |
| F8 | Staff → a stylist: change days in the schedule; set a day off on a weekday that has bookings. | Refused: “N upcoming bookings fall outside the new hours…”. | ☐ |
| F9 | Try to drag a shift's end before its start; then make a valid change. | The steppers stop at the other end (end can't precede start); the valid change saves and the customer calendar reflects it. | ☐ |
| F10 | Deactivate a stylist with upcoming bookings. | Refused with a count. | ☐ |

## 7. Admin – training centre

| # | Steps | Expected | ✓ |
|---|---|---|---|
| G1 | Training → Courses → create a course with 2 syllabus modules; leave a module title empty first. | Field error on the module; then created and opens the course. | ☐ |
| G2 | Add a batch: pick an end date, then move the start date after it; fix it and save. | Inline “Ends before it starts”; then the batch is listed with seats. | ☐ |
| G3 | **Enroll student** at the desk with a partial first payment above the fee, then a valid one. | Over-fee rejected inline; enrollment **Active** with the paid amount. | ☐ |
| G3b | **Enroll student** → Choose student → **New student**: enter a name and phone, add, then enroll. | The new student is selected straight away and shows the **Student** tag under Customers. | ☐ |
| G4 | Fee dues tab: **Record** a payment for the top student. | Total outstanding drops; student shows the new balance. | ☐ |
| G5 | Course → ongoing batch → **Take attendance**: mark one Late, one Absent, save. Re-open the same date. | Saved; re-opening shows the saved marks; attendance % updates in the enrollment. | ☐ |
| G6 | Enrollment of Rojita Maharjan (Nail Art, completed): **Issue certificate**. | Certificate preview card; Share/Download show demo toasts; student notified. | ☐ |
| G7 | An active enrollment with a balance: **Issue certificate** is disabled with a reason; **Mark completed**; still blocked until fee cleared. | Clear explanations at each step. | ☐ |

## 8. Reports & settings

| # | Steps | Expected | ✓ |
|---|---|---|---|
| H1 | Reports: switch 7 / 30 / 90 days / This month / Custom range. | All figures and charts update; **Export** shows “Exported … (demo)”. | ☐ |
| H2 | Business settings: clear the phone and email, then change opening hours. | Inline errors on phone/email; close time can't be set before open; valid hours save and appear in customer Help & contact. | ☐ |
| H3 | Add a holiday on a day **with** bookings, then on a free day. | First refused with the booking count; second blocks that day in both booking calendars. | ☐ |
| H4 | Loyalty rule: Rs. 50 per point; complete a booking (E10). | Points awarded at the new rate; Home and Loyalty history show the new rate. | ☐ |
| H5 | Turn off **Cancellations** alerts; cancel a booking as the customer. | No new admin notification. Turn it back on. | ☐ |

## 9. Cross-cutting

| # | Steps | Expected | ✓ |
|---|---|---|---|
| X1 | **Role switch**: Settings → View the app as → Customer, then Admin. | Lands on the other role's tabs without signing out; no stale Settings screen left on top. | ☐ |
| X2 | **Persistence**: make a booking, switch language, then force-quit and reopen. | Still signed in on the same role; booking and language are kept; onboarding doesn't reappear. | ☐ |
| X3 | **Reset demo data** while signed in. | Fresh seed around today; your session, theme and language are kept; changes from this session are gone. | ☐ |
| X4 | **Offline (mock)**: Settings → Simulate offline. Pull to refresh a loaded list, open a screen you haven't visited, then try to book. | Offline banner at the top. Loaded lists keep their data with a “Couldn’t refresh · Retry” notice; new screens show “Couldn’t load this” with **Try again**; actions fail with a toast. Tap the banner to reconnect and everything works. | ☐ |
| X5 | Network errors: Demo data tools → Simulate network errors. Use the app for a minute. | Random failures show friendly messages; nothing crashes; retry works. | ☐ |
| X6 | Unsaved changes: edit a customer/service/staff/course form, then press back. | “Discard changes?” dialog; **Keep editing** stays. | ☐ |
| X7 | Keyboard: on small phones, fill forms near the bottom (notes, booking review, business settings). | Focused field is never hidden; tapping outside or dragging dismisses the keyboard. | ☐ |
| X8 | **Light-only + fonts**: set the phone to dark mode, then walk through Home, Booking, Dashboard, Reports, certificate; switch to नेपाली. | App stays light; all text is in Poppins (Nepali too) with no clipped matras. | ☐ |
| X9 | Accessibility: largest system font size; TalkBack/VoiceOver on Login, Home, Booking. | Text scales (capped at 1.5×) without overlapping; controls are announced with sensible labels. | ☐ |
| X10 | Reduce motion on (OS setting). | Skeletons stop shimmering; list entry animations are skipped. | ☐ |
| X11 | Tablet / iPad. | Content centred at a readable width; nothing stretched edge to edge. | ☐ |
| X12 | Haptics: confirm, cancel, error toast, tab switch. Then Settings → Haptic feedback off. | Gentle vibrations; none after switching off. | ☐ |
| X13 | Android hardware back on: tab roots, a bottom sheet, a dialog, Booking step 3. | Closes sheet/dialog first; steps back in booking; exits only from a tab root. | ☐ |

---

## Known limitations of the demo

These are by design for a client demo; see the README's *Backend Migration Guide* for how each goes away.

- **No real backend.** All data lives on the device (AsyncStorage) and is generated from a seed. Two phones never share data; a customer booking only “reaches” the admin on the same device (via the role switcher).
- **No real payments.** eSewa, Khalti, Fonepay and card are labels. Admins *record* payments; nothing is charged or verified.
- **No push notifications.** Notifications are in-app records only. Reminder preferences are saved but nothing is scheduled.
- **No email/SMS.** Password-reset codes are shown on screen. Booking confirmations are in-app notifications only.
- **Security is simulated.** Passwords are stored in plain text in the demo store and role checks run on the device. A real backend must enforce authorisation server-side.
- **Mocked actions:** Add to calendar, report CSV export, certificate download/share, “offline” banner.
- **Single parlour, single currency (NPR), English content.** The Nepali toggle covers main labels only and needs a native-speaker review.
- **Portrait only.** Tablets get centred layouts but no landscape mode.
- **Placeholder business details** (phone, address, map pin) until changed in Business settings.
