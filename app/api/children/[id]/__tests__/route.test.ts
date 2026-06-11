import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

function mockRequest(url?: string) {
  return {
    headers: new Headers({ "x-forwarded-for": "127.0.0.1" }),
  } as any;
}

const mockRequireAuthApi = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() => vi.fn());
const mockGetChildById = vi.hoisted(() => vi.fn());

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
  getChildById: mockGetChildById,
}));

describe("GET /api/children/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockReturnValue({ success: true });
    mockRequireAuthApi.mockResolvedValue(undefined);
  });

  it("returns child when found", async () => {
    const child = { id: "abc", name: "Alice" };
    mockGetChildById.mockResolvedValue(child);

    const response = await GET(mockRequest(), { params: Promise.resolve({ id: "abc" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(child);
    expect(mockGetChildById).toHaveBeenCalledWith("abc");
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuthApi.mockRejectedValue(new MockAuthError("Unauthorized"));

    const response = await GET(mockRequest(), { params: Promise.resolve({ id: "abc" }) });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 429 when rate limited", async () => {
    mockRateLimit.mockReturnValue({ success: false });

    const response = await GET(mockRequest(), { params: Promise.resolve({ id: "abc" }) });
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toEqual({ error: "Too many requests" });
  });

  it("returns 404 when child not found", async () => {
    mockGetChildById.mockResolvedValue(null);

    const response = await GET(mockRequest(), { params: Promise.resolve({ id: "nonexistent" }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Child not found" });
  });

  it("returns 500 on admin store error", async () => {
    mockGetChildById.mockRejectedValue(new Error("Firestore error"));

    const response = await GET(mockRequest(), { params: Promise.resolve({ id: "abc" }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Failed to fetch child" });
  });
});
