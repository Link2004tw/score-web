import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "../page";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockUseAuth = vi.fn();
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("HomePage", () => {
  it("shows loading state initially", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    render(<Home />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("redirects to leaderboard when authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "123", email: "test@test.com" },
      loading: false,
    });

    render(<Home />);

    expect(mockReplace).toHaveBeenCalledWith("/leaderboard");
  });

  it("redirects to login when unauthenticated", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    render(<Home />);

    expect(mockReplace).toHaveBeenCalledWith("/login");
  });
});
