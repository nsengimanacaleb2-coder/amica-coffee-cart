# Amica House Coffee Cart Booking Management System

A full-stack booking platform: customers book coffee carts for events, admins manage carts, bookings, customers, and payments.

**Stack:** Node.js + Express (backend/API) · MySQL (database) · plain HTML/CSS/JS (frontend, served as static files by Express).

> ⚠️ This code was written in a sandbox with no internet access and no MySQL server, so it could not be run or tested live here. It follows standard, well-tested Express/MySQL patterns — follow the steps below on your own machine and it will run.

## 1. Prerequisites

- Node.js 18+ installed
- MySQL 8+ installed and running

## 2. Set up the database

```bash
mysql -u root -p < database/schema.sql
```

This creates the `amica_coffee_cart` database and all five tables (`users`, `coffee_carts`, `bookings`, `payments`, `reviews`).

## 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your MySQL password and a random `JWT_SECRET`.

## 4. Install dependencies and seed sample data

```bash
npm install
npm run seed
```

The seed script creates:
- An admin account: `admin@amicahouse.com` / `Admin@123`
- Three sample coffee carts (Classic, Premium, Deluxe)

## 5. Run the server

```bash
npm start
```

Visit **http://localhost:3000** — the home page, services, booking flow, customer dashboard, and admin dashboard are all served from here.

## How it's organized

```
server.js              Express app entry point, mounts all routes, serves /public
config/db.js            MySQL connection pool
middleware/authMiddleware.js   JWT verification + admin-only guard
routes/authRoutes.js     register, login
routes/cartRoutes.js     coffee cart CRUD + availability check
routes/bookingRoutes.js  create/view/cancel bookings, admin approve/reject, double-booking prevention
routes/userRoutes.js     profile + admin customer management
routes/paymentRoutes.js  record and view payments
routes/reviewRoutes.js   testimonials
routes/reportRoutes.js   admin dashboard statistics
database/schema.sql      table definitions
database/seed.js         sample admin + carts
public/                  all frontend pages, css, and js
```

## How key requirements are handled

- **Preventing double booking**: `POST /api/bookings` runs inside a MySQL transaction with `SELECT ... FOR UPDATE`, so two people can't book the same cart on the same date even if requests arrive at the same instant. The cart detail page also lets a customer check a date's availability before booking.
- **Roles**: every user has `role = 'customer'` or `'admin'` in the `users` table. Customer-only and admin-only pages check this with `guardPage()` on the frontend and `requireAuth`/`requireAdmin` on the backend — so it's enforced on both sides, not just hidden in the UI.
- **Booking status lifecycle**: `Pending → Approved/Rejected`, then `Approved → Completed`, or `Cancelled` by the customer at any point before completion.
- **Passwords**: hashed with bcrypt before being stored; plaintext passwords are never saved.

## Extending it later

The spec's "future improvements" (calendar UI, Google Maps picker, WhatsApp/email notifications, online payment, analytics charts) can all be layered on top of this structure — the API already returns everything a calendar widget or charting library would need (e.g. `/api/reports/summary`, `/api/bookings?status=`).

---

## Phase 2: extended features

A large second pass added gallery/packages/menu pages, a multi-step booking flow, favorites, promo codes, analytics, security hardening, accessibility, and payment integration points. Everything below is additive — your existing data and setup keep working.

### New setup steps

```bash
# 1. Apply the new tables (packages, menu_items, favorites, promo_codes, newsletter_subscribers)
mysql -u root -p amica_coffee_cart < database/migration_v2.sql

# 2. Install the new dependencies
npm install

# 3. Seed sample packages, menu items, and a WELCOME10 promo code
npm run seed:v2

# 4. Restart the server
npm start
```

Optional — add these to `.env` to activate email and online payments (both work fine left blank; the app just logs and skips):
```
SMTP_HOST=, SMTP_PORT=, SMTP_USER=, SMTP_PASS=, SMTP_FROM=   → real booking/status emails
STRIPE_SECRET_KEY=, STRIPE_PUBLISHABLE_KEY=                  → "Pay Online" button on approved bookings
```

### What's included

- **Homepage**: stronger hero slogan, live stats (events served, carts, customers, rating), partners strip, newsletter signup
- **Gallery, Packages, Menu, FAQ**: new public pages (`gallery.html`, `packages.html`, `menu.html`, `faq.html`)
- **Multi-step booking** (`booking.html`): cart + package selection, a calendar showing booked dates, a free OpenStreetMap location picker (no API key), live price estimate, promo codes
- **Customer dashboard**: favorites, reschedule (Pending bookings), printable receipt with QR code (`receipt.html`), "Pay Online" via Stripe on approved bookings, a countdown to the next approved event
- **Admin dashboard**: Analytics tab (revenue-by-month and event-type charts via Chart.js), CSV export of bookings, and full management of Packages, Menu, Promo Codes, and Newsletter subscribers
- **Search & filters** on the Coffee Carts page (price, capacity, date availability)
- **Site-wide chatbot widget** (`js/widgets.js`) — simple keyword matching against common questions, no external AI API needed
- **WhatsApp click-to-chat** floating button
- **Accessibility**: dark mode toggle, font-size +/− controls, skip-to-content link, focus-visible outlines
- **Performance**: `loading="lazy"` on images, 1-day cache headers on static assets
- **Security**: rate limiting on auth routes (`express-rate-limit`), a lightweight built-in math captcha on registration (no external CAPTCHA service/keys needed), stricter input validation
- **Email notifications**: booking confirmation + status-change emails via `config/mailer.js` (no-ops safely until SMTP is configured)
- **Payments**: real Stripe Checkout integration; PayPal/Flutterwave/MTN MoMo/Airtel Money are stubbed in `config/payments.js` with clear TODOs, since each needs its own business account and SDK

### A note on security choices

- **CAPTCHA**: implemented as a simple math challenge signed into a short-lived JWT, rather than reCAPTCHA/hCaptcha — those need a Google/Cloudflare site key you'd have to register for. Swap it out for reCAPTCHA later by replacing `GET /api/auth/captcha` and the corresponding frontend check.
- **CSRF**: not added as separate middleware. This app authenticates with a JWT sent in an `Authorization` header (not cookies), which isn't automatically attached by the browser to cross-site requests — the classic CSRF attack vector. If you later switch to cookie-based sessions, add CSRF protection at that point.
- **HTTPS**: this is a deployment concern, not something the app code controls. Put the app behind a reverse proxy (nginx, Render, Railway, etc.) with a TLS certificate (e.g. via Let's Encrypt/Certbot) in production.

### Deliberately not included (tell me if you want these next)

SMS reminders (needs a paid Twilio/Africa's Talking account), Messenger chat (needs a Facebook Page/app), a real LLM-powered chatbot (needs an API key + hosting), referral program / loyalty points / gift cards, a full blog CMS, and real photo/video uploads (needs file storage — currently gallery images are placeholder stock photos).

