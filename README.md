# Satorial — AI Retail OS for Menswear

A single-shop operating system for a high-end men's retail / custom-tailoring boutique. Built around an AI partner that can both *advise* and *propose actions* (with your one-tap approval).

## What's inside

- **Dashboard** — revenue, margin, inventory value, at-risk orders, top sizes.
- **Inventory** — master Styles with size × color **matrix** view (à la Lightspeed), per-variant SKUs and Code-128 barcodes, low-stock alerts, printable label sheets.
- **Scan** — open camera, scan any barcode (ZXing), adjust stock or quick-sell.
- **Sales** — full POS ticket (cart + tax + discount + payment) **or** scan-and-log; charts for daily revenue, top categories, top sizes.
- **Customers** — book with lifetime spend, full **measurement history** (each record dated), preferences, linked appointments and sales.
- **Appointments** — custom suit, rental, fitting, alteration, consultation; **6-stage workflow** (scheduled → measured → cut → first fitting → second fitting → ready → delivered); event date, garment-expected date, deposit/balance tracking; **group/wedding-party orders** that bundle members under one event.
- **Finance** — trailing P&L (revenue, COGS, expenses, gross/operating profit), **booked future revenue** from open custom-suit & rental orders, balances to collect, open purchase orders, expense logging.
- **Campaigns** — email + SMS to your client book. Audience segments (VIP, recent, lapsed, rentals only, single customer). Manual / scheduled / **birthday / anniversary / holiday / event** triggers. AI-drafted subject and body. Tokens: `{{first_name}}`, `{{name}}`, `{{shop_name}}`.
- **Social Hub** — Instagram, Facebook, X, TikTok, LinkedIn. One composer, per-platform overrides, schedule or post-now, history of every post.
- **AI Partner** — Anthropic Claude. Grounded in a live snapshot of your business (inventory, sales, appointments, finance). Proposes tool calls (adjust stock, draft social post, draft campaign, recommend purchase order, set appointment stage) — **nothing executes without your tap**.
- **Settings** — staff (owner/manager/sales/tailor with PINs), Clover POS, Twilio SMS, Resend email integrations.

## Run it

```bash
npm install
cp .env.example .env.local   # add your keys
npm run dev
```

Visit http://localhost:3000.

## Environment

```
ANTHROPIC_API_KEY=sk-ant-...        # enables AI Partner + AI drafts (works without — falls back to a local snapshot summary)
ANTHROPIC_MODEL=claude-sonnet-4-6   # optional override
SATORIAL_DB_PATH=./data/satorial.db # optional override
```

Per-channel credentials are configured in **Settings → Integrations** (stored in the local DB):

- **Clover POS** — Merchant ID + API token. Pulls inventory, pushes every sale, mirrors stock adjustments.
- **Twilio** — Account SID + Auth Token + From number. Powers SMS campaigns.
- **Resend** — API key + verified From address. Powers email campaigns.
- **Social** (per platform) — long-lived access token + account/page ID, set in **Social → Connect**. Disconnected channels still work end-to-end in *simulation* mode so you can preview the workflow.

## Architecture

- **Next.js 14** (App Router, server components by default), **TypeScript**, **Tailwind**.
- **SQLite** via `better-sqlite3`. Schema migrates on first boot. Seed data (sample inventory, customers, sales, appointments) loads if tables are empty.
- **Anthropic SDK** with Claude tool-use for action proposals.
- **ZXing** for in-browser barcode scanning, custom Code-128 SVG renderer for printable labels.
- **Recharts** for finance/sales analytics.
- All write paths are server routes (`app/api/**`).

## Data model (highlights)

```
styles          — master products (style_code, base price, is_rental)
items           — variants (sku, barcode, color, size, qty, reorder_point)
customers       — book
measurements    — dated history per customer
group_orders    — wedding parties / events
appointments    — custom_suit | rental | fitting | alteration | consultation
                  with stage, event_date, garment_expected_date, deposits
sales           + sale_items   — POS + scan-and-log; size_at_sale snapshot
purchase_orders + items        — inbound stock + finance
expenses                       — operating expenses by category
campaigns + campaign_sends     — email/SMS marketing + delivery log
social_connections + posts     — channels + outbound posts
integrations                   — provider config (clover/twilio/resend)
staff                          — users with role + PIN
ai_messages                    — chat history
ai_actions                     — log of AI-proposed actions executed
```

## Deployment

### TL;DR

| Host | Persistent data | Setup difficulty | Recommendation |
|------|-----------------|------------------|----------------|
| **Railway / Render / Fly.io** | ✅ persistent disk for SQLite | Easy | **Best for this app** |
| **Vercel** + Turso/libsql | ✅ remote SQLite | Medium | Good for production on Vercel |
| **Vercel** (file-based) | ⚠️ data wiped between cold starts | Easiest | Only for demo / preview |

### Vercel (preview / demo only)

Vercel's filesystem is read-only outside `/tmp`, and `/tmp` is wiped between
cold starts — so customer / inventory / sales data will not persist.

The app auto-detects Vercel and writes to `/tmp/satorial.db` so it
doesn't crash. If you've already deployed and seen the error page:

1. Vercel → Project → Settings → Environment Variables → add
   `SATORIAL_DB_PATH` = `/tmp/satorial.db` as a safety net.
2. Add `ANTHROPIC_API_KEY` if you want live AI.
3. Redeploy.

### Vercel + Turso (recommended for production on Vercel)

[Turso](https://turso.tech) gives you a free hosted libsql/SQLite database
that survives serverless cold starts. To migrate (planned, not yet
shipped — open an issue if you want it prioritized):

1. `turso db create satorial`
2. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Vercel env.
3. Swap `lib/db.ts` to use `@libsql/client` (~30 min change).

### Railway / Render / Fly.io (recommended)

These platforms support persistent volumes and long-running Node
processes, which is what `better-sqlite3` was designed for.

**Railway** example:
1. New project → Deploy from GitHub.
2. Add a volume mounted at `/data`.
3. Set env: `SATORIAL_DB_PATH=/data/satorial.db`.
4. Add `ANTHROPIC_API_KEY` and any integration creds.
5. Deploy. Data persists across restarts.

## Notes

- Pages are dynamic (server-rendered) so dashboard numbers always reflect the live DB.
- The AI never writes to your data unless you click **Approve** on a proposed action card.
- Social-media posts to disconnected channels are saved with a `sim-…` ID so the workflow is testable without API keys.
- Clover sync respects your existing SKUs (upsert on conflict).
