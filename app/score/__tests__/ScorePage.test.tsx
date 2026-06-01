import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScorePage from "../page";

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock server action
vi.mock("@/lib/actions", () => ({
  adjustScoreAction: vi.fn(),
}));

import { adjustScoreAction } from "@/lib/actions";

// Mock useRouter
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock Navbar
vi.mock("@/components/Navbar", () => ({
  Navbar: () => <nav data-testid="navbar">Navbar</nav>,
}));

// Mock ProtectedRoute to just render children
vi.mock("@/components/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="protected-route">{children}</div>
  ),
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="protected-route">{children}</div>
  ),
}));

const mockStudents = [
  {
    id: "1",
    name: "Alice Smith",
    grade: "5 primary",
    gender: "female" as const,
    score: 95,
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Bob Jones",
    grade: "3 primary",
    gender: "male" as const,
    score: 82,
    createdAt: "2025-01-02T00:00:00Z",
  },
  {
    id: "3",
    name: "Charlie Brown",
    grade: "5 primary",
    gender: "male" as const,
    score: 78,
    createdAt: "2025-01-03T00:00:00Z",
  },
  {
    id: "4",
    name: "Diana Prince",
    grade: "kg2",
    gender: "female" as const,
    score: 100,
    createdAt: "2025-01-04T00:00:00Z",
  },
];

describe("ScorePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockStudents),
    });
  });

  it("shows loading state initially", () => {
    render(<ScorePage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders students after loading", async () => {
    render(<ScorePage />);

    await waitFor(() => {
      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    });

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
    expect(screen.getByText("Diana Prince")).toBeInTheDocument();
  });

  it("shows no students message when API returns empty", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<ScorePage />);

    await waitFor(() => {
      expect(screen.getByText("No students yet.")).toBeInTheDocument();
    });
  });

  it("shows error message when API fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<ScorePage />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load students.")
      ).toBeInTheDocument();
    });
  });

  describe("filters", () => {
    beforeEach(async () => {
      render(<ScorePage />);
      await waitFor(() => {
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      });
    });

    it("filters students by search", async () => {
      const user = userEvent.setup();
      const searchInput = screen.getByPlaceholderText("Search students...");

      await user.type(searchInput, "bob");

      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
      expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument();
      expect(screen.queryByText("Diana Prince")).not.toBeInTheDocument();
    });

    it("filters students by gender", async () => {
      const user = userEvent.setup();
      const genderSelect = screen.getByDisplayValue("All Genders");

      await user.selectOptions(genderSelect, "male");

      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
      expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
      expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument();
      expect(screen.queryByText("Diana Prince")).not.toBeInTheDocument();
    });

    it("filters students by grade", async () => {
      const user = userEvent.setup();
      const gradeSelect = screen.getByDisplayValue("All Grades");

      await user.selectOptions(gradeSelect, "5 primary");

      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
      expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument();
      expect(screen.queryByText("Diana Prince")).not.toBeInTheDocument();
    });

    it("combines search + gender + grade filters", async () => {
      const user = userEvent.setup();
      const searchInput = screen.getByPlaceholderText("Search students...");
      const genderSelect = screen.getByDisplayValue("All Genders");
      const gradeSelect = screen.getByDisplayValue("All Grades");

      await user.type(searchInput, "charlie");
      await user.selectOptions(genderSelect, "male");
      await user.selectOptions(gradeSelect, "5 primary");

      expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
      expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument();
    });

    it("shows no matches message when filters return empty", async () => {
      const user = userEvent.setup();
      const searchInput = screen.getByPlaceholderText("Search students...");

      await user.type(searchInput, "xyzzy");

      expect(
        screen.getByText("No students match your filters.")
      ).toBeInTheDocument();
    });
  });

  describe("score adjustment", () => {
    beforeEach(async () => {
      vi.mocked(adjustScoreAction).mockResolvedValue({ score: 96 });

      render(<ScorePage />);
      await waitFor(() => {
        expect(screen.getByText("95")).toBeInTheDocument();
      });
    });

    it("increments score when + button is clicked", async () => {
      const user = userEvent.setup();

      const incrementButtons = screen.getAllByRole("button", { name: "+" });
      // First student (Alice, score 95) - first + button in the list
      await user.click(incrementButtons[0]);

      await waitFor(() => {
        expect(adjustScoreAction).toHaveBeenCalledWith("1", 1);
      });
    });

    it("decrements score when - button is clicked", async () => {
      const user = userEvent.setup();

      const decrementButtons = screen.getAllByRole("button", { name: /−/ });
      // First student (Alice, score 95)
      await user.click(decrementButtons[0]);

      await waitFor(() => {
        expect(adjustScoreAction).toHaveBeenCalledWith("1", -1);
      });
    });

    it("uses custom amount when set", async () => {
      const user = userEvent.setup();
      const amountInput = screen.getByRole("spinbutton");

      await user.clear(amountInput);
      await user.type(amountInput, "5");

      const incrementButtons = screen.getAllByRole("button", { name: "+" });
      await user.click(incrementButtons[0]);

      await waitFor(() => {
        expect(adjustScoreAction).toHaveBeenCalledWith("1", 5);
      });
    });

    it("shows error message when adjustment fails", async () => {
      vi.mocked(adjustScoreAction).mockResolvedValue({
        error: "Student not found",
      });

      const user = userEvent.setup();
      const incrementButtons = screen.getAllByRole("button", { name: "+" });
      await user.click(incrementButtons[0]);

      await waitFor(() => {
        expect(
          screen.getByText("Student not found")
        ).toBeInTheDocument();
      });
    });
  });

  it("renders navbar and protected route wrapper", async () => {
    render(<ScorePage />);

    await waitFor(() => {
      expect(screen.getByTestId("navbar")).toBeInTheDocument();
    });
    expect(screen.getByTestId("protected-route")).toBeInTheDocument();
  });
});
