import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttendanceHistoryPage from "../page";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const mockPush = vi.fn();
const stableRouter = { push: mockPush };
vi.mock("next/navigation", () => ({
  useRouter: () => stableRouter,
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
  getLastWednesdayDate: () => "2026-06-10",
}));

const mockSession = {
  id: "2026-06-10_normal",
  date: "2026-06-10",
  type: "normal" as const,
  count: 2,
  attendees: { "1": "Alice Smith", "2": "Bob Jones" },
};

describe("AttendanceHistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page with back link and date input", () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session: null }),
    });

    render(<AttendanceHistoryPage />);

    expect(screen.getByText("Attendance History")).toBeInTheDocument();
    expect(screen.getByText(/View who attended/)).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    expect(screen.getByText("Normal")).toBeInTheDocument();
    expect(screen.getByText("Choir")).toBeInTheDocument();
    expect(screen.getByText("View Attendance")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to attendance/i })).toBeInTheDocument();
  });

  it("shows Wednesday validation error", async () => {
    render(<AttendanceHistoryPage />);

    const dateInput = screen.getByLabelText("Date");
    await userEvent.setup().clear(dateInput);
    await userEvent.setup().type(dateInput, "2026-06-11");

    await waitFor(() => {
      expect(screen.getByText("Please select a Wednesday")).toBeInTheDocument();
    });
  });

  it("disables View Attendance button for non-Wednesday", async () => {
    render(<AttendanceHistoryPage />);

    const dateInput = screen.getByLabelText("Date");
    await userEvent.setup().clear(dateInput);
    await userEvent.setup().type(dateInput, "2026-06-11");

    await waitFor(() => {
      const button = screen.getByRole("button", { name: "View Attendance" });
      expect(button).toBeDisabled();
    });
  });

  it("no error on Wednesday date", async () => {
    render(<AttendanceHistoryPage />);

    expect(screen.queryByText("Please select a Wednesday")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View Attendance" })).not.toBeDisabled();
  });

  it("shows no attendance message when session is null", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session: null }),
    });

    const user = userEvent.setup();
    render(<AttendanceHistoryPage />);

    await user.click(screen.getByText("View Attendance"));

    await waitFor(() => {
      expect(screen.getByText("No attendance recorded for this date.")).toBeInTheDocument();
    });
  });

  it("displays session attendees after loading", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session: mockSession }),
    });

    const user = userEvent.setup();
    render(<AttendanceHistoryPage />);

    await user.click(screen.getByText("View Attendance"));

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByText("2 students present")).toBeInTheDocument();
  });

  it("shows error from API", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const user = userEvent.setup();
    render(<AttendanceHistoryPage />);

    await user.click(screen.getByText("View Attendance"));

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch")).toBeInTheDocument();
    });
  });

  it("redirects to login on 401", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    const user = userEvent.setup();
    render(<AttendanceHistoryPage />);

    await user.click(screen.getByText("View Attendance"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("switches between Normal and Choir tabs", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session: mockSession }),
    });

    const user = userEvent.setup();
    render(<AttendanceHistoryPage />);

    await user.click(screen.getByText("Choir"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /View Attendance/ })).toBeInTheDocument();
    });
  });

  it("renders navbar and protected route", () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session: null }),
    });

    render(<AttendanceHistoryPage />);

    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByTestId("protected-route")).toBeInTheDocument();
  });
});
