# silachomka

**Official Artist Platform, Beat Store, Studio Services & Edge CMS — silachomka (chomkaMUSIC™ · Chomka Nation)**

`silachomka` is a full-stack music artist platform, digital beat store, studio services booking system, and edge-hosted content management platform built with React, Vite, Cloudflare Workers, Hono, Neon Serverless PostgreSQL, and Paystack. It powers the official public home of **silachomka** (`chomkaMUSIC™` / `Chomka Nation`) alongside a security-hardened Admin CMS for managing releases, tracks, beats, videos, gallery posts, events, studio bookings, media assets, and fan subscriptions without redeploying source code.

Live site: [https://silachomka.vercel.app](https://silachomka.vercel.app)

## Overview

The platform is architected across two web surfaces backed by a single Cloudflare Worker API and Neon Serverless PostgreSQL database:

1. **Public Artist & Commerce Platform (`/`)** — A dark-themed, atmospheric artist hub hosted on Vercel featuring full discography & release pages, a multi-currency beat store with live Selar pricing and dual preview modes, bookable studio services with Paystack checkout, music videos, an editorial visual archive, live events & interactive calendar, and an in-app conversational concierge (`Chomka AI`).
2. **Admin CMS (`/admin`)** — A 14-section authenticated management workspace for publishing and scheduling releases, tracks, beats, music videos, gallery posts, events, studio services & availability, client orders, reusable media assets, links, merchandise, subscribers, and soft-deleted items (60-day Recycle Bin).

When the live API is unreachable, the frontend store (`src/data/store.js`) gracefully falls back to the bundled canonical catalogue archive (`src/data/releases.js`, `beats.js`, `gallery.js`, `videos.js`, and `socials.js`).

## Key capabilities

### Public artist & listener experience

- **Atmospheric visual design** — Custom ambient canvas and animated background layers tailored to each section (`StarrySpaceBackground`, `HeavenlySkyBackground`, `EventsAmbientBackground`, `CalendarAmbientBackground`, and `StudioAmbientBackground`).
- **Discography & release hubs (`/`, `/music`, `/release/:slug`)** — Chronological catalogue of singles, EPs, and albums with full tracklists, featuring and producer credits, multi-platform streaming links, audio previews (`RandomPreviewPlayer`), linked music videos and gallery posts, and legacy slug resolution via `previous_slugs`.
- **Beat store & live multi-currency pricing (`/beats`, `/beats/:id`)** — Curated producer instrumental catalogue filterable by genre, mood, BPM, and key, featuring 45-second and full-track playback preview modes, exclusive license and custom beat inquiry modals (`ExclusiveBeatModal`, `CustomBeatPromptModal`), and live pricing across 12 currencies (`NGN`, `USD`, `GBP`, `GHS`, `KES`, `ZAR`, `TZS`, `UGX`, `XAF`, `XOF`, `RWF`, `ZMW`) powered by `/api/geo`, client timezone/locale heuristics, and edge-cached Selar Store API queries (`/api/beats/pricing`).
- **Studio services, scheduling & Paystack checkout (`/services`, `/services/:slug`, `/services/order/:orderNumber`)** — Bookable vocal recording, mixing & mastering, custom beat production, and consultation services with live date/slot availability (`/api/services/availability`), private client reference-file uploads (up to 100 MB), dedicated order tracking pages, server-side Paystack verification, and HMAC-SHA512 webhook fulfillment.
- **Music videos, visual archive & events (`/#videos`, `/gallery`, `/gallery/:id`, `/events`, `/events/:slug`, `/calendar`)** — YouTube visualizers and music videos linked to releases/tracks; curated image, video, and carousel gallery posts with an editorial modal viewer (`GalleryPostModal`), category filters, and social embeds; plus live events and release dates unified in an interactive calendar (`/api/calendar`).
- **Chomka AI Concierge** — Natural-language, typo-tolerant assistant (`ChomkaAiAssistantModal`, `chomkaAiKnowledgeEngine.js`) supporting acronym and alias expansion, release chronology Q&A, catalogue discovery, and studio rate guidance.
- **Technical SEO & crawler-aware social cards** — Build-time static route metadata generation (`scripts/generate-social-pages.js`), `react-helmet-async` (`SeoHead`), `robots.txt`, `sitemap.xml`, and Vercel user-agent rewrites (`vercel.json`) routing social bots (WhatsApp, X/Twitter, Facebook, Discord, Slack, Telegram, LinkedIn, iMessage) to dynamic Cloudflare Worker Open Graph endpoints (`/api/share/:type/:slug`).
- **Fan subscriptions & legal compliance** — Mailing list signup and one-click unsubscribe (`/api/subscribe`, `/api/unsubscribe`), cookie consent management (`CookieConsentBanner`), and dedicated `/privacy`, `/cookies`, and `/terms` pages.

### Admin CMS (`/admin`)

- **14-module management workspace** — Dashboard, Services & Orders, Events, Gallery, Music (Releases), Tracks, Beats, Videos, Media Library, Links, Merchandise, Subscribers, Recycle Bin, and Settings.
- **Scheduled publishing & automated maintenance** — Content marked `SCHEDULED` with a `scheduled_at` timestamp is automatically promoted to `PUBLISHED` by a daily Cloudflare Worker Cron Trigger (`0 2 * * *`), which also queues subscriber notifications, permanently purges expired 60-day Recycle Bin records, and invalidates edge cache tags.
- **Reusable Media Library & streaming** — Supports uploads up to 100 MB (`/api/admin/media-assets/upload`) stored in PostgreSQL `BYTEA` with optional Cloudflare R2 object storage (`MEDIA_BUCKET`), streamed over `/api/media/asset/:id` with `Accept-Ranges: bytes` and HTTP `206 Partial Content` byte-range support for audio/video scrubbing.
- **Tag-based edge caching** — Public API routes emit `Cache-Control`, `Cloudflare-CDN-Cache-Control`, and `Cache-Tag` headers (`CATALOGUE`, `STATIC_PUBLIC`, `AVAILABILITY`) with automatic tag invalidation middleware triggered on successful admin mutations.

## Architecture

```text
                       Browser Client (React 19 + Vite 8)
                                       |
           +---------------------------+---------------------------+
           |                                                       |
     Public Artist Platform                                  Admin CMS (/admin)
     Discography | Beats | Services | Gallery | Events       14 Management Views
           |                                                       |
           +---------------------------+---------------------------+
                                       |
                      Vercel Hosting & Edge Rewrites (vercel.json)
                 Static Assets | /api/* Proxy | Bot /api/share/* Rewrites
                                       |
                 Cloudflare Worker (Hono · worker/src/index.js)
           +-------------------+-------------------+-------------------+
           |                   |                   |                   |
     Public & Share API    Admin CRUD API     Media Streaming     Daily Cron (02:00 UTC)
     (/api/*, /api/share)  (/api/admin/*)     (HTTP 206 Range)    Publish & 60d Purge
           |                   |                   |                   |
           +-------------------+---------+---------+-------------------+
                                         |
           +-----------------------------+-----------------------------+
           |                             |                             |
   Neon Serverless PostgreSQL       Paystack & Selar APIs      Cloudflare R2 (Optional)
   Catalogue | Orders | Media       Payments & Live Pricing    MEDIA_BUCKET Object Store
```

### PostgreSQL database tables

Core schema definitions live in `worker/db/schema-proposal.sql`, `worker/db/production-migration.sql`, `worker/scripts/migrate-events.js`, and stage migration scripts in `scripts/`:

| Table(s) | Purpose |
|---|---|
| `admin_users` | Stores CMS accounts, modular `PBKDF2-SHA256` password hashes, roles (`SUPERADMIN` / `EDITOR`), and login timestamps |
| `media_assets` | Reusable media library storing `BYTEA` binaries / `r2_key` references, MIME metadata, dimensions, durations, and optimization status |
| `releases`, `tracks`, `track_credits` | Discography catalogue, per-track metadata, featuring/producer credits, platform URLs, and `previous_slugs` redirect history |
| `beats` | Beat store catalogue with BPM, key, genre/mood, audio/artwork/video asset relations, and Selar license tier URLs |
| `music_videos`, `music_video_features` | YouTube music videos and visualizers linked to releases, tracks, and featured artists |
| `gallery_categories`, `gallery_posts`, `gallery_slides` | Visual archive posts (`image`, `video`, `carousel`), ordered carousel slides, tags, and relational catalogue links |
| `events` | Live shows, appearances, and milestones feeding `/events` and `/calendar` |
| `music_services`, `service_availability`, `service_orders`, `service_private_files` | Studio service offerings, bookable dates/slots, client bookings with Paystack payment status, and token-gated reference files |
| `merchandise` | Physical/digital merchandise definitions with product lifecycle status (`PLANNED` through `AVAILABLE` / `ARCHIVED`) |
| `social_links` | Ordered artist and ecosystem social links across header, footer, connect, and gallery views |
| `subscribers`, `subscriber_notifications` | Fan newsletter subscribers, unsubscribe tokens, and queued release notification records |
| `audit_logs` | Records administrative mutations (`CREATE`, `UPDATE`, `DELETE`, `PUBLISH`, `ARCHIVE`) with entity snapshots |

## Project structure

```text
silachomka/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── eslint.config.js
├── vercel.json                        # API proxy & social crawler edge rewrites
├── .env.example                       # E2E admin credential template (secrets gitignored)
├── public/
│   ├── beats/                         # Bundled fallback beat audio, artwork & loops
│   ├── covers/                        # Bundled fallback release artwork
│   ├── robots.txt                     # Excludes /admin, /api/admin/, and private files
│   ├── sitemap.xml
│   └── ...                            # Favicons, logos & Open Graph fallback image
├── scripts/
│   ├── generate-social-pages.js       # Post-build static SEO & OG page generator
│   ├── dev-staging.js                 # Fail-closed local staging frontend launcher
│   ├── publish.js                     # CLI helper for catalogue entries
│   ├── backup-production.cjs          # Neon database backup utility
│   ├── restore-production.cjs         # Neon database restore utility
│   ├── migrate-stage*.cjs             # Incremental schema migration scripts
│   └── test-* / verify-*.cjs          # Regression & stage verification suites
├── src/
│   ├── App.jsx                        # Public & Admin router, layout shell & sections
│   ├── App.css
│   ├── index.css
│   ├── main.jsx
│   ├── components/
│   │   ├── ChomkaAiAssistantModal.jsx # Natural-language AI concierge UI
│   │   ├── GalleryPostModal.jsx       # Editorial visual archive detail modal
│   │   ├── ImmersiveServicesView.jsx  # Studio services showcase & booking UI
│   │   ├── RandomPreviewPlayer.jsx    # Discography audio preview engine
│   │   ├── ReleasePage.jsx            # Release detail & tracklist component
│   │   ├── SeoHead.jsx                # Dynamic helmet meta & JSON-LD manager
│   │   ├── StarrySpaceBackground.jsx  # Ambient celestial backdrop (& themed variants)
│   │   ├── VideosSection.jsx          # Music videos showcase
│   │   └── admin/                     # Shared CMS pickers, sort & view controls
│   ├── data/
│   │   ├── api.js                     # Public Worker REST client
│   │   ├── adminApi.js                # Authenticated Admin CMS REST client
│   │   ├── store.js                   # In-memory store with offline catalogue fallback
│   │   ├── chomkaAiKnowledgeEngine.js # NLP intent, acronym & catalogue engine
│   │   ├── CurrencyContext.jsx        # Active currency & beat playback mode provider
│   │   ├── useSelarPricing.js         # 12-currency geo heuristic + Selar pricing hook
│   │   └── *.js                       # Canonical fallback data & site configuration
│   └── pages/
│       ├── BeatsPage.jsx              # Beat store catalogue & preview player
│       ├── BeatDetailPage.jsx         # Individual beat view & licensing tiers
│       ├── ServicesPage.jsx           # Studio service booking & Paystack checkout
│       ├── ServiceOrderDetailPage.jsx # Client order confirmation & status view
│       ├── EventsPage.jsx             # Live events directory & detail pages
│       ├── CalendarPage.jsx           # Interactive release & events calendar
│       ├── GalleryPostPage.jsx        # Standalone visual archive permalink view
│       ├── LegalPages.jsx             # Privacy, Cookie Policy & Terms of Use
│       └── admin/                     # 14 Admin CMS views, auth provider & route guards
├── worker/
│   ├── package.json
│   ├── wrangler.toml                  # Cloudflare Worker config, cache & cron trigger
│   ├── run-staging.js                 # Fail-closed staging runner with Neon branch guard
│   ├── test-security-isolated.js      # Isolated auth, hashing & webhook security tests
│   ├── db/                            # SQL schemas, migrations & preflight scripts
│   └── src/
│       ├── index.js                   # Hono Worker API, media streaming, Paystack & cron
│       ├── auth.js                    # PBKDF2-SHA256 hashing, JWT & RBAC middleware
│       └── admin/
│           └── crud.js                # Protected Admin CMS CRUD & recycle bin router
├── docs/
│   └── source-of-truth/               # Brand, ecosystem & catalogue specifications
└── README.md
```

## API overview

| Access | Method & Endpoint | Description |
|---|---|---|
| Public | `GET /api/health` | Returns Worker runtime and service health status |
| Public | `GET /api/geo` | Resolves visitor country and default currency from Cloudflare edge headers |
| Public | `GET /api/releases`, `GET /api/releases/:slug` | Lists published/scheduled releases or fetches a release (supporting `previous_slugs`) |
| Public | `GET /api/tracks/:id` | Fetches an individual track with credits, platform links, and preview asset |
| Public | `GET /api/beats`, `GET /api/beats/:slug` | Lists published beats or fetches an individual beat with licensing metadata |
| Public | `GET /api/beats/pricing?currency=...` | Fetches edge-cached live beat pricing from the Selar Store API (`AUTO` or currency code) |
| Public | `GET /api/music-videos`, `GET /api/music-videos/:slug` | Fetches published music videos and visualizers |
| Public | `GET /api/gallery`, `GET /api/gallery/categories`, `GET /api/gallery/:slug` | Fetches gallery categories, posts, and carousel slides |
| Public | `GET /api/events`, `GET /api/events/:slug`, `GET /api/calendar` | Fetches published events and unified calendar entries |
| Public | `GET /api/social-links` | Returns ordered artist and ecosystem links |
| Public | `GET /api/media/asset/:id`, `GET /api/media/:folder/:file` | Streams media from PostgreSQL `BYTEA` or R2 with `Accept-Ranges` / `206` support |
| Public | `GET /api/share/:type/:slug` | Renders dynamic Open Graph / Twitter Card HTML for social crawlers |
| Public | `POST /api/subscribe`, `GET /api/unsubscribe` | Subscribes or unsubscribes fan emails from release updates |
| Services | `GET /api/services`, `GET /api/services/availability`, `GET /api/services/:slug` | Lists studio services and live date/slot booking availability |
| Services | `POST /api/services/upload`, `GET /api/services/files/:id` | Uploads client reference files (≤ 100 MB) and serves them via per-file token or admin auth |
| Services | `POST /api/services/orders`, `GET /api/services/orders/:orderNumber` | Creates a studio service booking or retrieves order details |
| Services | `POST /api/services/orders/:orderNumber/payment`, `POST /api/services/verify-payment` | Initiates or server-verifies a Paystack transaction against `api.paystack.co` |
| Services | `POST /api/services/webhook` | Fail-closed Paystack `charge.success` webhook verified via raw-body HMAC-SHA512 |
| Auth | `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/me` | Authenticates admin credentials, issues/clears `HttpOnly` JWT cookie, and checks session |
| Admin | `GET\|POST\|PUT\|DELETE /api/admin/*` | Protected CRUD for `releases`, `tracks`, `track-credits`, `beats`, `music-videos`, `gallery-posts`, `gallery-slides`, `gallery-categories`, `media-assets` (`+ /upload`), `social-links`, `merchandise`, `events`, `services`, `services/availability`, `service-orders`, and `subscribers` |
| Admin | `GET /api/admin/recycle-bin`, `POST /restore`, `DELETE /permanent`, `POST /purge-expired` | Lists, restores, or permanently purges soft-deleted items (`SUPERADMIN` for permanent delete) |

## Run locally

### Prerequisites

- **Node.js** (v18+ recommended) and **npm**
- **Wrangler CLI** (installed under `worker/devDependencies`) for local Cloudflare Worker execution
- A **Neon PostgreSQL** database branch (staging or local dev) if running the Worker API locally

### 1. Install dependencies

```bash
npm install
npm --prefix worker install
```

### 2. Configure local Worker environment (for full API + CMS testing)

Create `worker/.dev.vars` (gitignored) with your development credentials:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-strong-random-jwt-secret"
PAYSTACK_SECRET_KEY="sk_test_..."
```

For isolated staging development, create `worker/.dev.vars.staging` with `STAGING_DATABASE_URL` and `EXPECTED_STAGING_BRANCH_ID`. The fail-closed staging runner (`worker/run-staging.js`) verifies Neon project, branch, and endpoint metadata before starting Wrangler so local development cannot accidentally write to production.

### 3. Start local development

Run the frontend dev server (proxies `/api` to `VITE_API_PROXY_TARGET` or the deployed Worker):

```bash
npm run dev
```

Or run the full fail-closed local staging stack in two terminals:

```bash
# Terminal 1 — Local Cloudflare Worker bound strictly to Neon staging (http://127.0.0.1:8787)
npm run worker:staging

# Terminal 2 — Vite dev server proxying /api strictly to http://127.0.0.1:8787
npm run dev:staging
```

### 4. Test, lint, and build

```bash
npm run test:security
npm run test:regression:events
npm run lint
npm run build
```

## Deployment & configuration

### Frontend (Vercel)

- Build command: `npm run build` (runs `vite build` followed by `node scripts/generate-social-pages.js` to pre-render route-level Open Graph HTML pages into `dist/`).
- `vercel.json` proxies `/api/*` and social-crawler requests on `/beats/:id`, `/release/:slug`, `/gallery/:id`, `/services`, and `/services/:slug` to the Cloudflare Worker API (`silachomka-api`).
- Optional build environment variables:
  - `VITE_SITE_ORIGIN` / `SITE_ORIGIN` — Override the canonical site origin when attaching a custom domain.
  - `VITE_API_PROXY_TARGET` — Override the Vite dev/preview `/api` proxy target.

### Edge API (Cloudflare Workers)

Production configuration lives in `worker/wrangler.toml` (`silachomka-api`) with `nodejs_compat`, Workers observability, cache enabled, and a daily cron trigger (`0 2 * * *`).

1. **Configure required Worker secrets** via `wrangler secret put` (in `worker/`):
   - `DATABASE_URL` — Neon Serverless PostgreSQL connection string
   - `JWT_SECRET` — Strong secret key used to sign and verify `HS256` admin session cookies
   - `PAYSTACK_SECRET_KEY` — Live/test Paystack secret key (`sk_...`) for server-side verification and webhook HMAC-SHA512 checks
2. **Optional Worker bindings/variables**:
   - `PUBLIC_ORIGIN` — Canonical public frontend origin for redirects and share URLs
   - `MEDIA_BUCKET` — Optional Cloudflare R2 bucket binding (`silachomka-media`) for external object storage alongside PostgreSQL `BYTEA` delivery
3. **Deploy the Worker**:

   ```bash
   npm --prefix worker run deploy
   ```

## Security architecture

- **Salted PBKDF2-SHA256 authentication** — Admin passwords use modular `$pbkdf2-sha256$i=100000$<16-byte-salt>$<hash>` derivation via WebCrypto, verified using constant-time byte comparison (`timingSafeEqualBytes`) with automatic optimistic rehash upgrades for legacy hashes.
- **Hardened session cookies & RBAC** — Authenticated sessions issue `HS256` JWTs stored in `HttpOnly; SameSite=Strict` cookies (`Secure` over HTTPS, 24-hour TTL). Role-based middleware (`adminAuth`, `requireSuperadmin`) separates `EDITOR` and `SUPERADMIN` capabilities, restricting destructive deletions and permanent Recycle Bin purges to `SUPERADMIN`.
- **Fail-closed Paystack payment verification** — The `/api/services/webhook` endpoint enforces gateway configuration checks, validates the 128-hex `x-paystack-signature` header via constant-time `HMAC-SHA512` over the exact raw request body, performs authoritative server-to-server verification against `api.paystack.co`, and handles duplicate callbacks idempotently.
- **Token-gated private service files** — Client reference uploads (`/api/services/upload`) receive random 64-character access tokens; downloads via `/api/services/files/:id` require either the matching file token or an authenticated admin session.
- **CORS, caching & crawler safeguards** — CORS strictly allowlists production, preview, and local origins; middleware applies `Cache-Control: private, no-store, no-cache, must-revalidate` by default and fails closed on all `5xx` errors; `public/robots.txt` disallows `/admin`, `/api/admin/`, `/api/services/upload`, and `/api/services/files/`.

## Ecosystem & brand context

**silachomka** (primary artist) and **chomkaMUSIC™** (music and studio production layer) operate under the broader **Chomka Nation** ecosystem alongside **chomkaTECH™** (software engineering & tooling). Canonical brand and media documentation is maintained in `docs/source-of-truth/`.

## Note on repository secrets

Do not commit `.env`, `.env.test`, `worker/.dev.vars*`, `worker/.wrangler/`, `DATABASE_URL` connection strings, `JWT_SECRET` keys, `PAYSTACK_SECRET_KEY` secrets, or admin credentials to this repository.
