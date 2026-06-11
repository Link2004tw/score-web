import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

function mockRequest(url?: string) {
  return {
    headers: new Headers({ "x-forwarded-for": "127.0.0.1" }),
    nextUrl: new URL(url ?? "http://localhost:3000/api/children"),
  } as any;
}

const mockRequireAuthApi = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() => vi.fn());
const mockGetChildren = vi.hoisted(() => vi.fn());

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

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
}));

vi.mock("@/lib/admin-store", () => ({
  getChildren: mockGetChildren,
}));

describe("GET /api/children", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockReturnValue({ success: true });
    mockRequireAuthApi.mockResolvedValue(undefined);
  });

  it("returns sorted children when authenticated", async () => {
    const children = [{ id: "1", name: "Alice" }];
    mockGetChildren.mockResolvedValue({ children });

    const response = await GET(mockRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ children });
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuthApi.mockRejectedValue(new MockAuthError("Unauthorized"));

    const response = await GET(mockRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 429 when rate limited", async () => {
    mockRateLimit.mockReturnValue({ success: false });

    const response = await GET(mockRequest());
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toEqual({ error: "Too many requests" });
  });

  it("returns 500 on admin store error", async () => {
    mockGetChildren.mockRejectedValue(new Error("Firestore error"));

    const response = await GET(mockRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Firestore error" });
  });

  it("passes limit query param to getChildren", async () => {
    mockGetChildren.mockResolvedValue({ children: [] });

    await GET(mockRequest("http://localhost:3000/api/children?limit=10"));

    expect(mockGetChildren).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
  });

  it("passes startAfter params to getChildren", async () => {
    mockGetChildren.mockResolvedValue({ children: [] });

    await GET(mockRequest("http://localhost:3000/api/children?score=80&id=abc"));

    expect(mockGetChildren).toHaveBeenCalledWith(
      expect.objectContaining({ startAfterScore: 80, startAfterId: "abc" }),
    );
  });

  it("caps limit at 500", async () => {
    mockGetChildren.mockResolvedValue({ children: [] });

    await GET(mockRequest("http://localhost:3000/api/children?limit=999"));

    expect(mockGetChildren).toHaveBeenCalledWith(expect.objectContaining({ limit: 500 }));
  });
});
