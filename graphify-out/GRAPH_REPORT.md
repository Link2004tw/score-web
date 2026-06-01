# Graph Report - .  (2026-06-01)

## Corpus Check
- Corpus is ~12,463 words - fits in a single context window. You may not need a graph.

## Summary
- 159 nodes · 220 edges · 27 communities (20 shown, 7 thin omitted)
- Extraction: 80% EXTRACTED · 20% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_App Architecture & Docs|App Architecture & Docs]]
- [[_COMMUNITY_Auth Pages & UI Flow|Auth Pages & UI Flow]]
- [[_COMMUNITY_API & Server Actions|API & Server Actions]]
- [[_COMMUNITY_UI Component Library|UI Component Library]]
- [[_COMMUNITY_Page Routing|Page Routing]]
- [[_COMMUNITY_Core Services|Core Services]]
- [[_COMMUNITY_Leaderboard & Filtering|Leaderboard & Filtering]]
- [[_COMMUNITY_Placeholder Assets|Placeholder Assets]]
- [[_COMMUNITY_Next.js Security|Next.js Security]]
- [[_COMMUNITY_Loading Page|Loading Page]]
- [[_COMMUNITY_ESLint Config Node|ESLint Config Node]]
- [[_COMMUNITY_cn() Utility|cn() Utility]]
- [[_COMMUNITY_Test Setup Node|Test Setup Node]]
- [[_COMMUNITY_Description Doc|Description Doc]]
- [[_COMMUNITY_Graphify Config|Graphify Config]]

## God Nodes (most connected - your core abstractions)
1. `Root Layout` - 9 edges
2. `useAuth()` - 8 edges
3. `Leaderboard Page` - 8 edges
4. `Score Web README` - 8 edges
5. `Scoreboard App` - 8 edges
6. `Navbar()` - 7 edges
7. `ProtectedRoute()` - 7 edges
8. `requireAuth()` - 7 edges
9. `Button UI Primitive` - 7 edges
10. `Cloud Firestore` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Next.js Logo SVG` --conceptually_related_to--> `Next.js App Router`  [INFERRED]
  public/next.svg → README.md
- `Vercel Logo SVG` --conceptually_related_to--> `Vercel Deployment`  [INFERRED]
  public/vercel.svg → README.md
- `handleSubmit()` --calls--> `updateChildAction()`  [INFERRED]
  app/[id]/edit/page.tsx → lib/actions.ts
- `Security Audit Tasks` --conceptually_related_to--> `Firebase Auth`  [INFERRED]
  task.md → README.md
- `GET()` --calls--> `requireAuthApi()`  [INFERRED]
  app/api/children/route.ts → lib/verify-auth.ts

## Hyperedges (group relationships)
- **Student CRUD Pages** — create_page, child_detail_page, child_edit_page, leaderboard_page [INFERRED 0.85]
- **Authentication Pages** — login_page, signup_page, auth_flow_login, auth_flow_signup [INFERRED 0.90]
- **App Shell & Error Handling** — layout_root, error_boundary, loading_page, notfound_page [INFERRED 0.85]
- **Authentication System** — authcontext, verifyauth, actions [INFERRED 0.95]
- **Student Data Pipeline** — childschema, adminstore, filter, actions [INFERRED 0.85]
- **Firebase Initialization Chain** — env, firebase, firebaseadmin [INFERRED 0.95]
- **Score Web Tech Stack** — score_web_app, nextjs_app_router, firebase_auth, firestore, shadcn_ui, zod_validation [EXTRACTED 1.00]
- **Firebase Integration Stack** — firebase_auth, firestore, firebase_security_rules, auth_provider, protected_route [EXTRACTED 1.00]
- **Deployment Pipeline** — vercel_deploy, github_actions_ci, firebase_security_rules [INFERRED 0.85]

## Communities (27 total, 7 thin omitted)

### Community 0 - "App Architecture & Docs"
Cohesion: 0.12
Nodes (28): Next.js Agent Rules, API Routes Pattern, AuthProvider Context, Child/Student Data Model, API Reference, Architecture Doc, User Guide, Setup Guide (+20 more)

### Community 1 - "Auth Pages & UI Flow"
Cohesion: 0.1
Nodes (6): ConfirmDialog(), Navbar(), ProtectedRoute(), addChildAction(), AuthProvider(), useAuth()

### Community 2 - "API & Server Actions"
Cohesion: 0.17
Nodes (16): GET(), handleSubmit(), GET(), adjustScoreAction(), deleteChildAction(), updateChildAction(), addChild(), deleteChild() (+8 more)

### Community 3 - "UI Component Library"
Cohesion: 0.14
Nodes (7): Button UI Primitive, Card UI Primitive, ChildForm Component, ConfirmDialog Component, Input UI Primitive, cn(), Table UI Primitive

### Community 4 - "Page Routing"
Cohesion: 0.23
Nodes (17): Child By ID API, Children List API, Login Auth Flow, Signup Auth Flow, Child Detail Page, Child Edit Page, Create Student Page, Error Boundary Page (+9 more)

### Community 5 - "Core Services"
Cohesion: 0.23
Nodes (12): Server Actions, Admin Firestore Store, AuthContext Provider, ChildSchema Validation, Environment Config, Student Filter Logic, Filter Test Suite, Firebase Client Init (+4 more)

### Community 6 - "Leaderboard & Filtering"
Cohesion: 0.28
Nodes (4): filterStudents(), Table(), TableBody(), TableHeader()

### Community 7 - "Placeholder Assets"
Cohesion: 1.0
Nodes (3): File Icon SVG, Globe Icon SVG, Window Icon SVG

## Knowledge Gaps
- **19 isolated node(s):** `Loading Page`, `Not Found Page`, `ESLint Configuration`, `Next.js Configuration`, `Vitest Configuration` (+14 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `UI Component Library` to `Leaderboard & Filtering`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Why does `Navbar()` connect `Auth Pages & UI Flow` to `API & Server Actions`, `Leaderboard & Filtering`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `ProtectedRoute()` connect `Auth Pages & UI Flow` to `API & Server Actions`, `Leaderboard & Filtering`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `useAuth()` (e.g. with `Navbar()` and `ProtectedRoute()`) actually correct?**
  _`useAuth()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Loading Page`, `Not Found Page`, `ESLint Configuration` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Architecture & Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Auth Pages & UI Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._