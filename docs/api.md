# API Reference

## Overview

The app uses two data access patterns:

1. **API Routes** — RESTful endpoints for reading data (used by client components via `fetch()`)
2. **Server Actions** — Direct server-side functions for writing data (imported directly into client components)

---

## API Routes

### `GET /api/children`

Returns all students sorted by score (descending).

**Response:** `StoredChild[]`

```json
[
  {
    "id": "abc123",
    "name": "Alice Smith",
    "grade": "3 primary",
    "gender": "female",
    "score": "95",
    "createdAt": "2026-05-31T21:51:49.763Z"
  }
]
```

**Errors:**

| Status | Body                              |
| ------ | --------------------------------- |
| 500    | `{ "error": "Failed to fetch children" }` |

---

### `GET /api/children/:id`

Returns a single student by ID.

**Response:** `StoredChild`

```json
{
  "id": "abc123",
  "name": "Alice Smith",
  "grade": "3 primary",
  "gender": "female",
  "score": "95",
  "createdAt": "2026-05-31T21:51:49.763Z"
}
```

**Errors:**

| Status | Body                                       |
| ------ | ------------------------------------------ |
| 404    | `{ "error": "Child not found" }`           |
| 500    | `{ "error": "Failed to fetch child" }`     |

---

### `PATCH /api/children/:id`

Updates a student's fields. Accepts a partial `Child` object.

**Request Body** (partial):

```json
{
  "score": "100"
}
```

**Response:** `StoredChild` (the updated document)

```json
{
  "id": "abc123",
  "name": "Alice Smith",
  "grade": "3 primary",
  "gender": "female",
  "score": "100",
  "createdAt": "2026-05-31T21:51:49.763Z"
}
```

**Errors:**

| Status | Body                                       |
| ------ | ------------------------------------------ |
| 404    | `{ "error": "Child not found" }`           |
| 500    | `{ "error": "Failed to update child" }`    |

---

## Server Actions

Server actions are defined in `lib/actions.ts` with the `"use server"` directive. They are called directly from client components (not via HTTP).

### `addChildAction(data: Child) → Promise<StoredChild>`

Creates a new student record.

```typescript
import { addChildAction } from "@/lib/actions";

const child = await addChildAction({
  name: "Bob Jones",
  grade: "2 primary",
  gender: "male",
  score: "0",
});
// → { id: "def456", name: "Bob Jones", ..., createdAt: "..." }
```

---

### `updateChildAction(id: string, data: Partial<Child>) → Promise<void>`

Updates a student's fields.

```typescript
import { updateChildAction } from "@/lib/actions";

await updateChildAction("def456", { score: "50" });
```

---

### `deleteChildAction(id: string) → Promise<void>`

Deletes a student record.

```typescript
import { deleteChildAction } from "@/lib/actions";

await deleteChildAction("def456");
```

---

### `adjustScoreAction(id: string, delta: number) → Promise<{ score: number } | { error: string }>`

Adjusts a student's score by `delta` (positive or negative). The score is clamped to a minimum of 0. There is no upper limit.

```typescript
import { adjustScoreAction } from "@/lib/actions";

// Increase by 30
const result = await adjustScoreAction("abc123", 30);
if ("error" in result) {
  console.error(result.error);
} else {
  console.log("New score:", result.score);
}
```

**Returns on success:**

```json
{ "score": 125 }
```

**Returns on error:**

```json
{ "error": "Student not found" }
```

---

## Data Types

### `Child` (Zod Schema)

```typescript
const childSchema = z.object({
  name: z.string().min(1, "Name is required"),
  grade: z.enum([
    "kg1",
    "kg2",
    "1 primary",
    "2 primary",
    "3 primary",
    "4 primary",
    "5 primary",
    "6 primary",
  ]),
  gender: z.enum(["male", "female"]),
  score: z.string().min(1, "Score is required"),
});

type Child = z.infer<typeof childSchema>;
```

### `StoredChild` (from Firestore)

```typescript
interface StoredChild extends Child {
  id: string;
  createdAt: string; // ISO 8601
}
```

---

## Usage in Client Components

### Reading data

```tsx
useEffect(() => {
  fetch("/api/children")
    .then((res) => res.json())
    .then((data: StoredChild[]) => setChildren(data));
}, []);
```

### Writing data

```tsx
import { addChildAction } from "@/lib/actions";

const handleSubmit = async (data: Child) => {
  const newChild = await addChildAction(data);
  router.push(`/${newChild.id}`);
};
```
