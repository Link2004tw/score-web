import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignupPage from "../page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignUp = vi.fn();
const mockUseAuth = vi.fn();
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ signUp: mockSignUp });
});

describe("SignupPage", () => {
  it("renders signup form", () => {
    render(<SignupPage />);

    expect(screen.getByText("Create Account")).toBeInTheDocument();
    expect(screen.getByLabelText("Display Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument();
  });

  it("renders link to login", () => {
    render(<SignupPage />);

    const loginLink = screen.getByRole("link", { name: /login/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("calls signUp and redirects on valid submission", async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue(undefined);
    render(<SignupPage />);

    await user.type(screen.getByLabelText("Display Name"), "Test User");
    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith("test@test.com", "password123", "Test User");
    });
    expect(mockPush).toHaveBeenCalledWith("/leaderboard");
  });

  it("shows error when passwords do not match", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText("Display Name"), "Test User");
    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "different");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("shows error when password is too short", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText("Display Name"), "Test User");
    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "12345");
    await user.type(screen.getByLabelText("Confirm Password"), "12345");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(screen.getByText("Password must be at least 6 characters")).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("shows loading state while signing up", async () => {
    const user = userEvent.setup();
    let resolveSignUp: () => void;
    mockSignUp.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSignUp = resolve;
      }),
    );
    render(<SignupPage />);

    await user.type(screen.getByLabelText("Display Name"), "Test User");
    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(screen.getByRole("button", { name: "Creating account..." })).toBeDisabled();

    resolveSignUp!();
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Creating account..." })).not.toBeInTheDocument();
    });
  });

  it("shows email-already-in-use error", async () => {
    const user = userEvent.setup();
    const firebaseError = new Error("Firebase: Error (auth/email-already-in-use).");
    mockSignUp.mockRejectedValue(firebaseError);
    render(<SignupPage />);

    await user.type(screen.getByLabelText("Display Name"), "Test User");
    await user.type(screen.getByLabelText("Email"), "exists@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    await waitFor(() => {
      expect(screen.getByText("This email is already registered")).toBeInTheDocument();
    });
  });

  it("shows invalid-email error", async () => {
    const user = userEvent.setup();
    mockSignUp.mockRejectedValue(new Error("Firebase: Error (auth/invalid-email)."));
    render(<SignupPage />);

    await user.type(screen.getByLabelText("Display Name"), "Test User");
    await user.type(screen.getByLabelText("Email"), "bad@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeInTheDocument();
    });
  });

  it("shows generic error for unknown errors", async () => {
    const user = userEvent.setup();
    mockSignUp.mockRejectedValue(new Error("Network error"));
    render(<SignupPage />);

    await user.type(screen.getByLabelText("Display Name"), "Test User");
    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });
});
