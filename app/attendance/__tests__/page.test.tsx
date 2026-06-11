import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttendancePage from "../page";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const mockPush = vi.fn();
const stableRouter = { push: mockPush };
vi.mock("next/navigation", () => ({
  useRouter: () => stableRouter,
}));

vi.mock("@/lib/actions", () => ({
  markAttendanceAction: vi.fn(),
  markAllAttendanceAction: vi.fn(),
  finalizeChoirSessionAction: vi.fn(),
}));

import {
  markAttendanceAction,
  markAllAttendanceAction,
  finalizeChoirSessionAction,
} from "@/lib/actions";

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
  getLastWednesdayDate: () => "2026-06-10",
  isTodayWednesday: () => false,
}));

const baseStudent = {
  normalAttendance: 5,
  choirAttendance: 3,
  choirMisses: 1,
  choirStatus: "active" as const,
  lastNormalDate: "2026-06-03",
  lastChoirDate: "2026-06-03",
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
    name: "Eve OUT",
    grade: "1 primary",
    gender: "female" as const,
    score: 60,
    createdAt: "2025-01-05T00:00:00Z",
    normalAttendance: 0,
    choirAttendance: 2,
    choirMisses: 3,
    choirStatus: "out" as const,
    lastNormalDate: undefined,
    lastChoirDate: undefined,
  },
];

describe("AttendancePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ children: mockStudents }),
    });
  });

  it("shows loading state initially", () => {
    render(<AttendancePage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders attendance page with tabs and date", async () => {
    render(<AttendancePage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    expect(screen.getByText("Attendance")).toBeInTheDocument();
    expect(screen.getByText("Normal")).toBeInTheDocument();
    expect(screen.getByText("Choir")).toBeInTheDocument();
    expect(screen.getByText(/Wednesday/)).toBeInTheDocument();
  });

  it("shows no students message when empty", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ children: [] }),
    });

    render(<AttendancePage />);

    await waitFor(() => {
      expect(screen.getByText("No students yet. Add one to get started.")).toBeInTheDocument();
    });
  });

  it("shows error when fetch fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<AttendancePage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch")).toBeInTheDocument();
    });
  });

  it("redirects to login on 401", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    render(<AttendancePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("toggles between Normal and Choir tabs", async () => {
    const user = userEvent.setup();

    render(<AttendancePage />);
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Choir"));
    expect(screen.getByRole("button", { name: /Complete Choir Session/ })).toBeInTheDocument();

    await user.click(screen.getByText("Normal"));
    expect(
      screen.queryByRole("button", { name: /Complete Choir Session/ }),
    ).not.toBeInTheDocument();
  });

  it("marks a student present on toggle", async () => {
    vi.mocked(markAttendanceAction).mockResolvedValue({ count: 6, action: "marked" });
    const user = userEvent.setup();

    render(<AttendancePage />);
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    const markButtons = screen.getAllByRole("button", { name: "Mark" });
    await user.click(markButtons[0]);

    await waitFor(() => {
      expect(markAttendanceAction).toHaveBeenCalledWith("1", "normal");
    });
  });

  it("shows error from markAttendanceAction", async () => {
    vi.mocked(markAttendanceAction).mockResolvedValue({ error: "Student not found" });
    const user = userEvent.setup();

    render(<AttendancePage />);
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    const markButtons = screen.getAllByRole("button", { name: "Mark" });
    await user.click(markButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Student not found")).toBeInTheDocument();
    });
  });

  it("shows already-present status when lastDate matches today", async () => {
    const markedStudent = {
      ...mockStudents[0],
      lastNormalDate: "2026-06-10",
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ children: [markedStudent, ...mockStudents.slice(1)] }),
    });

    render(<AttendancePage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    expect(screen.getByText("✓ Present")).toBeInTheDocument();
  });

  it("shows OUT badge for choir tab", async () => {
    const user = userEvent.setup();

    render(<AttendancePage />);
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Choir"));

    await waitFor(() => {
      const outElements = screen.getAllByText(/OUT/);
      expect(outElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("disables Mark button for OUT students on Choir tab", async () => {
    const user = userEvent.setup();

    render(<AttendancePage />);
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Choir"));

    await waitFor(() => {
      const outElements = screen.getAllByText(/OUT/);
      expect(outElements.length).toBeGreaterThanOrEqual(1);
    });

    const markButton = screen.getAllByRole("button", { name: "Mark" });
    expect(markButton[markButton.length - 1]).toBeDisabled();
  });

  it("calls markAllAttendanceAction on Mark All Present", async () => {
    vi.mocked(markAllAttendanceAction).mockResolvedValue({ marked: 3, errors: 0 });
    const user = userEvent.setup();

    render(<AttendancePage />);
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Mark All Present"));

    await waitFor(() => {
      expect(markAllAttendanceAction).toHaveBeenCalled();
    });
  });

  it("shows error from markAllAttendanceAction", async () => {
    vi.mocked(markAllAttendanceAction).mockResolvedValue({ error: "Already finalized" });
    const user = userEvent.setup();

    render(<AttendancePage />);
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Mark All Present"));

    await waitFor(() => {
      expect(screen.getByText("Already finalized")).toBeInTheDocument();
    });
  });

  it("shows Complete Choir Session button only on Choir tab", async () => {
    render(<AttendancePage />);
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    expect(screen.queryByText("Complete Choir Session")).not.toBeInTheDocument();
  });

  it("calls finalizeChoirSessionAction from ConfirmDialog", async () => {
    vi.mocked(finalizeChoirSessionAction).mockResolvedValue({ processed: 2, markedOut: 1 });
    const user = userEvent.setup();

    render(<AttendancePage />);
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Choir"));
    await user.click(screen.getByText("Complete Choir Session"));

    await waitFor(() => {
      expect(screen.getByText("Finalize")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Finalize"));

    await waitFor(() => {
      expect(finalizeChoirSessionAction).toHaveBeenCalled();
    });
  });

  it("shows finalize result message", async () => {
    vi.mocked(finalizeChoirSessionAction).mockResolvedValue({ processed: 2, markedOut: 1 });
    const user = userEvent.setup();

    render(<AttendancePage />);
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Choir"));
    await user.click(screen.getByText("Complete Choir Session"));
    await user.click(screen.getByText("Finalize"));

    await waitFor(() => {
      expect(screen.getByText(/Session finalized/)).toBeInTheDocument();
    });
  });

  it("renders navbar and protected route", async () => {
    render(<AttendancePage />);

    await waitFor(() => {
      expect(screen.getByTestId("navbar")).toBeInTheDocument();
    });
    expect(screen.getByTestId("protected-route")).toBeInTheDocument();
  });
});
