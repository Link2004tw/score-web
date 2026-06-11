import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import EditPage from "../page";

// Mock React.use to avoid Suspense — returns the promise value directly
vi.mock("react", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react")>();
  return { ...mod, use: (value: unknown) => value };
});

const mockPush = vi.hoisted(() => vi.fn());
const mockPathname = vi.hoisted(() => vi.fn(() => "/child-123/edit"));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}));

const mockUpdateChildAction = vi.hoisted(() => vi.fn());
vi.mock("@/lib/actions", () => ({
  updateChildAction: mockUpdateChildAction,
}));

const mockUseAuth = vi.hoisted(() => vi.fn(() => ({ user: { uid: "123" }, loading: false })));
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mockUseAuth(),
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

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderEditPage() {
  render(<EditPage params={Promise.resolve({ id: "child-123" })} />);
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
}

const mockChild = {
  id: "child-123",
  name: "Alice",
  grade: "5 primary",
  gender: "female" as const,
  score: 95,
  normalAttendance: 5,
  choirAttendance: 3,
  choirMisses: 1,
  choirStatus: "active" as const,
  createdAt: "2026-01-01T00:00:00Z",
};

describe("EditPage", () => {
  it("shows loading state while fetching child data", async () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<EditPage params={Promise.resolve({ id: "child-123" })} />);
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows not found state for 404", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.reject(new Error("Not found")),
    } as unknown as Response);

    await renderEditPage();

    await waitFor(() => {
      expect(screen.getByText("Student not found.")).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /back to leaderboard/i })).toBeInTheDocument();
  });

  it("redirects to login on 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.reject(new Error("Unauthorized")),
    } as unknown as Response);

    await renderEditPage();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("shows error message on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    await renderEditPage();

    await waitFor(() => {
      expect(screen.getByText("Failed to load student (status 500)")).toBeInTheDocument();
    });
  });

  it("renders form with child data on successful fetch", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => mockChild,
    } as unknown as Response);

    await renderEditPage();

    await waitFor(() => {
      expect(screen.getByText("Edit Alice")).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    expect(nameInput.value).toBe("Alice");
    const scoreInput = screen.getByLabelText("Score") as HTMLInputElement;
    expect(scoreInput.value).toBe("95");
    const gradeSelect = screen.getByLabelText("Grade") as HTMLSelectElement;
    expect(gradeSelect.value).toBe("5 primary");
    const genderSelect = screen.getByLabelText("Gender") as HTMLSelectElement;
    expect(genderSelect.value).toBe("female");

    expect(screen.getByRole("link", { name: /back to alice/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });

  it("calls updateChildAction and redirects on form submission", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => mockChild,
    } as unknown as Response);

    mockUpdateChildAction.mockResolvedValue(undefined);
    await renderEditPage();

    await waitFor(() => {
      expect(screen.getByText("Edit Alice")).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText("Name");
    fireEvent.change(nameInput, { target: { value: "Alice Updated" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockUpdateChildAction).toHaveBeenCalledWith("child-123", {
        name: "Alice Updated",
        grade: "5 primary",
        gender: "female",
        score: 95,
      });
    });
    expect(mockPush).toHaveBeenCalledWith("/child-123");
  });

  it("redirects to login on AuthError during submission", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => mockChild,
    } as unknown as Response);

    const authError = new Error("No auth");
    authError.name = "AuthError";
    mockUpdateChildAction.mockRejectedValue(authError);
    await renderEditPage();

    await waitFor(() => {
      expect(screen.getByText("Edit Alice")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("shows error on submission failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => mockChild,
    } as unknown as Response);

    mockUpdateChildAction.mockRejectedValue(new Error("Save failed"));
    await renderEditPage();

    await waitFor(() => {
      expect(screen.getByText("Edit Alice")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(screen.getByText("Save failed")).toBeInTheDocument();
    });
  });
});
