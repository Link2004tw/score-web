import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProtectedRoute } from "../ProtectedRoute";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseAuth = vi.fn();
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProtectedRoute", () => {
  it("shows loading state when auth is loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    render(
      <ProtectedRoute>
        <p>Protected content</p>
      </ProtectedRoute>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("returns null when not authenticated and not loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    const { container } = render(
      <ProtectedRoute>
        <p>Protected content</p>
      </ProtectedRoute>,
    );

    expect(container.innerHTML).toBe("");
    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("renders children when authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "123", email: "test@test.com" },
      loading: false,
    });

    render(
      <ProtectedRoute>
        <p>Protected content</p>
      </ProtectedRoute>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
