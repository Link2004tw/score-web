import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "../page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockLogin = vi.fn();
const mockUseAuth = vi.fn();
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ login: mockLogin });
});

describe("LoginPage", () => {
  it("renders login form", () => {
    render(<LoginPage />);

    expect(screen.getAllByText("Login").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });

  it("renders link to signup", () => {
    render(<LoginPage />);

    const signupLink = screen.getByRole("link", { name: /sign up/i });
    expect(signupLink).toBeInTheDocument();
    expect(signupLink).toHaveAttribute("href", "/signup");
  });

  it("calls login and redirects on valid submission", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(undefined);
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("test@test.com", "password123");
    });
    expect(mockPush).toHaveBeenCalledWith("/leaderboard");
  });

  it("shows loading state while logging in", async () => {
    const user = userEvent.setup();
    let resolveLogin: () => void;
    mockLogin.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveLogin = resolve;
      }),
    );
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByRole("button", { name: "Logging in..." })).toBeDisabled();

    resolveLogin!();
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Logging in..." })).not.toBeInTheDocument();
    });
  });

  it("shows invalid credential error message", async () => {
    const user = userEvent.setup();
    const firebaseError = new Error("Firebase: Error (auth/invalid-credential).");
    mockLogin.mockRejectedValue(firebaseError);
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "wrong@test.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
    });
  });

  it("shows generic error message for unknown errors", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new Error("Network error"));
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("clears previous error on new submission", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new Error("First error")).mockResolvedValueOnce(undefined);
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(screen.getByText("First error")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(2);
      expect(screen.queryByText("First error")).not.toBeInTheDocument();
    });
  });
});
