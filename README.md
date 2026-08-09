# VEMCO

A furniture storefront, an admin panel, and a point-of-sale till sharing a single Postgres database. Next.js 14 (App Router), TypeScript, Tailwind CSS, and Stripe Checkout Sessions. Priced in PKR.

> **Status:** the build is green and `npm run verify` runs six gates over it — types, 249 tests, 36 WCAG AA colour pairings, no raw colour literals, a production build, and 144 accessibility checks across 24 routes. The blocking security items listed here previously are fixed; what remains is under [Known Issues](#known-issues).

---

## Overview

Three surfaces run off one database, so a stock change in any of them is immediately visible in the others:

| Surface | Routes | Purpose |
|---|---|---|
| **Storefront** | `/`, `/products`, `/products/[slug]`, `/cart`, `/favorites`, `/categories` | Browse, cart, Stripe checkout |
| **Admin** | `/admin`, `/admin/bookings`, `/admin/customers`, `/admin/revenue`, `/admin/revenue/transactions` | Product/category/order/nav CRUD, bookings, customers, revenue analytics, CSV export |
| **POS** | `/billing` | Walk-in sales and bookings, printable receipts and bills, change calculation |

Plus 12 static content pages (about, contact, FAQ, shipping, careers, press, blog, accessibility, and four policy pages).

## Features

**Storefront** — product catalog with search, category filter, sorting and pagination; product detail with image gallery and related products; cart persisted to `localStorage` with cross-tab sync; favourites; Stripe Checkout with working success and cancel pages.

**Admin** — full CRUD for products (with image upload), categories (hierarchical), navigation items and social media links; order list with manual "mark as paid"; dashboard stats.

**Revenue** — a `revenue_transactions` table populated by SQL triggers whenever a receipt is created or an order becomes paid. Overview (today / month / year with growth comparison), time-series analytics, filterable transaction list, and CSV export.

**POS** — product search and quick-add grid, live totals with tax, cash/card/UPI/bank payment methods, automatic change calculation, atomic stock decrement, and a print-optimized receipt.

**Bookings** — furniture ordered today and collected later, which is how most of this trade works. The till takes an advance and a delivery date; the piece is committed to that customer immediately, so nobody can sell it twice. Two rules hold the feature together:

- **The balance is never stored.** It is the total minus the payments taken so far, worked out when asked. A stored balance is a second copy of the same fact and the two disagree the first time a payment is corrected.
- **Revenue follows the money, not the promise.** Every instalment files its own revenue row, so a Rs 200,000 booking with Rs 50,000 down is Rs 50,000 of takings today. Recording the whole total on booking day would put money in the books that is still in the customer's pocket.

The printed bill states the balance and the delivery date in a band at the top and lists every instalment with its date and method. `/admin/bookings` shows what is due, marks overdue collections in red, records further payments, and refuses to mark a booking delivered while money is outstanding — the furniture leaving the shop is the last leverage there is.

**WhatsApp** — the booking bill can be sent as a message. It builds a `wa.me` link with the text already written and opens WhatsApp on the shop's own phone; the shopkeeper reads it and presses send. Nothing is transmitted by this application. The alternative is the WhatsApp Business API, which needs a Meta business account, a verified number, templates approved in advance and a per-message fee — the right answer at thousands of messages a month, and a great deal of machinery for a counter that sends a few a day.

## Tech Stack

- **Framework** — Next.js 14.2 (App Router), React 18, TypeScript 5.7 (strict)
- **Styling** — Tailwind CSS 3.4 with a custom theme, Framer Motion for animation
- **Database** — Postgres (Supabase) via `postgres.js`, over the transaction pooler
- **File storage** — Supabase Storage, bucket `product-images`
- **Payments** — Stripe (Checkout Sessions)
- **Icons** — Lucide React

## Getting Started

**Requirements:** Node.js 18+ and a Postgres database. Supabase's free tier is what this is developed against.

```bash
git clone https://github.com/Arslan-Alizahi/vemco-store.git
cd vemco-store
npm install

cp .env.example .env.local   # then fill in DATABASE_URL and the Supabase keys
npm run db:check              # is the database reachable?
npm run db:seed               # the demo catalogue
npm run dev
```

Open <http://localhost:3000>. Apply [`src/lib/db/schema.sql`](src/lib/db/schema.sql) to the database once — through Supabase's SQL editor or any Postgres client — and `npm run db:seed` fills it with the demo catalogue: twenty products with photographs, descriptions and dimensions. The admin panel can clear it again.

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
| `DATABASE_URL` | Postgres connection string. Use Supabase's **transaction pooler** (port 6543), not the direct connection |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL. Public — it appears in every product image URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Uploads and deletes in Supabase Storage. **Server-only** — never give it a `NEXT_PUBLIC_` prefix |
| `SHOP_TIMEZONE` | Which day "today's revenue" means (default `Asia/Karachi`) |
| `NEXT_PUBLIC_SITE_URL` | Used to build the Stripe post-payment redirect |
| `NEXT_PUBLIC_TAX_RATE` | Tax rate as a decimal (`0.18` = 18%) |
| `STRIPE_SECRET_KEY` | Server-side Stripe key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `DATABASE_POOL_MAX` | Connections per instance (default 3). Only worth changing under load |
| `MAINTENANCE_MODE` | `true` closes the whole site with a 503 and a "back soon" page |

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

Fifteen tables: `categories`, `products`, `product_images`, `orders`, `order_items`, `customers`, `billing_receipts`, `billing_items`, `bookings`, `booking_items`, `booking_payments`, `nav_items`, `social_media_links`, `revenue_transactions` and `demo_seed`.

Eleven triggers keep `updated_at` current on seven tables and populate `revenue_transactions` automatically — one on receipt insert, one on paid-order insert, one on an order transitioning to paid, and one on every booking payment.

Schema lives in [`src/lib/db/schema.sql`](src/lib/db/schema.sql). It is applied to Supabase as a migration, and the order tests build a scratch schema from the same file, so there is one description of the tables rather than two that drift.

**Every table has row-level security on and no policies.** Supabase publishes the `public` schema through PostgREST automatically, and the anon key that reaches it ships in the browser — without RLS, anybody who visited the site could read `customers` and `orders` straight from the API. The application is unaffected because it connects as the table owner, and an owner is not subject to RLS. Adding a policy here grants the open internet direct access to that table; do it deliberately or not at all.

```bash
npm run db:check    # is the database reachable, and over which endpoint
npm run db:seed     # load the demo catalogue (--clear to remove it)
```

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

## Deploying

Two shapes, one codebase.

### The whole thing — anywhere

The database is Postgres and the images are in object storage, so nothing
needs a disk any more. Netlify, a VPS, a container host: set the environment
variables and deploy.

```bash
npm run build
npm start
```

**On Vercel, mind the plan.** Vercel's own documentation says the Hobby plan
is "strictly intended for non-commercial, personal use", and a shop taking
real orders is not that. Netlify's free tier permits commercial use, which is
why it is the default recommendation here.

This used to say the application could not run serverless at all. That was
true of `better-sqlite3`: a native module writing to a local file, on a
platform whose filesystem is read-only and per-instance. Moving the data to
Postgres and the uploads to Supabase Storage is what removed the constraint —
the trade is a network round trip per query, which is why the queries that
used to run in a loop now run once (see `getCustomerPurchases`, and the image
fetches in `/api/products`).

### The storefront alone — a catalogue with no database

```
NEXT_PUBLIC_SHOWCASE=true
```

Set that on the host and deploy. The catalogue comes from
`src/lib/db/seed.ts` rather than a database — twenty products with their
photographs, prices and dimensions, exactly what the full application shows —
and nothing opens a database at all. See `.env.showcase.example`.

What this build does: the shop, browsing, search, filtering, the cart and
favourites (both in `localStorage`, so they survive a reload).

What it does not: checkout says plainly that orders are not being taken
online yet and points at the contact page, rather than presenting a form
that would fail. The admin panel, the till and every write route are refused
outright — a half-working admin panel on a public URL is worse than none.

Anything added through the admin panel lives in Postgres and will not appear
in a showcase build. In a build with no database, `seed.ts` **is** the
catalogue.

Locally: `npm run build:showcase` then `npm run start:showcase`.

### Taking the site offline for a while

Do not delete the deployment. Set:

```
MAINTENANCE_MODE=true
```

and redeploy. Every URL then answers **503 Service Unavailable** with a "back
soon" page, and the link is unchanged. Remove the variable, redeploy, and the
shop returns exactly as it was.

The status is the part that matters. A maintenance screen served as 200 tells
a crawler that this is now the content at every URL, which is how a shop
reopens to find its product pages replaced in the search index by the words
"back soon". 503 with `Retry-After` says temporarily unavailable, and the real
pages are kept.

Set `MAINTENANCE_BYPASS` to some long random string and visiting
`/?bypass=<that string>` lets your own browser through for eight hours — so
you can check the shop before reopening it. Everyone else still sees the
notice, signed-in administrators included.

On Vercel, changing an environment variable takes effect on the next
deployment; the **Redeploy** button on the latest one is enough, no push
needed.

## Known Issues

**Fixed** — these were the blocking items and are now closed, each with a test that fails if it comes back:

- Order prices are read from the catalogue. `POST /api/orders` takes only `product_id` and `quantity`; sending `unit_price: 1` for a Rs 185,000 sofa used to produce an order totalling Rs 1.18, and the payment was raised against that total.
- One currency. The display said PKR while the payment code said `'usd'` and multiplied a rupee total by 100, so that same sofa was billed at roughly $185,000.
- The webhook verifies Stripe's signature against the raw body. It previously trusted any JSON posted to it, so a forged request could mark any order paid.
- Server-side sessions. Admin was a `localStorage` flag and a password literal in the client bundle, guarding a *page* while every API route stayed open: `curl -X PUT /api/products/1` returned 200 with no credentials, and `GET /api/orders` returned every customer's name, email, phone and address. Middleware now covers the pages, the whole mutating API, and the routes that expose customer records.
- `/order/cancel` is reachable. Payment Links have no cancel destination; Checkout Sessions take both URLs.
- The `stripe_*` columns are in the schema. They lived only in a migration nothing ever imported, so the payment route wrote to columns that did not exist.
- Parameterised SQL in the revenue analytics route and a whitelisted sort direction on `/api/products`.
- Uploads take their extension from the validated MIME type, not the supplied filename, and `DELETE /api/upload` refuses any name containing a path separator.
- Every statement goes out with at least one bound parameter. postgres.js picks the wire protocol by counting arguments, and a query with none uses the *simple* protocol, which cannot be pipelined — two of them in flight on the same connection deadlock silently, with no error and no statement timeout. It took out `/categories` and the whole revenue dashboard, because aggregate queries rarely need a parameter, while every page that happened to bind a value carried on working. `src/lib/db/index.ts` prefixes an unreferenced CTE that binds one.
- Row-level security is on for every table with no policies at all. Supabase publishes the `public` schema through PostgREST automatically and the anon key ships in the browser, so without this the customer and order tables would have been readable from the open internet, outside the application entirely.

**Open**

1. **Stock is decremented when an order is created, not when it is paid.** An abandoned checkout holds inventory until someone notices. A reserve-then-release model with a TTL is the fix.
2. **Revenue is never reversed on refund**, and the trigger can double-count if an order's payment status cycles.
3. **`orders.status` never advances past `processing`.** There is no fulfilment flow.
4. **Rate limiting is in-process.** It resets on restart and does not span instances. That was defensible on a single node; on a serverless host it is not, because every instance keeps its own count. Moving it to Postgres or an edge KV is the fix.
5. **Uploaded images are never removed when a product is deleted.** The row goes, the file stays in the bucket. It was the same on disk; object storage just makes the bill visible.

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
