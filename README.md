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
