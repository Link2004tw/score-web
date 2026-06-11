import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LeaderboardPage from "../page";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/components/Navbar", () => ({
  Navbar: () => <nav data-testid="navbar">Navbar</nav>,
}));

vi.mock("@/components/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="protected-route">{children}</div>
  ),
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="protected-route">{children}</div>
  ),
}));

vi.mock("@/lib/attendance-utils", () => ({
  getTotalWednesdaysSince: () => 10,
}));

const baseStudent = {
  normalAttendance: 5,
  choirAttendance: 3,
  choirMisses: 1,
  choirStatus: "active" as const,
};

const mockStudents = [
  {
    id: "1",
    name: "Alice Smith",
    grade: "5 primary",
    gender: "female" as const,
    score: 95,
    createdAt: "2025-01-01T00:00:00Z",
    ...baseStudent,
  },
  {
    id: "2",
    name: "Bob Jones",
    grade: "3 primary",
    gender: "male" as const,
    score: 82,
    createdAt: "2025-01-02T00:00:00Z",
    ...baseStudent,
  },
  {
    id: "3",
    name: "Charlie Brown",
    grade: "5 primary",
    gender: "male" as const,
    score: 78,
    createdAt: "2025-01-03T00:00:00Z",
    ...baseStudent,
  },
  {
    id: "4",
    name: "Diana Prince",
    grade: "kg2",
    gender: "female" as const,
    score: 100,
    createdAt: "2025-01-04T00:00:00Z",
    ...baseStudent,
  },
  {
    id: "5",
    name: "Eve OUT",
    grade: "1 primary",
    gender: "female" as const,
    score: 60,
    createdAt: "2025-01-05T00:00:00Z",
    normalAttendance: 0,
    choirAttendance: 2,
    choirMisses: 3,
    choirStatus: "out" as const,
  },
];

describe("LeaderboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ children: mockStudents, hasMore: false }),
    });
  });

  it("shows loading state initially", () => {
    render(<LeaderboardPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders students after loading", async () => {
    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
    expect(screen.getByText("Diana Prince")).toBeInTheDocument();
  });

  it("shows no students message when API returns empty", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ children: [], hasMore: false }),
    });

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText("No students yet. Add one to get started.")).toBeInTheDocument();
    });
  });

  it("shows error message when API fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load students.")).toBeInTheDocument();
    });
  });

  it("redirects to login on 401", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("shows Load More button when hasMore is true", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ children: mockStudents, hasMore: true }),
    });

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Load More")).toBeInTheDocument();
    });
  });

  it("loads more students when Load More is clicked", async () => {
    const moreStudents = [
      {
        id: "6",
        name: "Frank More",
        grade: "2 primary",
        gender: "male" as const,
        score: 70,
        createdAt: "2025-01-06T00:00:00Z",
        ...baseStudent,
      },
    ];

    let callCount = 0;
    mockFetch.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ children: mockStudents, hasMore: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ children: moreStudents, hasMore: false }),
      });
    });

    const user = userEvent.setup();

    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Load More")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Load More"));

    await waitFor(() => {
      expect(screen.getByText("Frank More")).toBeInTheDocument();
    });
  });

  it("disables Load More button while loading", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ children: mockStudents, hasMore: true }),
    });

    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Load More")).toBeInTheDocument();
    });

    const button = screen.getByRole("button", { name: "Load More" });
    expect(button).not.toBeDisabled();
  });

  describe("filters", () => {
    beforeEach(async () => {
      render(<LeaderboardPage />);
      await waitFor(() => {
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      });
    });

    it("filters students by search", async () => {
      const user = userEvent.setup();
      const searchInput = screen.getByPlaceholderText("Search by name...");

      await user.type(searchInput, "bob");

      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
      expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument();
    });

    it("filters students by gender", async () => {
      const user = userEvent.setup();
      const genderSelect = screen.getByDisplayValue("All Genders");

      await user.selectOptions(genderSelect, "male");

      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
      expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
      expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument();
    });

    it("filters students by grade", async () => {
      const user = userEvent.setup();
      const gradeSelect = screen.getByDisplayValue("All Grades");

      await user.selectOptions(gradeSelect, "5 primary");

      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
      expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument();
    });

    it("shows no matches message when filters return empty", async () => {
      const user = userEvent.setup();
      const searchInput = screen.getByPlaceholderText("Search by name...");

      await user.type(searchInput, "xyzzy");

      expect(screen.getByText("No students match your filters.")).toBeInTheDocument();
    });
  });

  it("renders navbar and protected route wrapper", async () => {
    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("navbar")).toBeInTheDocument();
    });
    expect(screen.getByTestId("protected-route")).toBeInTheDocument();
  });

  it("shows attendance percentages", async () => {
    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    const normCell = screen.getAllByText("50%")[0];
    expect(normCell).toBeInTheDocument();

    const choirCell = screen.getAllByText("30%")[0];
    expect(choirCell).toBeInTheDocument();
  });

  it("shows OUT badge for choirStatus out", async () => {
    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Eve OUT")).toBeInTheDocument();
    });

    expect(screen.getByText("OUT")).toBeInTheDocument();
  });

  it("shows correct count text", async () => {
    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Showing/)).toBeInTheDocument();
    });

    expect(screen.getByText("Showing 5 of 5 loaded")).toBeInTheDocument();
  });
});
