import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "../Navbar";

const mockPush = vi.fn();
const mockPathname = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}));

const mockLogout = vi.fn();
const mockUseAuth = vi.fn();
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockPathname.mockReturnValue("/leaderboard");
});

describe("Navbar", () => {
  it("returns null when no user", () => {
    mockUseAuth.mockReturnValue({ user: null, logout: mockLogout });

    const { container } = render(<Navbar />);

    expect(container.innerHTML).toBe("");
  });

  it("renders all tab links when logged in", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "123", email: "test@test.com", displayName: null },
      logout: mockLogout,
    });

    render(<Navbar />);

    // Tabs appear twice (desktop nav + mobile nav), so use getAllByText
    expect(screen.getAllByText("Leaderboard").length).toBe(2);
    expect(screen.getAllByText("Add").length).toBe(2);
    expect(screen.getAllByText("Score").length).toBe(2);
    expect(screen.getAllByText("Attend").length).toBe(2);
    expect(screen.getAllByText("Logs").length).toBe(2);
  });

  it("shows display name when available", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "123", email: "test@test.com", displayName: "Test User" },
      logout: mockLogout,
    });

    render(<Navbar />);

    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("shows email fallback when no display name", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "123", email: "test@test.com", displayName: null },
      logout: mockLogout,
    });

    render(<Navbar />);

    expect(screen.getByText("test@test.com")).toBeInTheDocument();
  });

  it("calls logout and redirects on logout click", async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: { uid: "123", email: "test@test.com", displayName: null },
      logout: mockLogout,
    });
    mockLogout.mockResolvedValue(undefined);

    render(<Navbar />);

    await user.click(screen.getByRole("button", { name: "Logout" }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("highlights active tab in desktop nav", () => {
    mockPathname.mockReturnValue("/score");
    mockUseAuth.mockReturnValue({
      user: { uid: "123", email: "test@test.com", displayName: null },
      logout: mockLogout,
    });

    render(<Navbar />);

    // Desktop nav links have "text-sm" class
    const scoreLinks = screen.getAllByText("Score");
    const desktopLink = scoreLinks.find((el) => el.closest("a")?.className.includes("text-sm"));
    expect(desktopLink?.closest("a")?.className).toContain("text-foreground");
  });
});
