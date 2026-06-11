import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChildPage from "../page";

vi.mock("react", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react")>();
  return { ...mod, use: (value: unknown) => value };
});

const mockPush = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockDeleteChildAction = vi.hoisted(() => vi.fn());
vi.mock("@/lib/actions", () => ({
  deleteChildAction: mockDeleteChildAction,
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
  id: "child-123",
  name: "Alice Smith",
  grade: "5 primary",
  gender: "female" as const,
  score: 95,
  normalAttendance: 8,
  choirAttendance: 6,
  choirMisses: 1,
  choirStatus: "active" as const,
  createdAt: "2026-01-01T00:00:00Z",
};

async function renderChildPage() {
  render(<ChildPage params={Promise.resolve({ id: "child-123" })} />);
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
}

describe("ChildPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", async () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<ChildPage params={Promise.resolve({ id: "child-123" })} />);
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders student details after successful fetch", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(baseStudent),
    } as Response);

    await renderChildPage();

    await waitFor(() => {
      expect(screen.getAllByText("Alice Smith").length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText("5 primary")).toBeInTheDocument();
    expect(screen.getByText("female")).toBeInTheDocument();
    expect(screen.getByText("95")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("(80%)")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("(60%)")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();

    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Score")).toBeInTheDocument();
    expect(screen.getByText("Normal Attendance")).toBeInTheDocument();
    expect(screen.getByText("Choir Attendance")).toBeInTheDocument();
    expect(screen.getByText("Choir Misses")).toBeInTheDocument();
    expect(screen.getByText("Choir Status")).toBeInTheDocument();
    expect(screen.getByText("Added")).toBeInTheDocument();
  });

  it("shows 404 state when student not found", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    await renderChildPage();

    await waitFor(() => {
      expect(screen.getByText("Student not found.")).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /back to leaderboard/i })).toBeInTheDocument();
  });

  it("shows 404 state on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await renderChildPage();

    await waitFor(() => {
      expect(screen.getByText("Student not found.")).toBeInTheDocument();
    });
  });

  it("redirects to login on 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
    } as Response);

    await renderChildPage();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("renders Edit button with correct link", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(baseStudent),
    } as Response);

    await renderChildPage();

    await waitFor(() => {
      expect(screen.getAllByText("Alice Smith").length).toBeGreaterThanOrEqual(1);
    });

    const editLink = screen.getByRole("link", { name: "Edit" });
    expect(editLink).toHaveAttribute("href", "/child-123/edit");
  });

  it("opens ConfirmDialog on Delete click", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(baseStudent),
    } as Response);

    const user = userEvent.setup();
    await renderChildPage();

    await waitFor(() => {
      expect(screen.getAllByText("Alice Smith").length).toBeGreaterThanOrEqual(1);
    });

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.getByText("Delete student")).toBeInTheDocument();
    });
    expect(screen.getByText(/Delete Alice Smith\?/)).toBeInTheDocument();
  });

  it("calls deleteChildAction and navigates to leaderboard on confirm", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(baseStudent),
    } as Response);

    mockDeleteChildAction.mockResolvedValue(undefined);
    const user = userEvent.setup();
    await renderChildPage();

    await waitFor(() => {
      expect(screen.getAllByText("Alice Smith").length).toBeGreaterThanOrEqual(1);
    });

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(mockDeleteChildAction).toHaveBeenCalledWith("child-123");
    });
    expect(mockPush).toHaveBeenCalledWith("/leaderboard");
  });

  it("navigates to login on delete failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(baseStudent),
    } as Response);

    mockDeleteChildAction.mockRejectedValue(new Error("Auth error"));
    const user = userEvent.setup();
    await renderChildPage();

    await waitFor(() => {
      expect(screen.getAllByText("Alice Smith").length).toBeGreaterThanOrEqual(1);
    });

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("shows OUT badge for out-of-choir status", async () => {
    const outStudent = { ...baseStudent, choirStatus: "out" as const };
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(outStudent),
    } as Response);

    await renderChildPage();

    await waitFor(() => {
      expect(screen.getByText("OUT")).toBeInTheDocument();
    });
  });

  it("shows Active for active choir status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(baseStudent),
    } as Response);

    await renderChildPage();

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });
    expect(screen.queryByText("OUT")).not.toBeInTheDocument();
  });

  it("renders ProtectedRoute and Navbar", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(baseStudent),
    } as Response);

    await renderChildPage();

    await waitFor(() => {
      expect(screen.getByTestId("navbar")).toBeInTheDocument();
    });
    expect(screen.getByTestId("protected-route")).toBeInTheDocument();
  });

  it("renders Back to Leaderboard link", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(baseStudent),
    } as Response);

    await renderChildPage();

    await waitFor(() => {
      expect(screen.getAllByText("Alice Smith").length).toBeGreaterThanOrEqual(1);
    });

    const backLink = screen.getByRole("link", { name: /back to leaderboard/i });
    expect(backLink).toHaveAttribute("href", "/leaderboard");
  });
});
