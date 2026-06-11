<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Goal

- Make a Next.js scoreboard app production-ready for Vercel deployment.

## Constraints & Preferences

- Vercel deployment with Firebase Auth, Firestore, and Admin SDK
- Next.js 16.2.6, App Router, Tailwind CSS v4, shadcn/ui
- Security and accessibility are high priorities
- Tasks executed in phases with user sign-off between phases

## Progress

### Done

- **Security headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy in `next.config.ts`; includes `https://apis.google.com` in `script-src` and `frame-src` for Firebase Auth sign-in
- **Server-side auth**: `lib/verify-auth.ts` with `requireAuth()` (cookie) and `requireAuthApi()` (header + cookie fallback) for all API routes and server actions
- **Token cookie sync**: `auth-context.tsx` syncs Firebase ID token to `fb_token` cookie on login, refreshes every 55 min, clears on logout
- **Client 401 handling**: All fetch calls and server action calls redirect to `/login` on auth failure
- **Core pages**: `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx`
- **Deployment config**: `vercel.json` with explicit framework config, `engines: ">=20.9.0"` in `package.json`
- **Cleanup**: Removed unused `"2"` dep, moved `shadcn` to devDeps, removed `console.log` from ScorePage and edit page, added `.nvmrc` + `.editorconfig`
- **Dead code removed**: Deleted `lib/store.ts`, consolidated `StoredChild` type into `lib/schemas.ts`; removed unused shadcn exports (`CardAction`, `TableFooter`, `TableCaption`, `buttonVariants`)
- **Installed `sharp`** for production image optimization
- **Prettier**: Config, `.prettierignore`, `format`/`format:check` scripts
- **CI/CD**: Added `format:check` and `npm run test` steps to `.github/workflows/ci.yml`
- **Accessibility**: `aria-live`/`role` on loading/error states, skip-to-content link, `aria-label` on `<nav>`, `prefers-reduced-motion` in CSS, custom `<ConfirmDialog>` replacing `confirm()`
- **SEO & PWA**: OpenGraph/Twitter metadata in layout, `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts`
- **API docs**: Swagger UI at `/api-docs`, OpenAPI spec at `/api/docs`; redirects to `/` in production
- **`/` redirect**: Home page now redirects authenticated users to `/leaderboard`, others to `/login`
- **Rate limiting**: `lib/rate-limit.ts` with in-memory limiter (60 req/min API, 30 req/min actions); `markAllAttendanceAction` uses single batch write to avoid per-call rate limit
- **Audit logging**: `lib/audit-log.ts` logs destructive actions to console; integrated into `admin-store.ts`
- **Auth bug fix**: `requireAuthApi()` now falls back to cookie when no Authorization header present
- **Proxy auth guard**: `proxy.ts` checks `fb_token` cookie at the network boundary — redirects to `/login` for unauthenticated page requests, returns 401 for API calls
- **Attendance tracking**: Two-tab (Normal/Choir) attendance page with toggle buttons, Mark All Present (batch Firestore write), Complete Choir Session (batch finalize with `_meta/attendance` tracker)
- **Last-Wednesday date logic**: Attendance always pins to the most recent Wednesday; date picker in history page rejects non-Wednesdays
- **Attendance history**: `app/attendance/history/page.tsx` with date picker + Normal/Choir toggle, backed by `attendance-sessions/{date}_{type}` collection written on every mark/unmark
- **Leaderboard attendance columns**: Norm/Choir counts + percentage + OUT badge
- **Detail attendance rows**: Full attendance display on `app/[id]/page.tsx`
- **Data pagination**: `GET /api/children` with `limit` and `startAfter` params
- **Deploy workflow**: Updated to `vercel/action@v1` (was `amondnet/vercel-action@v25`)
- **Test fixes**: ScorePage tests fixed (wrong response shape + missing StoredChild fields); `filter.test.ts` updated for new StoredChild; new `schemas.test.ts` (7 cases) and `utils.test.ts` (5 cases) written
- **Redundancy cleanup**: Extracted duplicated `getTotalWednesdaysSince` into `lib/attendance-utils.ts`

### In Progress

- (none)

### Blocked

- Sentry/instrumentation (requires Sentry account)
- Service worker for offline support
- More test coverage (auth-context, verify-auth, ChildForm, Navbar, API routes)
- Firebase Realtime Database logging (plan in `tasks.md`)
- Firebase Admin key rotation (manual — Firebase Console)
- Git history purge (manual — requires `git filter-branch` or `bfg`)

## Key Decisions

- Cookie-based auth (`fb_token` cookie) rather than Authorization header for API routes, so fetch calls don't need modification
- `lib/env.ts` is `"server-only"` — client-side Firebase config uses `process.env.NEXT_PUBLIC_*` directly to avoid client bundle evaluating server-only vars
- API docs are dev-only via `process.env.NODE_ENV` check in the page component
- In-memory rate limiter (not external service) for simplicity on single-instance deploy
- `app/not-found.tsx` must be named exactly that for Next.js to use it for both unmatched routes and `notFound()` calls
- Proxy checks cookie **existence only** (not token validity) — token verification is still done by `requireAuth()` in routes/actions for defense-in-depth
- Proxy runs on Node.js runtime (Edge not supported in v16 proxy)
- Attendance always pins to the last (or current) Wednesday — avoids needing a date picker for marking and allows marking on Thursday for Wednesday's session
- History backed by `attendance-sessions/{date}_{type}` docs created/updated on every mark/unmark — no separate data model needed

## Next Steps

- Firebase Admin key rotation + git history purge
- Vercel env vars configuration
- Expand test coverage per test plan in `tasks.md`
- Firebase Realtime Database logging integration
- Sentry or OpenTelemetry instrumentation (requires account setup)
- Install Firebase Emulator Suite for integration tests

## Critical Context

- Next.js 16.2.6 requires Node.js >= 20.9
- `proxy.ts` replaces `middleware.ts` in Next.js v16 — named export `proxy`, configurable via `config.matcher`, runs on Node.js runtime
- FB Admin env vars are required at server runtime: `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_PRIVATE_KEY`, `FIREBASE_ADMIN_CLIENT_EMAIL`
- Unresolved: `act(...)` warnings in ScorePage tests (pre-existing, cosmetic)
- Unresolved: Turbopack root warning about multiple lockfiles (pre-existing, cosmetic)

## Relevant Files

- `proxy.ts`: Network boundary auth guard (replaces `middleware.ts`)
- `lib/verify-auth.ts`: Server-side auth utilities (`requireAuth`, `requireAuthApi`)
- `lib/auth-context.tsx`: Firebase Auth provider + token cookie sync
- `lib/env.ts`: Server-only env var validation (Firebase Admin vars)
- `lib/rate-limit.ts`: In-memory rate limiter
- `lib/audit-log.ts`: Console-based audit logging
- `lib/admin-store.ts`: Firestore CRUD operations (all server-side via Admin SDK)
- `lib/actions.ts`: Server actions with auth + rate limit checks; includes `markAttendanceAction`, `markAllAttendanceAction` (batch), `finalizeChoirSessionAction`
- `lib/schemas.ts`: StoredChild type, AttendanceType, AttendanceSession interface
- `lib/attendance-utils.ts`: `getLastWednesdayDate()`, `isTodayWednesday()`, `getTotalWednesdaysSince()`
- `lib/filter.ts`: Student search/gender/grade filtering
- `app/api/attendance-sessions/route.ts`: GET endpoint for session history
- `app/api/children/route.ts` & `app/api/children/[id]/route.ts`: API routes with auth + rate limiting
- `app/attendance/page.tsx`: Attendance marking page (Normal/Choir tabs)
- `app/attendance/history/page.tsx`: Attendance history viewer with Wednesday-only date picker
- `app/leaderboard/page.tsx`: Norm/Choir columns with percentage + OUT badge
- `app/[id]/page.tsx`: Detail view with attendance rows + delete confirmation
- `next.config.ts`: Security headers configuration (CSP with `apis.google.com` in script-src + frame-src)
- `components/Navbar.tsx`: 5-tab nav (Leaderboard, Add, Score, Attend, Logs)
- `components/ConfirmDialog.tsx`: Accessible modal for delete/finalize confirmation
- `tasks.md`: Full task list including test plan and RTDB logging plan
- `.github/workflows/ci.yml`: CI pipeline (lint, typecheck, format:check, test, build)

## Custom Commands

- **`/sync-tasks`** — Archive fully-completed sections from `tasks.md` to `tasks_archived.md`. Run `pwsh scripts/sync-tasks.ps1` from the project root. Handles both markdown tables (last column ✅/`[x]`) and bullet-point checklists (all `- [x]`). Sections with any incomplete item are kept. Sections `Status Legend` and `Implementation Order` are never archived.
