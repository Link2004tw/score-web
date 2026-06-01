# Test Tasks

## ✅ Completed

- [x] **`lib/__tests__/filter.test.ts`** — Unit tests for `filterStudents` function (search, gender, grade, combined, edge cases)
- [x] **`app/score/__tests__/ScorePage.test.tsx`** — Component tests for Score page (loading, data fetching, filters, score adjustment, error handling)

## 📝 To Do

### Unit Tests

- [ ] **`lib/__tests__/schemas.test.ts`** — Tests for Zod `childSchema` validation (valid inputs, invalid inputs, edge cases for each field)
- [ ] **`lib/__tests__/store.test.ts`** — Tests for `fromFirestore` and `fromAdminSnapshot` converter functions (valid data, missing fields, edge cases)
- [ ] **`lib/__tests__/utils.test.ts`** — Tests for `cn` utility function (merging classes, conditional classes)
- [ ] **`lib/__tests__/auth-context.test.tsx`** — Tests for `AuthContext` / `useAuth` hook (provides correct values, throws outside provider)

### Component Tests

- [ ] **`components/__tests__/ChildForm.test.tsx`** — Tests for form rendering, validation display, submission with valid/invalid data, resetting with default values
- [ ] **`components/__tests__/Navbar.test.tsx`** — Tests for rendering when user is logged in (shows links + username), returns null when no user
- [ ] **`components/__tests__/ProtectedRoute.test.tsx`** — Tests for showing loading state, redirecting when not authenticated, rendering children when authenticated

### Page Tests

- [ ] **`app/__tests__/HomePage.test.tsx`** — Tests for Home page with authenticated user (shows welcome card) and unauthenticated user (shows login/signup prompts)
- [ ] **`app/login/__tests__/LoginPage.test.tsx`** — Tests for login form rendering, validation, submission, error display, navigation on success
- [ ] **`app/signup/__tests__/SignupPage.test.tsx`** — Tests for signup form rendering, password mismatch validation, password length validation, submission, error display
- [ ] **`app/create/__tests__/CreatePage.test.tsx`** — Tests for create page rendering, form submission, navigation after creation
- [ ] **`app/leaderboard/__tests__/LeaderboardPage.test.tsx`** — Tests for data fetching, loading/error states, search/gender/grade filtering, table rendering, empty states
- [ ] **`app/__tests__/child-page.test.tsx`** — Tests for `app/[id]/page.tsx` (loading, data display, not-found state, delete confirmation, navigation)
- [ ] **`app/__tests__/edit-page.test.tsx`** — Tests for `app/[id]/edit/page.tsx` (loading, data pre-fill, not-found state, form submission redirect)

### API Route Tests

- [ ] **`app/api/children/__tests__/route.test.ts`** — Tests for GET /api/children (returns sorted children, handles errors)
- [ ] **`app/api/children/__tests__/child-by-id.test.ts`** — Tests for GET /api/children/:id (returns child, returns 404 for missing ID, handles errors)

## 🔮 Future / Integration Tests

- [ ] **Firebase Emulator integration tests** — Server actions (`adjustScoreAction`, `addChildAction`, `updateChildAction`, `deleteChildAction`) are tightly coupled to Firebase Admin SDK. Consider using the Firebase Emulator Suite to test these end-to-end.
