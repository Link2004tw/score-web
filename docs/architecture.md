# Architecture

## Overview

Scoreboard is a **Next.js 16** application using the **App Router** with a **Firebase** backend. It follows a server-client hybrid model where:

- **Server Actions** (`"use server"`) handle all Firestore writes (add, update, delete, adjust scores)
- **API Routes** (`app/api/`) handle Firestore reads (GET children)
- **Client Components** handle UI state, navigation, and user interaction

---

## Directory Structure

```
score-web/
├── app/                          # Next.js App Router pages
│   ├── api/
│   │   └── children/             # API routes for Firestore reads
│   │       ├── route.ts          #   GET /api/children       — list all
│   │       └── [id]/route.ts     #   GET /api/children/:id   — get one
│   │                             #   PATCH /api/children/:id  — update
│   ├── create/                   # POST /create — add student
│   ├── leaderboard/              # GET /leaderboard — ranking table
│   ├── login/                    # GET /login
│   ├── score/                    # GET /score — adjust scores
│   ├── signup/                   # GET /signup
│   ├── [id]/                     # GET /:id — student details
│   │   └── edit/                 # GET /:id/edit — edit student
│   ├── globals.css               # Tailwind + custom theme + animations
│   ├── layout.tsx                # Root layout (fonts, AuthProvider)
│   └── page.tsx                  # Home page (route: /)
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── table.tsx
│   ├── ChildForm.tsx             # Reusable form (add/edit)
│   ├── Navbar.tsx                # Top navigation bar
│   └── ProtectedRoute.tsx        # Auth guard wrapper
├── lib/
│   ├── actions.ts                # Server actions (writes to Firestore)
│   ├── auth-context.tsx          # Firebase Auth React context
│   ├── firebase.ts               # Firebase app initialisation
│   ├── schemas.ts                # Zod schemas + TypeScript types
│   ├── store.ts                  # Firestore CRUD helpers
│   └── utils.ts                  # cn() class merge utility
└── docs/                         # Documentation
```

---

## Data Flow

### Read Flow (displaying data)

```
Browser
  ↓ fetch("/api/children")
API Route (app/api/children/route.ts)
  ↓ collection("children") → orderBy("score", "desc")
Firestore
  ↓ returns docs
Browser ← JSON array of children
  ↓ setState + re-render
UI Component renders table/cards
```

### Write Flow (server action)

```
User clicks button (e.g., +)
  ↓ handleAdjust(id, delta)
Server Action (adjustScoreAction in lib/actions.ts)
  ↓ getChildById(id)
  ↓ calculate newScore = Math.max(0, current + delta)
  ↓ updateChild(id, { score })
  ↓ return { score: newScore }
Browser receives new score
  ↓ setChildren(prev => prev.map(...))
UI re-renders with updated score + animation
```

---

## Authentication Flow

```
AuthProvider (app/layout.tsx)
  ↓ wraps entire app
onAuthStateChanged listener
  ↓ user = User | null
ProtectedRoute component
  ↓ if (!user) → redirect /login
Navbar component
  ↓ shows user display name + logout button
```

### Auth Context API

| Method       | Description                             |
| ------------ | --------------------------------------- |
| `signUp`     | Creates user via Firebase Auth          |
| `login`      | Signs in with email/password            |
| `logout`     | Signs out and redirects to `/login`     |
| `user`       | Current Firebase `User` or `null`       |
| `loading`    | True while auth state is being resolved |

---

## Routing

| Route                | Page             | Auth Required | Description              |
| -------------------- | ---------------- | ------------- | ------------------------ |
| `/`                  | Home page        | No*           | Welcome / get started    |
| `/login`             | Login            | No            | Sign in                  |
| `/signup`            | Sign up          | No            | Create account           |
| `/leaderboard`       | Leaderboard      | Yes           | Ranked student list      |
| `/score`             | Score adjustment | Yes           | Increment/decrement      |
| `/create`            | Add student      | Yes           | New student form         |
| `/:id`               | Student details  | Yes           | View / edit / delete     |
| `/:id/edit`          | Edit student     | Yes           | Edit form (pre-filled)   |
| `/api/children`      | API              | —             | List all (GET)           |
| `/api/children/:id`  | API              | —             | Get one (GET) / Update (PATCH) |

> \* Home page shows different content based on auth state but doesn't use `ProtectedRoute`.

---

## Server Actions vs API Routes

| Concern                | Server Actions (`lib/actions.ts`) | API Routes (`app/api/`) |
| ---------------------- | --------------------------------- | ----------------------- |
| **Purpose**            | Firestore writes                  | Firestore reads         |
| **Called via**         | Direct import / `use server`      | `fetch()` from client   |
| **Auth**               | Firebase Admin SDK (server-side)  | Firebase Admin SDK      |
| **Endpoints**          | `addChildAction`, `updateChild...`| `GET /api/children`     |
| **Why separate?**      | Cleaner for mutation calls        | Cacheable reads         |

---

## Tech Decisions

### Why Server Actions for writes?

Server actions let us call Firestore operations from client components without building REST endpoints for every mutation. They run on the server, keeping Firebase Admin SDK usage server-side.

### Why API Routes for reads?

Reads benefit from Next.js caching and can be fetched declaratively in `useEffect`. They also serve as a clean data layer if we ever add a mobile client.

### Why Firebase Auth + Firestore?

Firebase provides a fully managed auth system (email/password, Google, etc.) and a real-time NoSQL database that scales to zero — ideal for a single-teacher classroom tool.
