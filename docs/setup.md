# Setup Guide

## Prerequisites

- **Node.js** 20.19+ (required by Firestore SDK v7)
- **npm** (comes with Node.js)
- A **Firebase project** with **Authentication** and **Firestore** enabled

---

## 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** (or select an existing one)
3. Disable Google Analytics (optional)
4. Wait for the project to be created

### Enable Authentication

1. In the Firebase Console, go to **Authentication → Sign-in method**
2. Enable **Email/Password** provider
3. (Optional) Enable additional providers like Google if desired

### Enable Firestore

1. Go to **Firestore Database → Create database**
2. Choose a location (e.g., `eur3` for Europe)
3. Start in **test mode** (or set up security rules manually)
4. Click **Create**

---

## 2. Get Firebase Config

1. In the Firebase Console, go to **Project Settings → General → Your apps**
2. Click **Add app → Web** (`</>` icon)
3. Register the app (any nickname works)
4. Copy the `firebaseConfig` object

---

## 3. Configure the Project

The Firebase config is loaded from environment variables (defined in `.env`):

```bash
# Copy the example file and fill in your values
cp .env.example .env
```

Then edit `.env` with your Firebase project values:

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSy...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `your-project` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `your-project.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `123456789` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:123456789:web:abc...` |

> ⚠️ `.env` is gitignored (see `.gitignore`). Never commit secrets to version control.

---

## 4. Firestore Security Rules

The project includes a pre-configured rules file at **`firestore.rules`** (in the project root). These rules require authentication for all operations and validate data fields on create/update.

### Deploying the Rules

To deploy the rules to your Firebase project:

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy
cd E:\coding\web-dev\score-web
firebase deploy --only firestore:rules
```

The `firebase.json` file in the project root already points to `firestore.rules`, so no additional configuration is needed.

### Rule Summary

| Operation | Rule |
|-----------|------|
| **Read**  | Any authenticated user can read all children |
| **Create** | Authenticated only; validates `name`, `grade`, `gender`, `score`, and `createdAt` |
| **Update** | Authenticated only; only allows changes to `name`, `grade`, `gender`, `score` (locks `createdAt`) |
| **Delete** | Any authenticated user can delete |

See the full rules in [`firestore.rules`](../firestore.rules).

---

## 5. Local Development

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Available Scripts

| Command            | Description                    |
| ------------------ | ------------------------------ |
| `npm run dev`      | Start Next.js dev server       |
| `npm run build`    | Production build               |
| `npm run start`    | Start production server        |
| `npm run lint`     | Run ESLint across the project  |

---

## 6. Deployment

### Deploy to Vercel (recommended)

1. Push the repository to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repository
4. Click **Deploy**

No additional configuration is needed — Vercel detects Next.js automatically.

### Environment Variables

Since the Firebase config now uses environment variables, add these in Vercel under **Project Settings → Environment Variables**:

| Variable                         | Value                |
| -------------------------------- | -------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`   | Your API key         |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Your auth domain   |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`  | Your project ID     |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Your storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Your sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID`    | Your app ID         |

---

## 7. Data Model

The app uses a single Firestore collection: `children`.

### Document Structure

```typescript
interface Child {
  name: string;       // Student's full name
  grade: string;      // One of: kg1, kg2, 1 primary, ..., 6 primary
  gender: string;     // "male" | "female"
  score: string;      // Numeric score stored as string
  createdAt: string;  // ISO date string (auto-generated)
}
```

### Grades

| Key          | Label        |
| ------------ | ------------ |
| `kg1`        | KG1          |
| `kg2`        | KG2          |
| `1 primary`  | 1st Primary  |
| `2 primary`  | 2nd Primary  |
| `3 primary`  | 3rd Primary  |
| `4 primary`  | 4th Primary  |
| `5 primary`  | 5th Primary  |
| `6 primary`  | 6th Primary  |

---

## 8. Troubleshooting

### "Failed to fetch children" error

- Check that Firestore is created in your Firebase project
- Verify security rules allow reads from authenticated users

### "auth/invalid-credential" on login

- Make sure the Email/Password sign-in method is enabled in Firebase Auth
- Verify the user exists (try signing up first)

### Score not updating

- Check the browser console for server action errors
- Verify Firestore write rules allow authenticated updates
- Ensure the document ID is correct
