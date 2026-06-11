import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

function mockRequest(url?: string) {
  return {
    nextUrl: new URL(url ?? "http://localhost:3000/api/attendance-sessions"),
  } as any;
}

const mockRequireAuthApi = vi.hoisted(() => vi.fn());
const mockGetAttendanceSession = vi.hoisted(() => vi.fn());

const MockAuthError = vi.hoisted(
  () =>
    class extends Error {
      constructor(m: string) {
        super(m);
        this.name = "AuthError";
      }
    },
);

vi.mock("@/lib/verify-auth", () => ({
  requireAuthApi: mockRequireAuthApi,
  AuthError: MockAuthError,
}));

vi.mock("@/lib/admin-store", () => ({
  getAttendanceSession: mockGetAttendanceSession,
}));

describe("GET /api/attendance-sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuthApi.mockResolvedValue(undefined);
  });

  it("returns session with valid params", async () => {
    const session = {
      id: "2026-06-10_normal",
      date: "2026-06-10",
      type: "normal",
      count: 5,
      attendees: {},
    };
    mockGetAttendanceSession.mockResolvedValue(session);

    const response = await GET(
      mockRequest("http://localhost:3000/api/attendance-sessions?date=2026-06-10&type=normal"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ session });
    expect(mockGetAttendanceSession).toHaveBeenCalledWith("2026-06-10", "normal");
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuthApi.mockRejectedValue(new MockAuthError("Unauthorized"));

    const response = await GET(
      mockRequest("http://localhost:3000/api/attendance-sessions?date=2026-06-10&type=normal"),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when date is missing", async () => {
    const response = await GET(
      mockRequest("http://localhost:3000/api/attendance-sessions?type=normal"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "date and type (normal|choir) query params required",
    });
  });

  it("returns 400 when type is missing", async () => {
    const response = await GET(
      mockRequest("http://localhost:3000/api/attendance-sessions?date=2026-06-10"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "date and type (normal|choir) query params required",
    });
  });

  it("returns 400 when type is invalid", async () => {
    const response = await GET(
      mockRequest("http://localhost:3000/api/attendance-sessions?date=2026-06-10&type=invalid"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "date and type (normal|choir) query params required",
    });
  });

  it("returns 500 on admin store error", async () => {
    mockGetAttendanceSession.mockRejectedValue(new Error("Firestore error"));

    const response = await GET(
      mockRequest("http://localhost:3000/api/attendance-sessions?date=2026-06-10&type=normal"),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Firestore error" });
  });

  it("returns session as null when none found", async () => {
    mockGetAttendanceSession.mockResolvedValue(null);

    const response = await GET(
      mockRequest("http://localhost:3000/api/attendance-sessions?date=2026-06-10&type=normal"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ session: null });
  });
});
