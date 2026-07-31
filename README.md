# VEMCO

A furniture storefront, an admin panel, and a point-of-sale till sharing a single SQLite database. Next.js 14 (App Router), TypeScript, Tailwind CSS, and Stripe Checkout Sessions. Priced in PKR.

> **Status:** the build is green and `npm run verify` runs six gates over it — types, 168 tests, 36 WCAG AA colour pairings, no raw colour literals, a production build, and 132 accessibility checks across 22 routes. The blocking security items listed here previously are fixed; what remains is under [Known Issues](#known-issues).

---

## Overview

Three surfaces run off one database, so a stock change in any of them is immediately visible in the others:

| Surface | Routes | Purpose |
|---|---|---|
| **Storefront** | `/`, `/products`, `/products/[slug]`, `/cart`, `/favorites`, `/categories` | Browse, cart, Stripe checkout |
| **Admin** | `/admin`, `/admin/revenue`, `/admin/revenue/transactions` | Product/category/order/nav CRUD, revenue analytics, CSV export |
| **POS** | `/billing` | Walk-in sales, printable receipts, change calculation |

Plus 12 static content pages (about, contact, FAQ, shipping, careers, press, blog, accessibility, and four policy pages).

## Features

**Storefront** — product catalog with search, category filter, sorting and pagination; product detail with image gallery and related products; cart persisted to `localStorage` with cross-tab sync; favourites; Stripe Checkout with working success and cancel pages.

**Admin** — full CRUD for products (with image upload), categories (hierarchical), navigation items and social media links; order list with manual "mark as paid"; dashboard stats.

**Revenue** — a `revenue_transactions` table populated by SQL triggers whenever a receipt is created or an order becomes paid. Overview (today / month / year with growth comparison), time-series analytics, filterable transaction list, and CSV export.

**POS** — product search and quick-add grid, live totals with tax, cash/card/UPI/bank payment methods, automatic change calculation, atomic stock decrement, and a print-optimized receipt.

## Tech Stack

- **Framework** — Next.js 14.2 (App Router), React 18, TypeScript 5.7 (strict)
- **Styling** — Tailwind CSS 3.4 with a custom theme, Framer Motion for animation
- **Database** — SQLite via `better-sqlite3` (synchronous, WAL mode, foreign keys on)
- **Payments** — Stripe (Checkout Sessions)
- **Icons** — Lucide React

## Getting Started

**Requirements:** Node.js 18+ and a toolchain that can build `better-sqlite3` native bindings.

```bash
git clone https://github.com/Arslan-Alizahi/vemco-store.git
cd vemco-store
npm install

cp .env.example .env.local   # then fill in your Stripe test keys
npm run dev
```

Open <http://localhost:3000>. The SQLite database and its tables are created automatically on the first request — there are no migration commands to run.

The database seeds itself with a demo catalogue on first run — twenty products with photographs, descriptions and dimensions. The admin panel can clear it.

Admin access needs one command, because there is deliberately no default password:

```bash
node scripts/set-admin-env.mjs "your-password"
```

That writes `AUTH_SECRET` and `ADMIN_PASSWORD_HASH` into `.env.local` and prints the password. (`npm run admin:password` prints the two lines instead, if you would rather paste them yourself.)

Until they are set, `/admin` and `/billing` are closed — it fails shut, not open. Sign in at `/admin/login`; the session is an httpOnly signed cookie that lasts eight hours.

### Stripe setup

Online checkout needs a Stripe test secret key in `.env.local`. To exercise webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Environment Variables

See [`.env.example`](.env.example) for the full list with comments. The ones that matter most:

| Variable | Purpose |
|---|---|
| `DATABASE_PATH` | SQLite file location (default `./data/ecommerce.db`) |
| `NEXT_PUBLIC_SITE_URL` | Used to build the Stripe post-payment redirect |
| `NEXT_PUBLIC_TAX_RATE` | Tax rate as a decimal (`0.18` = 18%) |
| `STRIPE_SECRET_KEY` | Server-side Stripe key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification (not yet wired up) |

## Project Structure

```
src/
├── app/
│   ├── (storefront)/          Customer-facing pages
│   ├── admin/                 Admin dashboard + revenue module
│   ├── billing/               Point of sale
│   ├── actions/               Server actions
│   └── api/                   21 route handlers
├── components/
│   ├── layout/                Navbar, Footer
│   └── ui/                    Button, Card, Modal, Toast, Badge, …
├── hooks/                     useCart, useFavorites, useLocalStorage, useDebounce
├── lib/
│   ├── db/                    Schema, triggers, seed, migrations
│   ├── cart.ts                Cart logic (localStorage + cross-tab events)
│   ├── favorites.ts           Wishlist logic
│   ├── stripe.ts              Stripe client and helpers
│   └── utils.ts               Formatting, validation, pagination
└── types/                     Domain interfaces
```

## Database

Eleven tables: `categories`, `products`, `product_images`, `orders`, `order_items`, `billing_receipts`, `billing_items`, `nav_items`, `social_media_links`, `revenue_transactions`, and SQLite's `sqlite_sequence`.

Eight triggers keep `updated_at` current on five tables and populate `revenue_transactions` automatically — one on receipt insert, one on paid-order insert, and one on an order transitioning to paid.

Schema lives in [`src/lib/db/schema.ts`](src/lib/db/schema.ts).

## API Reference

**Products** — `GET|POST /api/products` · `GET|PUT|DELETE /api/products/[id]` · `GET /api/products/slug/[slug]`

**Categories** — `GET|POST /api/categories` · `GET|PUT|DELETE /api/categories/[id]`

**Orders** — `GET|POST /api/orders` · `GET|PUT /api/orders/[id]/status`

**Billing** — `GET|POST /api/billing`

**Navigation** — `GET|POST /api/nav` · `GET|PUT|DELETE /api/nav/[id]`

**Social media** — `GET|POST /api/social-media` · `GET|PUT|DELETE /api/social-media/[id]`

**Stripe** — `POST /api/stripe/create-payment` · `GET /api/stripe/verify-payment` · `GET /api/stripe/check-payment` · `POST /api/stripe/webhook` · `POST /api/stripe/save-payment-link`

**Admin** — `GET /api/admin/revenue/overview` · `/analytics` · `/transactions` · `/export` · `POST /api/admin/migrate`

**Uploads** — `POST|DELETE /api/upload`

## Deployment

`better-sqlite3` is a native synchronous module that writes to a local file, so this app **cannot run on Vercel, Netlify, or any serverless platform**. It needs a single long-lived Node process with a persistent volume — a VPS, Fly.io, Railway, or a container host.

```bash
npm run build
npm start
```

To deploy on serverless infrastructure, the data layer would need to move to Postgres or Turso.

## Known Issues

**Fixed** — these were the blocking items and are now closed, each with a test that fails if it comes back:

- Order prices are read from the catalogue. `POST /api/orders` takes only `product_id` and `quantity`; sending `unit_price: 1` for a Rs 185,000 sofa used to produce an order totalling Rs 1.18, and the payment was raised against that total.
- One currency. The display said PKR while the payment code said `'usd'` and multiplied a rupee total by 100, so that same sofa was billed at roughly $185,000.
- The webhook verifies Stripe's signature against the raw body. It previously trusted any JSON posted to it, so a forged request could mark any order paid.
- Server-side sessions. Admin was a `localStorage` flag and a password literal in the client bundle, guarding a *page* while every API route stayed open: `curl -X PUT /api/products/1` returned 200 with no credentials, and `GET /api/orders` returned every customer's name, email, phone and address. Middleware now covers the pages, the whole mutating API, and the routes that expose customer records.
- `/order/cancel` is reachable. Payment Links have no cancel destination; Checkout Sessions take both URLs.
- The `stripe_*` columns are in the schema. They lived only in a migration nothing ever imported, so the payment route wrote to columns that did not exist.
- Parameterised SQL in the revenue analytics route and a whitelisted sort direction on `/api/products`.
- Uploads take their extension from the validated MIME type, not the supplied filename, and `DELETE /api/upload` resolves the path and checks it stays inside the uploads directory.

**Open**

1. **Stock is decremented when an order is created, not when it is paid.** An abandoned checkout holds inventory until someone notices. A reserve-then-release model with a TTL is the fix.
2. **Revenue is never reversed on refund**, and the trigger can double-count if an order's payment status cycles.
3. **`orders.status` never advances past `processing`.** There is no fulfilment flow.
4. **Rate limiting is in-process.** It resets on restart and does not span instances, which holds for a single-node SQLite deployment and would not behind more than one.

**Before going live**

Confirm your Stripe account can settle `NEXT_PUBLIC_CURRENCY`. Stripe does not onboard businesses located in Pakistan, so if that is where this shop trades, the account — not the code — is the constraint to resolve.

## Roadmap

- [x] Fix type errors and get the build green
- [x] Server-side session auth + middleware over all mutating routes
- [x] Stripe webhook signature verification
- [x] Server-side price and tax recalculation at order creation
- [x] Test coverage for checkout and the payment path
- [ ] Reserve-then-release inventory model with a TTL
- [ ] Order fulfilment status transitions
- [ ] Refund handling and revenue reversal
- [ ] Email notifications
- [ ] Performance budgets in CI
