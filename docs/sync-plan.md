# Field Calc — push sharing: prototype → permanent hosted backend

_Last updated 2026-09-28 (app v0.4.0)_

## 1. What exists now (prototype, running on the dev box)

| Piece | Where | Notes |
|---|---|---|
| API + static server | `server/app.js`, `server/index.js` (`npm run serve`, port 4173) | Plain `node:http`, one origin: app at `/`, API at `/api/*` |
| Database | SQLite via `better-sqlite3@11`, file `server/data/fieldcalc.db` | Tables: `users`, `contacts`, `crews`, `crew_members`, `messages`, `inbox` |
| Public URL | Cloudflare *quick* tunnel → `localhost:4173` | Random URL; dies if the box/tunnel restarts |
| Client sync | `src/lib/sync.js` (logic), `src/sync-instance.js`, UI in `src/jobs-ui.js` | Sync on open, on `online`, on becoming visible, and every 30 s while visible |
| Tests | `tests/server.test.js` (API + two-client sync + offline queue), `tests/jobs.test.js` | `npm test` |

**Identity:** `POST /api/register {name}` returns a random 256-bit device token (stored in the phone's localStorage; only its SHA-256 is stored on the server) and a 6-character friend code (`ABC-D23`, no 0/O/1/I/L).
**Contacts:** adding a friend code creates a *mutual* contact. **Crews:** create → crew code; anyone with the code joins.
**Sending:** `POST /api/send {job, to:{users,crews}, clientMsgId}` — server validates the job (same sanitizer as link import), checks recipients are contacts / crews you belong to, stores one message + one inbox row per recipient. `clientMsgId` makes retries idempotent (the offline outbox can resend safely).
**Receiving:** `GET /api/inbox` → client merges each job into Saved Jobs (`mergeReceived`: new → add; same id with different content → replace, previous version kept in the job's history; identical → ignore), then `POST /api/inbox/ack {upTo}` deletes delivered rows.
**Offline:** everything local works offline; sends go into `fc.outbox` and flush on the next successful sync. The service worker never caches `/api/*`.

### Prototype limits (why it must move before real users)
- Runs on one dev machine; quick-tunnel URL changes on restart, and there is no uptime guarantee or backup.
- Device token = account. Clearing browser data / new phone = new identity (no recovery).
- No moderation, blocking, abuse reporting or account deletion UI; basic in-memory rate limiting only.
- "Real-time" is 30 s polling; no push notification when the app is closed.
- iOS: the home-screen app and Safari keep separate storage → separate identities.

## 2. Recommended target: Supabase (free tier → Pro when needed)

Why Supabase over Firebase for this app: the data is relational (users ↔ contacts ↔ crews ↔ inbox), the prototype schema ports almost 1:1 to Postgres, Row Level Security replaces the hand-written permission checks, and pricing is flat and predictable. Firebase (Firestore + Anonymous Auth) is an equally workable alternative — see §5.

### Mapping
| Prototype | Supabase |
|---|---|
| Device token | **Anonymous sign-in** (`supabase.auth.signInAnonymously()`), later *upgrade* to email magic-link / Apple / Google so users can recover on a new phone without losing their friend code |
| `users` | `profiles (id uuid = auth.uid(), name, friend_code)` |
| `contacts`, `crews`, `crew_members` | Same tables; RLS: you can read rows you're part of |
| `messages` + `inbox` | `inbox (recipient_id, sender_id, crew_id, job jsonb, created_at)`; insert via a Postgres function `send_job(job, user_ids, crew_ids)` (SECURITY DEFINER) that performs the contact/crew checks and job validation |
| 30 s polling | **Realtime** subscription on `inbox where recipient_id = auth.uid()` while the app is open, plus the same poll-on-open/online fallback (keeps offline behaviour identical) |
| Closed-app alerts | Web Push (VAPID) from an Edge Function triggered on inbox insert. Works on Android; on iOS 16.4+ only for home-screen-installed apps |
| Static app | Cloudflare Pages / GitHub Pages / Netlify (free), with Supabase URL + anon key in the build |

Client change is small: replace the `api()` calls in `src/lib/sync.js` with supabase-js calls; `mergeReceived`, the outbox and the UI stay the same.

### Conflicts / consistency (unchanged model)
Jobs are **copies**, not shared documents: the sender owns their copy, each recipient gets their own. Resend = new version; recipient keeps the previous one in history (5 versions). This avoids real-time merge conflicts entirely. If true *co-edited* crew jobs are wanted later, add a `crew_jobs` table with `ver` optimistic locking (update … where ver = :expected) and surface a "someone changed this — keep mine / take theirs" prompt; the existing `classifyImport` statuses already cover this.

## 3. What Colton would sign up for

| Account | Needed for | Cost |
|---|---|---|
| **GitHub** (free) | Source repo; deploy the static app (GitHub Pages, or connect to Cloudflare Pages) | $0 |
| **Supabase** (sign in with GitHub) | Database, auth, realtime, edge functions | Free tier $0; Pro $25/month per project when needed |
| **Cloudflare** (free) — optional | Pages hosting + custom domain DNS | $0 |
| Domain name — optional but recommended | Stable URL like `fieldcalc.app` (install links survive hosting moves) | ≈ $10–20/year |
| Later, for store/payments: Apple Developer ($99/yr), Google Play ($25 once), Stripe (per-transaction) | Only if wrapping as a native app / taking payments | — |

No credit card is required for the Supabase free tier or Cloudflare/GitHub Pages.

## 4. Cost at small scale (published pricing, check before committing)

A job is ~1–3 KB. Even 1,000 active users each sending 10 jobs/day is ~30 MB/month of inbox data (deleted after delivery).

| Scale | Supabase Free | Notes |
|---|---|---|
| Crew of 5–50 users | $0 | Free tier: 500 MB DB, 50k monthly active users, 2 GB egress/5 GB bandwidth class limits, 200 concurrent realtime connections |
| Few hundred – few thousand users | $0 → $25/mo | **Free projects pause after ~1 week of inactivity** — fine for testing, not for a product people rely on; move to Pro ($25/mo) at launch |
| Static hosting | $0 | Cloudflare Pages/GitHub Pages free tiers are far above this app's size (~100 KB) |

Firebase equivalent: Spark (free) plan covers 50k Firestore reads / 20k writes per day; Blaze pay-as-you-go would be cents/month at this scale but requires a billing account.

## 5. Firebase alternative (if preferred)
Anonymous Auth → link to Google/Apple/email later; Firestore collections `profiles`, `crews/{id}/members`, `inbox/{uid}/items`; Security Rules enforce "only contacts/crewmates may write to my inbox" (needs a `contacts/{uid}/list/{otherUid}` doc to check in rules); `onSnapshot` listener replaces polling and Firestore's offline cache handles the outbox. FCM for push. Downsides here: rules-based permission checks for crew fan-out are awkward (use a Cloud Function, which needs the Blaze plan).

## 6. Migration steps
1. Create Supabase project; run schema + RLS + `send_job()` SQL (port from `server/app.js` `openDb`).
2. Swap `api()` in `src/lib/sync.js` for supabase-js; keep outbox/merge logic; add realtime subscription.
3. Anonymous sign-in on "Set up sharing"; add "Secure my account (email)" upgrade screen.
4. Deploy static build to Cloudflare Pages with a custom domain; update service-worker scope.
5. Prototype users: one-time "re-add your contacts" (friend codes are regenerated; the prototype DB can be exported and imported if wanted).
6. Add: block/report user, delete account & data (App Store requirement if wrapped), web push.
7. Privacy: keep the in-app reminder; add a short privacy policy page (required for stores; also good practice for a plant-adjacent audience).
