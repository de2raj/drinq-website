# DRINQ — drinq.sg

Online shop for DRINQSG PTE LTD. Next.js 16 + React 19 + Prisma (SQLite), the same stack as the Alcools ERP.

## Run it on the Mac

```bash
export PATH=~/.local/node/bin:$PATH
cp .env.example .env        # first time only, then fill it in
npx prisma db push          # first time / after schema changes
npm run dev                 # http://localhost:3100
```

## What's built

| Page | Address |
|---|---|
| Home | `/` |
| Section pages (7) | `/whisky`, `/spirits`, `/wine`, `/beer`, `/mixers`, `/party`, `/deals` |
| Sub-category pages (25) | e.g. `/whisky/single-malt`, `/spirits/gin` |
| Product pages (518) | `/p/<slug>` |
| Search | `/search?q=…` (plus instant suggestions in the header) |
| Cart | drawer on every page + `/cart` |
| Checkout | `/checkout` — details, address, delivery day & slot, payment, 18+ |
| Order page | `/order/<private token>` — PayNow QR or paid confirmation |
| Info | `/delivery`, `/faq`, `/contact`, `/terms`, `/privacy` |
| Orders (staff) | `/admin` — user `admin`, password `ADMIN_PASSWORD` |

Filters on section, sub-category and search pages: brand (searchable), price, size, in stock; sort; 24 at a time with Load more. Filters are kept in the address bar.

## How it works

- **Products** come from `data/catalogue.json`, read only by `src/lib/catalogue.ts`.
  Today that file is a copy of botello.sg's catalogue (`npm run catalogue:botello`).
  Next step: feed it from the Alcools ERP (DRINQ prices and stock) — only `catalogue.ts` changes.
- **Menu grouping** of categories into sections: `src/lib/sections.ts`.
- **Shop rules** (free delivery threshold, delivery fee, slots, lead time): `src/lib/config.ts`.
- **Prices are re-checked on the server** at checkout; the browser's prices are never trusted.
- **Payments**
  - PayNow QR: always on. The order page shows a QR for the exact amount to UEN `PAYNOW_UEN` with the order number as reference. Staff mark it paid in `/admin` once the money arrives.
  - Card / Apple Pay / Google Pay: Stripe Checkout, switched on by setting `STRIPE_SECRET_KEY` (and `STRIPE_WEBHOOK_SECRET` for the webhook at `/api/stripe/webhook`, events `checkout.session.completed` and `checkout.session.async_payment_succeeded`).
- **Orders** are stored in the SQLite database (`prisma/drinq.db`), numbered `DQW-00001`…
- **No emails are sent** yet.
- **Singapore liquor rule**: no deliveries between 10.30pm and 7am; slots run 10am–10pm.

## Assumed — please confirm

- Free delivery from $80; $10 delivery below that; earliest slot 3 hours after ordering; 4 slots a day, 14 days ahead.
- Prices = Botello's website prices for now.
- Telegram link (`NEXT_PUBLIC_TELEGRAM_URL`).
- Terms and Privacy pages are drafts.

## Still to do

- Feed products, prices and stock from the Alcools ERP, and send paid web orders into the ERP.
- Payment gateway account (Stripe keys) and PayNow confirmation process.
- Hosting: GoDaddy plan type decides where this runs (needs a server that can run Node.js).
- Own copies of product photos (currently loaded from botello.sg).
- Order emails / Telegram notifications (with approval).
- Design changes from review.

`mockups/` holds the earlier design mockups (not part of the site).
