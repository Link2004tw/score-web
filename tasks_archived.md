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

## Archived 2026-06-12

## Attendance Tracking

### Phase 1 - Data Model

- [x] **`lib/schemas.ts`** - Add `normalAttendance`, `choirAttendance`, `choirMisses`, `choirStatus`, `lastNormalDate`, `lastChoirDate` to `StoredChild` interface + `AttendanceType` export (keep `childSchema` unchanged)
- [x] **`lib/admin-store.ts`** - Update `fromAdminSnapshot()` converter to read new fields with defaults
- [x] **`lib/actions.ts`** - Add `markAttendanceAction(id, type)` toggles present for today (increments counter + sets `lastDate`); toggling off reverses. Handles post-finalize re-marking (undoes the miss). Add `finalizeChoirSessionAction()` (batch: all unmarked students get `choirMisses += 1`, if `>= 3` -> `choirStatus = "out"`). Uses Firestore batch writes. Global tracker doc prevents double-finalize per day.

### Phase 2 - Attendance Page

- [x] **`app/attendance/page.tsx`** - NEW page with two tabs: "Normal" and "Choir"
  - Shows today's date, search/filter bar, tabbed segmented control
  - Student cards with per-row toggle (green "Yes Present" if `lastDate === today`, gray "Mark" otherwise)
  - Normal tab: simple present toggle with local state sync
  - Choir tab: shows `choirMisses` count (warning at 2+), red "OUT" badge when `choirStatus === "out"`
  - "Mark All Present" button (batch `markAllAttendanceAction`), "Complete Choir Session" button with ConfirmDialog
  - Handles: toggle idempotency, post-finalize re-marking (undoes the miss), disabled state for OUT students
- [x] **Attendance history** - `app/attendance/history/page.tsx` with Wednesday-only date picker; `app/api/attendance-sessions/route.ts`; `attendance-sessions/{date}_{type}` collection written on every mark/unmark

### Phase 3 - Navigation

- [x] **`components/Navbar.tsx`** - Add 5th tab "Attend" with calendar-check icon to both the bottom tab array and desktop nav links
- [x] **`proxy.ts`** - Add `/attendance` and `/attendance/history` to `namedProtectedRoutes`

### Phase 4 - Leaderboard & Detail Display

- [x] **`app/leaderboard/page.tsx`** - Add "Norm" and "Choir" columns (attendance counts + percentage of total Wednesdays since enrollment; red "OUT" badge for `choirStatus === "out"`). Table already scrolls horizontally on mobile.
- [x] **`app/[id]/page.tsx`** - Add rows to detail `<dl>`: Normal Attendance, Choir Attendance, Choir Misses, Choir Status (with "Active" / "OUT" badge). Percentage shown in parentheses.

### Phase 5 - Last-Wednesday Logic

- [x] **`lib/attendance-utils.ts`** - `getLastWednesdayDate()` pins all attendance to the most recent Wednesday; `isTodayWednesday()` for display hints
- [x] **`lib/actions.ts`** - Both `markAttendanceAction` and `finalizeChoirSessionAction` use `getLastWednesdayDate()` instead of calendar date
- [x] **`app/attendance/page.tsx`** - Shows "(Last Wednesday)" suffix on non-Wednesdays

## Testing

### CI

- [x] **Add `npm run test` to CI pipeline** - `.github/workflows/ci.yml`

### Unit Tests (written)

- [x] **`lib/__tests__/schemas.test.ts`** - Zod `childSchema` validation (7 cases: valid inputs, empty name, invalid grade, negative score, optional fields, name as number, coerce string score)
- [x] **`lib/__tests__/utils.test.ts`** - `cn` utility (5 cases: merging classes, conditional classes, empty strings, undefined, mixed)
- [x] **`lib/__tests__/filter.test.ts`** - `filterStudents` (15 cases: search, gender, grade, combinations, empty results)
- [x] **`app/score/__tests__/ScorePage.test.tsx`** - Component tests fixed (14 tests: loading, render, empty, error, filters, score adjustment, nav)

### Unit Tests (written)

- [x] **`lib/__tests__/auth-context.test.tsx`** - AuthContext / useAuth hook (5 tests)
- [x] **`lib/__tests__/verify-auth.test.ts`** - `requireAuth` and `requireAuthApi` (8 tests)
- [x] **`lib/__tests__/actions.test.ts`** - All server actions (18 tests)

### Component Tests (written)

- [x] **`components/__tests__/ChildForm.test.tsx`** - Form rendering, validation, submission (8 tests)
- [x] **`components/__tests__/Navbar.test.tsx`** - Renders when logged in, null when no user, logout action (6 tests)
- [x] **`components/__tests__/ProtectedRoute.test.tsx`** - Loading state, redirect, renders children (3 tests)

### Page Tests (written)

- [x] **`app/__tests__/HomePage.test.tsx`** - Authenticated/unauthenticated states (3 tests)
- [x] **`app/login/__tests__/page.test.tsx`** - Form rendering, validation, submission, error display (7 tests)
- [x] **`app/signup/__tests__/page.test.tsx`** - Form rendering, validation, submission, error display (9 tests)
- [x] **`app/create/__tests__/page.test.tsx`** - Form submission, navigation (5 tests)
- [x] **`app/score/__tests__/ScorePage.test.tsx`** - Loading, render, empty, error, filters, score adjustment (14 tests)
- [x] **`app/[id]/edit/__tests__/page.test.tsx`** - Loading, 404, 401, fetch error, form render, submission (8 tests)
- [x] **`app/leaderboard/__tests__/page.test.tsx`** - Data fetching, loading/error states, search/gender/grade filtering, table rendering, empty states, sorting, OUT badge, percentage
- [x] **`app/attendance/__tests__/page.test.tsx`** - Tab toggle, mark/unmark toggle, Mark All, Complete Choir Session, OUT disabled, error handling
- [x] **`app/attendance/history/__tests__/page.test.tsx`** - Date picker Wednesday validation, Normal/Choir toggle, session display, error handling, 401 redirect
- [x] **`app/[id]/__tests__/page.test.tsx`** - `app/[id]/page.tsx` (loading, data display, not-found, delete confirmation, navigation, OUT badge)

### API Route Tests (written)

- [x] **`app/api/children/__tests__/route.test.ts`** - GET /api/children (auth, rate limit, pagination params, error handling) — 7 tests
- [x] **`app/api/children/[id]/__tests__/route.test.ts`** - GET /api/children/:id (auth, rate limit, 404, error handling) — 5 tests
- [x] **`app/api/attendance-sessions/__tests__/route.test.ts`** - GET (valid params, missing date/type, invalid type, auth, null session) — 7 tests

### E2E Tests (written)

- [x] **Playwright setup** - `playwright.config.ts`, `e2e/global-setup.ts`, `e2e/global-teardown.ts`, `e2e/test-utils.ts`
- [x] **Complete user journey** - `e2e/user-journey.spec.ts` (login -> create -> score -> leaderboard -> detail -> delete -> logout)
- [x] **Auth redirect tests** - `e2e/auth.spec.ts` (6 tests: 4 redirects + 2 API 401s)

### Integration (written)

- [x] **Firebase Emulator tests** - `admin-store.test.ts` (8 tests: CRUD, pagination, sorting, missing-doc edge cases) passes against local emulator Firestore. Run with `npm run test:integration` (requires Java, starts auth+firestore emulators on 9098/8081).

## Observability & Operations

- [x] **Add `instrumentation.ts`** - `register()` initializes `@vercel/otel` for OpenTelemetry and imports Sentry server/edge configs; `onRequestError` uses `Sentry.captureRequestError`. Merges Vercel dashboard observability with Sentry error tracking.
- [x] **Add Sentry integration** - `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts` with DSN, tracing (10% samples in prod), and logs enabled; `app/global-error.tsx` client error boundary; `withSentryConfig` in `next.config.ts` (org `no-company-m3d`, project `score-web`, tunnel route `/sentry-tunnel`); proxy excludes `sentry-tunnel` from auth checks. Source maps via `SENTRY_AUTH_TOKEN` env var.
- [x] **Add audit logging** - `audit-log.ts` logs destructive actions (add, update, delete)
- [x] **Add rate limiting** - `rate-limit.ts` in-memory limiter on API routes (60 req/min) and server actions (30 req/min) per IP
- [x] **Add data pagination** - `GET /api/children` with `limit` and `startAfter` params, already implemented in route + `getChildren()`
- [x] **Vercel env vars** - Set all 15 Firebase client + Admin SDK variables in Vercel dashboard
- [x] **Firebase Admin key rotation** - Key was never in git; no purge needed
