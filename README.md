# Scoreboard

A minimalist, mobile-first scoreboard web application built for teachers to track and adjust student scores quickly. Built with Next.js, Firebase Auth, and Firestore.

## Features

- **🔐 Authentication** — Email/password login and signup via Firebase Auth
- **📊 Leaderboard** — View all students ranked by score with search and filter (by name, grade, gender)
- **➕/➖ Score Adjustment** — Quickly increment/decrement scores with a customisable amount and animated visual feedback
- **👤 Student Management** — Add, edit, view details, and delete student records
- **📱 Mobile-First** — Responsive design optimised for phones and tablets

## Tech Stack

| Layer               | Technology                                     |
| ------------------- | ---------------------------------------------- |
| **Framework**       | Next.js 16 (App Router)                        |
| **Language**        | TypeScript                                     |
| **Styling**         | Tailwind CSS v4 + shadcn/ui (base-nova style)  |
| **Auth**            | Firebase Authentication                        |
| **Database**        | Cloud Firestore                                |
| **Forms**           | react-hook-form + Zod validation               |
| **Icons**           | Lucide React                                   |
| **Fonts**           | Geist (Vercel)                                 |

## Quick Start

### Prerequisites

- Node.js 20+
- A Firebase project with **Authentication** (Email/Password) and **Firestore** enabled

### Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd score-web

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Firebase Configuration

The project uses environment variables for Firebase config. Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Then edit `.env` with your Firebase project values from the [Firebase Console](https://console.firebase.google.com/) → Project Settings → Your apps:

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSy...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `your-project` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `your-project.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `123456789` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:123456789:web:abc...` |

> ⚠️ `.env` is gitignored. For deployment, set these as environment variables in Vercel (see [Deployment](#deployment) section).

### Firestore Security Rules

For development, use these permissive rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

> ⚠️ Restrict these rules before deploying to production.

## Project Structure

```
app/
├── (auth pages)        — /login, /signup
├── (protected pages)   — /leaderboard, /score, /create, /[id], /[id]/edit
├── api/                — /api/children (GET), /api/children/[id] (GET, PATCH)
├── layout.tsx          — Root layout with AuthProvider
├── page.tsx            — Home page
└── globals.css         — Global styles + theme

components/
├── ui/                 — shadcn/ui primitives (button, card, input, table)
├── ChildForm.tsx       — Reusable add/edit form
├── Navbar.tsx          — App navigation bar
└── ProtectedRoute.tsx  — Auth gate wrapper

lib/
├── actions.ts          — Server actions (add, update, delete, adjust score)
├── auth-context.tsx    — Firebase Auth React context
├── firebase.ts         — Firebase client initialisation
├── schemas.ts          — Zod schemas + TypeScript types
├── store.ts            — Firestore CRUD helpers
└── utils.ts            — cn() utility for Tailwind class merging
```

## Scripts

| Command            | Description              |
| ------------------ | ------------------------ |
| `npm run dev`      | Start dev server         |
| `npm run build`    | Production build         |
| `npm run start`    | Start production server  |
| `npm run lint`     | Run ESLint               |

## Usage

1. **Sign up / Log in** — Create an account or sign in
2. **Add students** — Navigate to "Add Student" and fill in the details
3. **Adjust scores** — Go to the Score page, search for a student, and use +/− buttons
4. **View leaderboard** — See all students ranked by score, filter by grade or gender
5. **Edit / Delete** — Click a student on the leaderboard to view details, edit, or delete

## Deployment

### Deploy the App (Vercel)

Deploy to [Vercel](https://vercel.com/new):

```bash
npm run build
```

Or connect your repository to Vercel for automatic deployments.

### Deploy Firestore Rules

The project includes a **`firestore.rules`** file with production-ready security rules. To deploy them:

```bash
# Install Firebase CLI (if needed)
npm install -g firebase-tools

# Login
firebase login

# Deploy rules (uses firebase.json config)
firebase deploy --only firestore:rules
```

The **`firebase.json`** config in the project root tells Firebase CLI which rules file to use.

> ⚠️ Always deploy the security rules before going live to prevent unauthenticated access to your database.

### GitHub Actions (CI/CD)

The project includes two GitHub Actions workflows:

**1. CI** — Runs on every push and pull request to `main`:
- `npm run lint` — ESLint
- `npx tsc --noEmit` — TypeScript type check
- `npm run build` — Next.js production build

**2. Deploy** — Runs on push to `main` (or manually via `workflow_dispatch`):
- Deploys the app to **Vercel** (production)
- Optionally deploys **Firestore security rules**

#### Required Secrets

Set these in your GitHub repository: **Settings → Secrets and variables → Actions**:

| Secret | Description | How to get it |
|--------|-------------|---------------|
| `VERCEL_TOKEN` | Vercel API token | [Vercel Account → Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel team ID | `vercel ls` in your project, or Vercel dashboard URL |
| `VERCEL_PROJECT_ID` | Vercel project ID | `vercel link` in your project, then check `.vercel/project.json` |
| `FIREBASE_TOKEN` | Firebase CI token | `firebase login:ci` in your terminal |

> **Tip:** Run `npx vercel link` locally first to create your Vercel project, then copy the IDs from `.vercel/project.json`.

## Documentation

See the [docs](./docs) folder for detailed documentation:

- [Architecture](./docs/architecture.md) — Project structure, data flow, routing
- [Setup Guide](./docs/setup.md) — Firebase config, environment, development setup
- [API Reference](./docs/api.md) — API routes, server actions, data models
- [User Guide](./docs/guide.md) — Complete user guide for teachers
