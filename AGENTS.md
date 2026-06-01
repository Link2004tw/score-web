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
- **Security headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy in `next.config.ts`
- **Server-side auth**: `lib/verify-auth.ts` with `requireAuth()` (cookie) and `requireAuthApi()` (header + cookie fallback) for all API routes and server actions
- **Token cookie sync**: `auth-context.tsx` syncs Firebase ID token to `fb_token` cookie on login, refreshes every 55 min, clears on logout
- **Client 401 handling**: All fetch calls and server action calls redirect to `/login` on auth failure
- **Missing core pages**: `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx`
- **Deployment config**: `vercel.json` with explicit framework config, `engines: ">=20.9.0"` in `package.json`
- **Quick cleanup**: Removed unused `"2"` dep, moved `shadcn` to devDeps, removed `console.log` from ScorePage, added `.nvmrc` + `.editorconfig`
- **Env validation**: `lib/env.ts` with `"server-only"` validates Firebase Admin vars; `lib/firebase.ts` uses direct `process.env.NEXT_PUBLIC_*` (not `env.ts`) to avoid client-side server-var access
- **Dead code removed**: Deleted `lib/store.ts`, consolidated `StoredChild` type into `lib/schemas.ts`
- **Installed `sharp`** for production image optimization
- **Prettier**: Config, `.prettierignore`, `format`/`format:check` scripts
- **CI/CD**: Added `format:check` and `npm run test` steps to `.github/workflows/ci.yml`
- **ScorePage test fixed**: Added `useRouter` mock for auth-related redirect
- **Accessibility**: `aria-live`/`role` on loading/error states, skip-to-content link, `aria-label` on `<nav>`, `prefers-reduced-motion` in CSS, custom `<ConfirmDialog>` replacing `confirm()`
- **SEO & PWA**: OpenGraph/Twitter metadata in layout, `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts`
- **API docs**: Swagger UI at `/api-docs`, OpenAPI spec at `/api/docs`; redirects to `/` in production
- **`/` redirect**: Home page now redirects authenticated users to `/leaderboard`, others to `/login`
- **Rate limiting**: `lib/rate-limit.ts` with in-memory limiter (60 req/min API, 30 req/min actions)
- **Audit logging**: `lib/audit-log.ts` logs destructive actions to console; integrated into `admin-store.ts`
- **Auth bug fix**: `requireAuthApi()` now falls back to cookie when no Authorization header present
- **Proxy auth guard**: `proxy.ts` checks `fb_token` cookie at the network boundary — redirects to `/login` for unauthenticated page requests, returns 401 for API calls. Matches `/leaderboard`, `/score`, `/create`, `/[id]`, `/[id]/edit` and all `/api/*` routes except `/api/docs`
- **Test fix**: Updated `filter.test.ts` to import `StoredChild` from `schemas` (was deleted `store`)

### In Progress
- (none)

### Blocked
- Sentry/instrumentation (requires Sentry account)
- Data pagination for `/api/children`
- Service worker for offline support
- More test coverage
- Firebase Realtime Database logging

## Key Decisions
- Cookie-based auth (`fb_token` cookie) rather than Authorization header for API routes, so fetch calls don't need modification
- `lib/env.ts` is `"server-only"` — client-side Firebase config uses `process.env.NEXT_PUBLIC_*` directly to avoid client bundle evaluating server-only vars
- API docs are dev-only via `process.env.NODE_ENV` check in the page component
- In-memory rate limiter (not external service) for simplicity on single-instance deploy
- `app/not-found.tsx` must be named exactly that for Next.js to use it for both unmatched routes and `notFound()` calls
- Proxy checks cookie **existence only** (not token validity) — token verification is still done by `requireAuth()` in routes/actions for defense-in-depth
- Proxy runs on Node.js runtime (Edge not supported in v16 proxy)

## Next Steps
- Data pagination for `GET /api/children` (`limit`, `startAfter` params)
- Firebase Realtime Database logging integration (plan documented in `tasks.md`)
- Expand test coverage per test plan in `tasks.md`
- Sentry or OpenTelemetry instrumentation (requires account setup)

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
- `lib/actions.ts`: Server actions with auth + rate limit checks
- `app/api/children/route.ts` & `app/api/children/[id]/route.ts`: API routes with auth + rate limiting
- `app/api-docs/page.tsx`: Swagger UI (dev-only)
- `app/api/docs/route.ts`: OpenAPI JSON spec
- `next.config.ts`: Security headers configuration
- `components/ConfirmDialog.tsx`: Accessible modal for delete confirmation
- `tasks.md`: Full task list including test plan and RTDB logging plan
- `.github/workflows/ci.yml`: CI pipeline (lint, typecheck, format:check, test, build)
