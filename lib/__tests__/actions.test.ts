import { describe, it, expect, vi, beforeEach } from "vitest";

const { AuthError } = await import("../verify-auth");

const mockRequireAuth = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() => vi.fn());
const mockAddChild = vi.hoisted(() => vi.fn());
const mockUpdateChild = vi.hoisted(() => vi.fn());
const mockDeleteChild = vi.hoisted(() => vi.fn());
const mockGetChildById = vi.hoisted(() => vi.fn());
const mockAuditLog = vi.hoisted(() => vi.fn());
const mockGetLastWednesdayDate = vi.hoisted(() => vi.fn());

// Firestore doc ref — shared across all doc() calls
const mockDoc = vi.hoisted(() => ({
  update: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}));

// Firestore collection ref — shared singleton, tests can control .get
const mockCollectionControl = vi.hoisted(() => ({
  doc: vi.fn(() => mockDoc),
  get: vi.fn(),
}));

const mockCollectionFn = vi.hoisted(() => vi.fn(() => mockCollectionControl));

// Firestore batch
const mockBatch = vi.hoisted(() => ({
  update: vi.fn(),
  set: vi.fn(),
  commit: vi.fn(),
}));

const mockDbBatch = vi.hoisted(() => vi.fn(() => mockBatch));

// FieldValue mock with both increment and delete
const mockFieldValue = vi.hoisted(() => ({
  increment: vi.fn((n: number) => ({ __increment: n })),
  delete: vi.fn(() => ({ __delete: true })),
}));

vi.mock("../verify-auth", () => ({
  requireAuth: mockRequireAuth,
  AuthError: class extends Error {
    constructor(m: string) {
      super(m);
      this.name = "AuthError";
    }
  },
}));

vi.mock("../rate-limit", () => ({
  rateLimit: mockRateLimit,
}));

vi.mock("../admin-store", () => ({
  addChild: mockAddChild,
  updateChild: mockUpdateChild,
  deleteChild: mockDeleteChild,
  getChildById: mockGetChildById,
}));

vi.mock("../audit-log", () => ({
  auditLog: mockAuditLog,
}));

vi.mock("../attendance-utils", () => ({
  getLastWednesdayDate: mockGetLastWednesdayDate,
}));

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: mockCollectionFn,
    batch: mockDbBatch,
  },
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: mockFieldValue,
}));

import {
  addChildAction,
  deleteChildAction,
  updateChildAction,
  adjustScoreAction,
  markAttendanceAction,
  markAllAttendanceAction,
  finalizeChoirSessionAction,
} from "../actions";

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockReturnValue({ success: true });
  mockRequireAuth.mockResolvedValue({ uid: "admin", email: "admin@test.com" });
  mockGetLastWednesdayDate.mockReturnValue("2026-06-10");
  // Reset collection-level get
  mockCollectionControl.get.mockReset();
  mockCollectionControl.get.mockResolvedValue(undefined);
});

const mockChild = {
  id: "child-1",
  name: "Alice",
  grade: "5 primary",
  gender: "female" as const,
  score: 95,
  createdAt: "2026-01-01T00:00:00Z",
  normalAttendance: 5,
  choirAttendance: 3,
  choirMisses: 1,
  choirStatus: "active" as const,
  lastNormalDate: "2026-06-03",
};

describe("addChildAction", () => {
  it("adds a child and returns it", async () => {
    const newChild = { ...mockChild, id: "new-id" };
    mockAddChild.mockResolvedValue(newChild);

    const result = await addChildAction({
      name: "Alice",
      grade: "5 primary",
      gender: "female",
      score: 95,
    });

    expect(result).toEqual(newChild);
    expect(mockRequireAuth).toHaveBeenCalledOnce();
    expect(mockRateLimit).toHaveBeenCalledOnce();
    expect(mockAddChild).toHaveBeenCalledWith({
      name: "Alice",
      grade: "5 primary",
      gender: "female",
      score: 95,
    });
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "addChild", targetId: "new-id" }),
    );
  });
});

describe("adjustScoreAction", () => {
  it("adjusts and returns new score", async () => {
    mockGetChildById.mockResolvedValue(mockChild);
    mockDoc.update.mockResolvedValue(undefined);

    const result = await adjustScoreAction("child-1", 5);

    expect(result).toEqual({ score: 100 });
    expect(mockGetChildById).toHaveBeenCalledWith("child-1");
    expect(mockDoc.update).toHaveBeenCalledWith({ score: 100 });
    expect(mockAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "adjustScore" }));
  });

  it("returns error when student not found", async () => {
    mockGetChildById.mockResolvedValue(null);

    const result = await adjustScoreAction("child-1", 5);

    expect(result).toEqual({ error: "Student not found" });
    expect(mockDoc.update).not.toHaveBeenCalled();
  });

  it("clamps score to minimum 0", async () => {
    mockGetChildById.mockResolvedValue(mockChild);

    const result = await adjustScoreAction("child-1", -200);

    expect(result).toEqual({ score: 0 });
    expect(mockDoc.update).toHaveBeenCalledWith({ score: 0 });
  });

  it("returns error on auth failure", async () => {
    mockRequireAuth.mockRejectedValue(new AuthError("No auth"));

    const result = await adjustScoreAction("child-1", 5);

    expect(result).toEqual({ error: "No auth" });
    expect(mockGetChildById).not.toHaveBeenCalled();
  });

  it("returns error on rate limit", async () => {
    mockRateLimit.mockReturnValue({ success: false });
    mockRequireAuth.mockResolvedValue({ uid: "admin" });

    const result = await adjustScoreAction("child-1", 5);

    expect(result).toEqual({ error: "Too many requests. Please slow down." });
    expect(mockGetChildById).not.toHaveBeenCalled();
  });
});

describe("markAttendanceAction", () => {
  it("marks normal attendance", async () => {
    mockGetChildById.mockResolvedValue(mockChild);
    mockDoc.set.mockResolvedValue(undefined);
    mockDoc.update.mockResolvedValue(undefined);

    const result = await markAttendanceAction("child-1", "normal");

    expect(result).toEqual({ count: 6, action: "marked" });
    expect(mockDoc.update).toHaveBeenCalled();
    expect(mockDoc.set).toHaveBeenCalled();
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "markNormalAttendance" }),
    );
  });

  it("unmarks normal attendance when already marked today", async () => {
    mockGetChildById.mockResolvedValue({
      ...mockChild,
      normalAttendance: 5,
      lastNormalDate: "2026-06-10",
    });
    mockDoc.update.mockResolvedValue(undefined);

    const result = await markAttendanceAction("child-1", "normal");

    expect(result).toEqual({ count: 4, action: "unmarked" });
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "unmarkNormalAttendance" }),
    );
  });

  it("marks choir attendance", async () => {
    mockGetChildById.mockResolvedValue({
      ...mockChild,
      lastChoirDate: "2026-06-03",
    });
    mockDoc.set.mockResolvedValue(undefined);
    mockDoc.update.mockResolvedValue(undefined);
    mockDoc.get.mockResolvedValue({ exists: false });

    const result = await markAttendanceAction("child-1", "choir");

    expect(result).toEqual({ count: 4, action: "marked" });
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "markChoirAttendance" }),
    );
  });

  it("unmarks choir attendance when already marked today", async () => {
    mockGetChildById.mockResolvedValue({
      ...mockChild,
      choirAttendance: 3,
      lastChoirDate: "2026-06-10",
    });
    mockDoc.update.mockResolvedValue(undefined);

    const result = await markAttendanceAction("child-1", "choir");

    expect(result).toEqual({ count: 2, action: "unmarked" });
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "unmarkChoirAttendance" }),
    );
  });

  it("returns error when student not found", async () => {
    mockGetChildById.mockResolvedValue(null);

    const result = await markAttendanceAction("child-1", "normal");

    expect(result).toEqual({ error: "Student not found" });
  });

  it("returns error on auth failure", async () => {
    mockRequireAuth.mockRejectedValue(new AuthError("No auth"));

    const result = await markAttendanceAction("child-1", "normal");

    expect(result).toEqual({ error: "No auth" });
  });
});

describe("markAllAttendanceAction", () => {
  it("marks all unmarked students", async () => {
    const students = [
      { id: "1", name: "Alice", lastNormalDate: "2026-06-03" },
      { id: "2", name: "Bob", lastNormalDate: undefined },
      { id: "3", name: "Charlie", lastNormalDate: "2026-06-03" },
    ];

    let docIndex = 0;
    mockDoc.get.mockImplementation(() => {
      const data = students[docIndex] || { name: "Unknown" };
      const exists = docIndex < students.length;
      docIndex++;
      return Promise.resolve({ exists, data: () => data, id: data.id });
    });

    const result = await markAllAttendanceAction(["1", "2", "3"], "normal");

    // All 3 have lastNormalDate !== today (undefined is "never marked"), so all get marked
    expect(result).toEqual({ marked: 3, errors: 0 });
    expect(mockBatch.update).toHaveBeenCalledTimes(3);
    expect(mockBatch.set).toHaveBeenCalledOnce();
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("returns zero if all already marked", async () => {
    const students = [{ id: "1", name: "Alice", lastNormalDate: "2026-06-10" }];

    mockDoc.get.mockResolvedValue({ exists: true, data: () => students[0], id: "1" });

    const result = await markAllAttendanceAction(["1"], "normal");

    expect(result).toEqual({ marked: 0, errors: 0 });
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });
});

describe("finalizeChoirSessionAction", () => {
  beforeEach(() => {
    mockDoc.set.mockResolvedValue(undefined);
    mockBatch.update.mockReturnValue(undefined);
    mockBatch.set.mockReturnValue(undefined);
    mockBatch.commit.mockResolvedValue(undefined);
  });

  it("finalizes and marks out students with 3+ misses", async () => {
    // metaRef.get() — first call to mockDoc.get
    mockDoc.get.mockResolvedValueOnce({ exists: false });

    // Collection-level get() — the second Firestore call
    mockCollectionControl.get.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "1",
          data: () => ({ lastChoirDate: "2026-06-03", choirMisses: 2, choirStatus: "active" }),
          ref: {},
        },
        {
          id: "2",
          data: () => ({ lastChoirDate: "2026-06-10", choirMisses: 0, choirStatus: "active" }),
          ref: {},
        },
        {
          id: "3",
          data: () => ({ lastChoirDate: "2026-06-03", choirMisses: 1, choirStatus: "active" }),
          ref: {},
        },
      ],
    });

    const result = await finalizeChoirSessionAction();

    expect(result).toEqual({ processed: 2, markedOut: 1 });
    expect(mockBatch.update).toHaveBeenCalledTimes(2);
    expect(mockBatch.set).toHaveBeenCalledOnce();
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("returns error if already finalized today", async () => {
    mockDoc.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ lastChoirFinalize: "2026-06-10" }),
    });

    const result = await finalizeChoirSessionAction();

    expect(result).toEqual({ error: "Choir session already finalized for today" });
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it("returns error when no students exist", async () => {
    mockDoc.get.mockResolvedValueOnce({ exists: false });
    mockCollectionControl.get.mockResolvedValue({ empty: true, docs: [] });

    const result = await finalizeChoirSessionAction();

    expect(result).toEqual({ error: "No students found" });
  });

  it("returns error on auth failure", async () => {
    mockRequireAuth.mockRejectedValue(new AuthError("No auth"));

    const result = await finalizeChoirSessionAction();

    expect(result).toEqual({ error: "No auth" });
  });
});
