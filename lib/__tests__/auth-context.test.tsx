import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, renderHook, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../auth-context";

const mockOnAuthStateChanged = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockSignOut = vi.fn();
const mockUpdateProfile = vi.fn();
const mockGetIdToken = vi.fn();

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    mockCreateUserWithEmailAndPassword(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  getAuth: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  auth: {},
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuthProvider", () => {
  it("renders children", () => {
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      (cb as (u: null) => void)(null);
      return vi.fn();
    });

    render(
      <AuthProvider>
        <p>Child content</p>
      </AuthProvider>,
    );

    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("provides loading as true initially", () => {
    mockOnAuthStateChanged.mockImplementation(() => vi.fn());

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.loading).toBe(true);
  });

  it("sets loading to false after onAuthStateChanged fires", async () => {
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      (cb as (u: null) => void)(null);
      return vi.fn();
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it("provides null user when not authenticated", async () => {
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      (cb as (u: null) => void)(null);
      return vi.fn();
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
    });
  });

  it("provides user when authenticated", async () => {
    const mockUser = { uid: "123", email: "test@test.com", getIdToken: mockGetIdToken };
    mockGetIdToken.mockResolvedValue("fake-token");

    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      (cb as (u: typeof mockUser) => void)(mockUser);
      return vi.fn();
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });
  });
});
