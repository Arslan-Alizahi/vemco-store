# ModernStore

An eCommerce storefront, an admin panel, and a point-of-sale billing system sharing a single SQLite database. Built with Next.js 14 (App Router), TypeScript, and Tailwind CSS, with Stripe Payment Links for online checkout.

> **Status:** work in progress. The production build does not currently pass type-checking, and several security items are open. See [Known Issues](#known-issues) before deploying.

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

**Storefront** — product catalog with search, category filter, sorting and pagination; product detail with image gallery and related products; cart persisted to `localStorage` with cross-tab sync; favorites/wishlist; Stripe Payment Link checkout with success and cancel pages.

**Admin** — full CRUD for products (with image upload), categories (hierarchical), navigation items and social media links; order list with manual "mark as paid"; dashboard stats.

**Revenue** — a `revenue_transactions` table populated by SQL triggers whenever a receipt is created or an order becomes paid. Overview (today / month / year with growth comparison), time-series analytics, filterable transaction list, and CSV export.

**POS** — product search and quick-add grid, live totals with tax, cash/card/UPI/bank payment methods, automatic change calculation, atomic stock decrement, and a print-optimized receipt.

## Tech Stack

- **Framework** — Next.js 14.2 (App Router), React 18, TypeScript 5.7 (strict)
- **Styling** — Tailwind CSS 3.4 with a custom theme, Framer Motion for animation
- **Database** — SQLite via `better-sqlite3` (synchronous, WAL mode, foreign keys on)
- **Payments** — Stripe (Payment Links)
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

The database starts **empty**. Add categories and products through `/admin` (default password is set in `.env.example`; see the auth caveat under Known Issues).

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

These are tracked and unfixed. Read them before putting this in front of real customers or real money.

**Blocking**

1. **The production build fails.** `npm run build` reports 23 TypeScript errors and does not complete. Dev mode works.
2. **The Stripe webhook does not verify signatures.** `POST /api/stripe/webhook` trusts its JSON body, so a forged request can mark any order paid.
3. **Admin auth is client-side only.** The gate is a `localStorage` flag with a hardcoded password. No API route checks it, so all write endpoints — products, categories, orders, uploads, revenue export — are open. `/billing` has no gate at all.
4. **Stripe columns are missing from the base schema.** A fresh database lacks `stripe_session_id` and the `stripe_*` order columns, which breaks payment verification on first deploy.
5. **Order prices are taken from the request body.** `POST /api/orders` does not re-read prices from the database, allowing a crafted request to set its own total.

**High**

6. SQL injection via string interpolation in `/api/admin/revenue/analytics` and in the `ORDER BY` clause of `/api/products`.
7. Path traversal in `DELETE /api/upload`, and the upload handler derives file extensions from the client-supplied filename.
8. Stock is decremented when an order is created rather than when it is paid, so abandoned checkouts leak inventory permanently.

**Medium** — the revenue trigger can double-count if an order's payment status cycles; revenue is never reversed on refund; the admin dashboard's revenue card sums only the last 10 orders and includes unpaid ones; `orders.status` is never advanced past `pending`; `/order/cancel` is unreachable because no `cancel_url` is configured.

## Roadmap

- [ ] Fix type errors and get the build green
- [ ] Server-side session auth + middleware over all mutating routes
- [ ] Stripe webhook signature verification
- [ ] Server-side price and tax recalculation at order creation
- [ ] Reserve-then-release inventory model with a TTL
- [ ] Order fulfillment status transitions
- [ ] Email notifications
- [ ] Test coverage for checkout and revenue paths
