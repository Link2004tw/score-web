# Master Task List

---

## Security (CRITICAL)

- [ ] **Rotate Firebase Admin key** — The private key has been exposed in git. Rotate immediately in Firebase Console.
- [ ] **Remove secrets from git** — Run `git filter-branch` or `bfg` to purge `.env`, `.env.local`, and `score-web-firebase-adminsdk.json` from history.
- [ ] **Add `.env` and `score-web-firebase-adminsdk.json` to `.gitignore`** — Prevent re-exposure.
- [x] **Add security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy via `next.config.ts`.
- [x] **Add rate limiting** — Protect API routes and server actions from abuse (in-memory limiter via `lib/rate-limit.ts`).

## Deployment

### HIGH

- [x] Remove unused `"2"` dependency (`npm uninstall 2`)
- [x] Move `shadcn` to `devDependencies`
- [ ] Set all 15 environment variables in Vercel dashboard (Firebase client + Admin SDK)

### MEDIUM

- [x] Create `vercel.json` with explicit framework config
- [ ] Test `FIREBASE_ADMIN_PRIVATE_KEY` newline handling on Vercel (preview deploy)
- [ ] Replace placeholder SVGs in `public/` with project assets

### LOW

- [x] Add `"engines": { "node": ">=20.9" }` to `package.json`
- [ ] Update `amondnet/vercel-action@v25` in deploy workflow

---

## Missing Pages & Middleware

- [x] **`app/error.tsx`** — Global error boundary (client component with "Try Again" button)
- [x] **`app/not-found.tsx`** — Custom 404 page with branding and navigation
- [x] **`app/loading.tsx`** — Route transition loading state
- [x] **`proxy.ts`** — Network boundary auth guard (cookie existence check, redirects to `/login`, 401 for API)

---

## Reliability & Quality

- [x] **Add env var validation** — Create `lib/env.ts` that validates all env vars at startup with clear error messages
- [x] **Remove `console.log` from production code** — `app/score/page.tsx`
- [x] **Clean up dead code** — Removed `lib/store.ts`, consolidated `StoredChild` type into `lib/schemas.ts`
- [x] **Add `sharp`** — Install for production image optimization
- [x] **Add Prettier** — With config and `format` script
- [ ] **Add pre-commit hooks** — Husky + lint-staged for ESLint, Prettier, type-check
- [ ] **Add bundle analyzer** — `@next/bundle-analyzer` + `analyze` script
- [x] **Add `.nvmrc`** — Specify Node.js version (e.g. `20.19.0`)
- [x] **Add `.editorconfig`** — Cross-editor formatting consistency

---

## Testing

### CI

- [x] **Add `npm run test` to CI pipeline** — `.github/workflows/ci.yml`

### Unit Tests

- [ ] **`lib/__tests__/schemas.test.ts`** — Zod `childSchema` validation (valid inputs, invalid inputs, edge cases)
- [ ] **`lib/__tests__/store.test.ts`** — `fromFirestore` / `fromAdminSnapshot` converters (valid data, missing fields, edge cases)
- [ ] **`lib/__tests__/utils.test.ts`** — `cn` utility (merging classes, conditional classes)
- [ ] **`lib/__tests__/auth-context.test.tsx`** — AuthContext / useAuth hook (provides correct values, throws outside provider)
- [ ] **`lib/__tests__/verify-auth.test.ts`** — `requireAuth` and `requireAuthApi` (valid token, expired token, missing token)
- [ ] **`lib/__tests__/actions.test.ts`** — All 4 server actions (success, auth failure, edge cases)

### Component Tests

- [ ] **`components/__tests__/ChildForm.test.tsx`** — Form rendering, validation display, submission, resetting
- [ ] **`components/__tests__/Navbar.test.tsx`** — Renders when logged in, null when no user, logout action
- [ ] **`components/__tests__/ProtectedRoute.test.tsx`** — Loading state, redirect when unauthenticated, renders children when authenticated

### Page Tests

- [ ] **`app/__tests__/HomePage.test.tsx`** — Authenticated user (welcome card), unauthenticated (login/signup prompts)
- [ ] **`app/login/__tests__/LoginPage.test.tsx`** — Form rendering, validation, submission, error display, navigation
- [ ] **`app/signup/__tests__/SignupPage.test.tsx`** — Form rendering, password mismatch, short password, submission, error display
- [ ] **`app/create/__tests__/CreatePage.test.tsx`** — Rendering, form submission, navigation after creation
- [ ] **`app/leaderboard/__tests__/LeaderboardPage.test.tsx`** — Data fetching, loading/error states, search/gender/grade filtering, table rendering, empty states
- [ ] **`app/__tests__/child-page.test.tsx`** — `app/[id]/page.tsx` (loading, data display, not-found, delete confirmation, navigation)
- [ ] **`app/__tests__/edit-page.test.tsx`** — `app/[id]/edit/page.tsx` (loading, data pre-fill, not-found, form submission redirect)

### API Route Tests

- [ ] **`app/api/children/__tests__/route.test.ts`** — GET /api/children (with auth, without auth, sorted, error handling)
- [ ] **`app/api/children/__tests__/child-by-id.test.ts`** — GET /api/children/:id (with auth, without auth, returns child, 404, error handling)

### E2E Tests

- [ ] **Playwright setup** — Configure Playwright for end-to-end tests
- [ ] **Complete user journey** — Signup -> login -> add student -> adjust score -> view leaderboard -> delete student

### Integration

- [ ] **Firebase Emulator tests** — Server actions (`adjustScoreAction`, `addChildAction`, `updateChildAction`, `deleteChildAction`) with Firebase Emulator Suite

---

## Accessibility

- [x] **Add `aria-live` regions** — Loading states and error messages now have `role="status"` and `role="alert"`
- [x] **Add skip-to-content link** — At the start of `app/layout.tsx`
- [x] **Add `aria-label` to `<nav>`** — `"Main navigation"` in `Navbar.tsx`
- [x] **Respect `prefers-reduced-motion`** — Disable `animate-score-bump` animation for vestibular disorders
- [x] **Replace `confirm()` dialog** — Created accessible `<ConfirmDialog>` modal component with focus management and Escape key handling

---

## SEO & PWA

- [x] **Extend metadata** — OpenGraph, Twitter Cards, viewport, themeColor, icons in `app/layout.tsx`
- [x] **`app/sitemap.ts`** — Dynamic sitemap
- [x] **`app/robots.ts`** — Allow all crawlers, block `/api/`
- [x] **`app/manifest.ts`** — PWA manifest

---

## API Docs

- [x] **Swagger/OpenAPI** — Swagger UI at `/api-docs`, OpenAPI spec served from `/api/docs`

---

## Observability & Operations

- [ ] **Add `instrumentation.ts`** — OpenTelemetry or Sentry for server-side monitoring (requires Sentry account)
- [x] **Add audit logging** — `audit-log.ts` logs destructive actions (add, update, delete)
- [x] **Add rate limiting** — `rate-limit.ts` in-memory limiter on API routes (60 req/min) and server actions (30 req/min) per IP
- [ ] **Add data pagination** — `GET /api/children` with `limit` and `startAfter` params

## Completed

- [x] **Server-side auth verification** — `lib/verify-auth.ts` with `requireAuth()` and `requireAuthApi()`
- [x] **Token cookie sync** — `auth-context.tsx` syncs Firebase ID token to cookie
- [x] **API route auth** — Both `GET /api/children` and `GET /api/children/[id]` verify auth
- [x] **Server action auth** — All 4 actions (`addChildAction`, `deleteChildAction`, `updateChildAction`, `adjustScoreAction`) verify auth
- [x] **Client 401 handling** — All fetch calls and server action calls redirect to `/login` on auth failure
- [x] **`lib/__tests__/filter.test.ts`** — Unit tests for `filterStudents` function
- [x] **`app/score/__tests__/ScorePage.test.tsx`** — Component tests for Score page

---

## More Test Plans

### Setup

- [ ] Install `@testing-library/react`, `@testing-library/user-event` as devDependencies (currently installed)
- [ ] Create `__tests__` dirs in each route and component folder

### Auth tests (HIGH priority)

- [ ] **`app/login/__tests__/LoginPage.test.tsx`** — renders login form, shows error on invalid credentials, navigates to leaderboard on success
- [ ] **`app/signup/__tests__/SignupPage.test.tsx`** — renders signup form, validates password match and length, handles email-in-use error
- [ ] **`lib/__tests__/auth-context.test.tsx`** — provides user/loading values, signUp/login/logout work, throws outside provider
- [ ] **`components/__tests__/ProtectedRoute.test.tsx`** — shows loading, redirects when unauthenticated, renders children when authenticated

### Page tests (MEDIUM priority)

- [ ] **`app/__tests__/HomePage.test.tsx`** — redirects to /leaderboard when authenticated, /login when not
- [ ] **`app/leaderboard/__tests__/LeaderboardPage.test.tsx`** — loading state, data fetching, filter/search, empty state, error state
- [ ] **`app/create/__tests__/CreatePage.test.tsx`** — form renders, submit calls addChildAction, navigates on success
- [ ] **`app/__tests__/child-page.test.tsx`** — shows loading, renders child data, not-found state, delete confirmation dialog
- [ ] **`app/__tests__/edit-page.test.tsx`** — loading, data pre-fill, submit calls updateChildAction, navigation

### API route tests (MEDIUM priority)

- [ ] **`app/api/children/__tests__/route.test.ts`** — returns children when authenticated, 401 without auth, 429 on rate limit
- [ ] **`app/api/children/__tests__/child-by-id.test.ts`** — returns child when found, 404 when not, 401 without auth

### Component tests (LOW priority)

- [ ] **`components/__tests__/ChildForm.test.tsx`** — renders all fields, shows validation errors, submits with valid data, resets with defaults
- [ ] **`components/__tests__/Navbar.test.tsx`** — shows links + username when logged in, null when not, logout triggers redirect
- [ ] **`components/__tests__/ConfirmDialog.test.tsx`** — renders when open, fires onConfirm/onCancel, closes on Escape key

### Integration tests (FUTURE)

- [ ] **Firebase Emulator tests** — Server actions with Firebase Emulator Suite for end-to-end testing

---

## Firebase Realtime Database Logging Plan

### Why RTDB over Firestore

- Append-only logs are write-heavy; RTDB has no per-document write cost
- Automatic chronological ordering via push IDs
- Simpler data model — no schema needed for log entries
- Lower latency for writes

### Implementation steps

1. **Add env var** — `FIREBASE_ADMIN_DATABASE_URL` from Firebase Console → Realtime Database
2. **Initialize RTDB** in `lib/firebase-admin.ts`:
   ```ts
   export const rtdb = admin.database();
   ```
3. **Create `lib/realtime-log.ts`**:

   ```ts
   import { rtdb } from "./firebase-admin";

   export function writeLog(entry: { action: string; targetId?: string; detail?: string }) {
     const ref = rtdb.ref("logs").push();
     return ref.set({ ...entry, timestamp: Date.now() });
   }
   ```

4. **Integrate into `lib/audit-log.ts`** — call `writeLog()` alongside `console.log()`
5. **Set RTDB security rules** — deny all (Admin SDK bypasses rules entirely):
   ```json
   {
     "rules": {
       ".read": false,
       ".write": false
     }
   }
   ```
6. **Optional: Admin log viewer** — Create `/logs` page with realtime listener (read-only, authenticated)

### Security considerations

- RTDB rules must prevent public read/write on the `/logs` node
- Logs should not contain PII (no email addresses, student names are OK for school context)
- Consider a TTL cleanup script to prevent unbounded storage growth
