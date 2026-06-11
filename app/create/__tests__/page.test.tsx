import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreatePage from "../page";

const mockPush = vi.hoisted(() => vi.fn());
const mockPathname = vi.hoisted(() => vi.fn(() => "/create"));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}));

const mockAddChildAction = vi.hoisted(() => vi.fn());
vi.mock("@/lib/actions", () => ({
  addChildAction: mockAddChildAction,
}));

const mockUseAuth = vi.hoisted(() => vi.fn(() => ({ user: { uid: "123" }, loading: false })));
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CreatePage", () => {
  it("renders the form with correct title and back link", () => {
    render(<CreatePage />);

    expect(screen.getByRole("button", { name: "Add Student" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to leaderboard/i })).toBeInTheDocument();
    // "Add Student" also appears as the card title
    expect(screen.getAllByText("Add Student").length).toBe(2);
  });

  it("navigates to new child page on successful submission", async () => {
    const user = userEvent.setup();
    mockAddChildAction.mockResolvedValue({ id: "new-123" });
    render(<CreatePage />);

    await user.type(screen.getByLabelText("Name"), "Alice");
    await user.selectOptions(screen.getByLabelText("Grade"), "5 primary");
    await user.selectOptions(screen.getByLabelText("Gender"), "female");
    await user.type(screen.getByLabelText("Score"), "95");
    await user.click(screen.getByRole("button", { name: "Add Student" }));

    await waitFor(() => {
      expect(mockAddChildAction).toHaveBeenCalledWith({
        name: "Alice",
        grade: "5 primary",
        gender: "female",
        score: 95,
      });
    });
    expect(mockPush).toHaveBeenCalledWith("/new-123");
  });

  it("redirects to login on AuthError", async () => {
    const user = userEvent.setup();
    const authError = new Error("No auth");
    authError.name = "AuthError";
    mockAddChildAction.mockRejectedValue(authError);
    render(<CreatePage />);

    await user.type(screen.getByLabelText("Name"), "Alice");
    await user.selectOptions(screen.getByLabelText("Grade"), "5 primary");
    await user.selectOptions(screen.getByLabelText("Gender"), "female");
    await user.type(screen.getByLabelText("Score"), "95");
    await user.click(screen.getByRole("button", { name: "Add Student" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("shows error message on submission failure", async () => {
    const user = userEvent.setup();
    mockAddChildAction.mockRejectedValue(new Error("Server error"));
    render(<CreatePage />);

    await user.type(screen.getByLabelText("Name"), "Alice");
    await user.selectOptions(screen.getByLabelText("Grade"), "5 primary");
    await user.selectOptions(screen.getByLabelText("Gender"), "female");
    await user.type(screen.getByLabelText("Score"), "95");
    await user.click(screen.getByRole("button", { name: "Add Student" }));

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("shows fallback error message for non-Error throws", async () => {
    const user = userEvent.setup();
    mockAddChildAction.mockRejectedValue("string error");
    render(<CreatePage />);

    await user.type(screen.getByLabelText("Name"), "Alice");
    await user.selectOptions(screen.getByLabelText("Grade"), "5 primary");
    await user.selectOptions(screen.getByLabelText("Gender"), "female");
    await user.type(screen.getByLabelText("Score"), "95");
    await user.click(screen.getByRole("button", { name: "Add Student" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to add student. Please try again.")).toBeInTheDocument();
    });
  });
});
