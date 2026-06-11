# Archived Tasks

## Archived 2026-06-11

## Missing Pages & Middleware

- [x] **`app/error.tsx`** - Global error boundary (client component with "Try Again" button)
- [x] **`app/not-found.tsx`** - Custom 404 page with branding and navigation
- [x] **`app/loading.tsx`** - Route transition loading state
- [x] **`proxy.ts`** - Network boundary auth guard (cookie existence check, redirects to `/login`, 401 for API)

## Reliability & Quality

- [x] **Add env var validation** - Create `lib/env.ts` that validates all env vars at startup with clear error messages
- [x] **Remove `console.log` from production code** - `app/score/page.tsx` and `app/[id]/edit/page.tsx`
- [x] **Clean up dead code** - Removed `lib/store.ts`, consolidated `StoredChild` type into `lib/schemas.ts`; removed unused shadcn exports (`CardAction`, `TableFooter`, `TableCaption`, `buttonVariants`)
- [x] **Extract duplicated `getTotalWednesdaysSince`** - Moved from `app/leaderboard/page.tsx` and `app/[id]/page.tsx` into `lib/attendance-utils.ts`
- [x] **Add `sharp`** - Install for production image optimization
- [x] **Add Prettier** - With config and `format` script
- [x] **Add pre-commit hooks** - Husky + lint-staged for Prettier, type-check (`.husky/pre-commit`)
- [x] **Add bundle analyzer** - `@next/bundle-analyzer` in devDeps + `analyze` script
- [x] **Add `.nvmrc`** - Specify Node.js version (e.g. `20.19.0`)
- [x] **Add `.editorconfig`** - Cross-editor formatting consistency

## Accessibility

- [x] **Add `aria-live` regions** - Loading states and error messages now have `role="status"` and `role="alert"`
- [x] **Add skip-to-content link** - At the start of `app/layout.tsx`
- [x] **Add `aria-label` to `<nav>`** - `"Main navigation"` in `Navbar.tsx`
- [x] **Respect `prefers-reduced-motion`** - Disable `animate-score-bump` animation for vestibular disorders
- [x] **Replace `confirm()` dialog** - Created accessible `<ConfirmDialog>` modal component with focus management and Escape key handling

## SEO & PWA

- [x] **Extend metadata** - OpenGraph, Twitter Cards, viewport, themeColor, icons in `app/layout.tsx`
- [x] **`app/sitemap.ts`** - Dynamic sitemap
- [x] **`app/robots.ts`** - Allow all crawlers, block `/api/`
- [x] **`app/manifest.ts`** - PWA manifest

## API Docs

- [x] **Swagger/OpenAPI** - Swagger UI at `/api-docs`, OpenAPI spec served from `/api/docs`

## Firebase Realtime Database Logging Plan

### Why RTDB over Firestore

- Append-only logs are write-heavy; RTDB has no per-document write cost
- Automatic chronological ordering via push IDs
- Simpler data model - no schema needed for log entries
- Lower latency for writes

### Implementation steps

- [x] **Add env var** - `FIREBASE_ADMIN_DATABASE_URL` from Firebase Console -> Realtime Database
- [x] **Initialize RTDB** in `lib/firebase-admin.ts`:
  ```ts
  export const adminRtdb: admin.database.Database | null = databaseUrl ? admin.database() : null;
  ```
- [x] **Create `lib/realtime-log.ts`**:

  ```ts
  import { adminRtdb } from "./firebase-admin";

  export function writeLog(entry: { ... }) {
    if (!adminRtdb) return;
    const ref = adminRtdb.ref("logs").push();
    return ref.set({ ...entry, timestamp: new Date().toISOString() });
  }
  ```

- [x] **Integrate into `lib/audit-log.ts`** - call `writeLog()` alongside `console.log()`
- [x] **Set RTDB security rules** - deny all (Admin SDK bypasses rules entirely):
  ```json
  {
    "rules": {
      ".read": false,
      ".write": false
    }
  }
  ```
- [x] **Admin log viewer** - Create `/logs` page with realtime listener (read-only, authenticated)

### Security considerations

- RTDB rules must prevent public read/write on the `/logs` node
- Logs should not contain PII (no email addresses, student names are OK for school context)
- Consider a TTL cleanup script to prevent unbounded storage growth

## Security (CRITICAL - requires manual steps)

- [x] **Rotate Firebase Admin key not needed** - Private key was never committed to git; only in local `.env` and Vercel env vars.
- [x] **Verify no secrets in git history** - `.env`, `.env.local`, `score-web-firebase-adminsdk.json` were never committed. Firebase client config in initial commit (`lib/firebase.ts`) is intentionally public.
- [x] **Add `.env` and `score-web-firebase-adminsdk.json` to `.gitignore`** - Already present.
- [x] **Add security headers** - CSP (including `apis.google.com` in `script-src` + `frame-src`), HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy via `next.config.ts`.
- [x] **Add rate limiting** - Protect API routes and server actions from abuse (in-memory limiter via `lib/rate-limit.ts`).

## Deployment

### HIGH

- [x] Remove unused `"2"` dependency (`npm uninstall 2`)
- [x] Move `shadcn` to `devDependencies`
- [x] Set all 15 environment variables in Vercel dashboard (Firebase client + Admin SDK) - requires Vercel console access

### MEDIUM

- [x] Create `vercel.json` with explicit framework config
- [x] Test `FIREBASE_ADMIN_PRIVATE_KEY` newline handling on Vercel (preview deploy)
- [x] Replace placeholder SVGs in `public/` with project assets
- [x] Update deploy workflow to use official `vercel/action@v1` (was `amondnet/vercel-action@v25`)

### LOW

- [x] Add `"engines": { "node": ">=20.9" }` to `package.json`
