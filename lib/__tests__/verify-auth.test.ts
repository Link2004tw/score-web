import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthError } from "../verify-auth";

const mockVerifyIdToken = vi.fn();
const mockCookieGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: mockCookieGet,
  }),
}));

vi.mock("firebase-admin", () => ({
  default: {
    auth: () => ({
      verifyIdToken: mockVerifyIdToken,
    }),
  },
}));

const { requireAuth, requireAuthApi } = await import("../verify-auth");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireAuth", () => {
  it("returns decoded token when valid cookie exists", async () => {
    const decoded = { uid: "123", email: "test@test.com" };
    mockCookieGet.mockReturnValue({ value: "valid-token" });
    mockVerifyIdToken.mockResolvedValue(decoded);

    const result = await requireAuth();

    expect(result).toEqual(decoded);
    expect(mockVerifyIdToken).toHaveBeenCalledWith("valid-token");
  });

  it("throws AuthError when no cookie exists", async () => {
    mockCookieGet.mockReturnValue(undefined);

    await expect(requireAuth()).rejects.toThrow(AuthError);
    await expect(requireAuth()).rejects.toThrow("No auth token found");
  });

  it("throws AuthError when token is invalid", async () => {
    mockCookieGet.mockReturnValue({ value: "invalid-token" });
    mockVerifyIdToken.mockRejectedValue(new Error("Invalid token"));

    await expect(requireAuth()).rejects.toThrow(AuthError);
    await expect(requireAuth()).rejects.toThrow("Invalid auth token");
  });
});

describe("requireAuthApi", () => {
  const mockRequest = (headers: Record<string, string>) =>
    ({ headers: { get: (key: string) => headers[key] ?? null } }) as unknown as Request;

  it("returns decoded token from Authorization header", async () => {
    const decoded = { uid: "123", email: "test@test.com" };
    const request = mockRequest({ Authorization: "Bearer header-token" });
    mockVerifyIdToken.mockResolvedValue(decoded);

    const result = await requireAuthApi(request);

    expect(result).toEqual(decoded);
    expect(mockVerifyIdToken).toHaveBeenCalledWith("header-token");
  });

  it("falls back to cookie when no Authorization header", async () => {
    const decoded = { uid: "456", email: "cookie@test.com" };
    const request = mockRequest({});
    mockCookieGet.mockReturnValue({ value: "cookie-token" });
    mockVerifyIdToken.mockResolvedValue(decoded);

    const result = await requireAuthApi(request);

    expect(result).toEqual(decoded);
    expect(mockVerifyIdToken).toHaveBeenCalledWith("cookie-token");
  });

  it("prefers Authorization header over cookie when both present", async () => {
    const headerDecoded = { uid: "header" };
    const request = mockRequest({ Authorization: "Bearer header-token" });
    mockCookieGet.mockReturnValue({ value: "cookie-token" });
    mockVerifyIdToken.mockResolvedValue(headerDecoded);

    const result = await requireAuthApi(request);

    expect(result).toEqual(headerDecoded);
    expect(mockVerifyIdToken).toHaveBeenCalledWith("header-token");
  });

  it("throws AuthError when no auth is present", async () => {
    const request = mockRequest({});
    mockCookieGet.mockReturnValue(undefined);

    await expect(requireAuthApi(request)).rejects.toThrow(AuthError);
    await expect(requireAuthApi(request)).rejects.toThrow("No auth token found");
  });

  it("throws AuthError when token verification fails", async () => {
    const request = mockRequest({ Authorization: "Bearer bad-token" });
    mockVerifyIdToken.mockRejectedValue(new Error("verify failed"));

    await expect(requireAuthApi(request)).rejects.toThrow(AuthError);
    await expect(requireAuthApi(request)).rejects.toThrow("Invalid auth token");
  });
});
