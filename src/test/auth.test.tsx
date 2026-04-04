import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

// ─── Supabase mock ────────────────────────────────────────────────────────────
// Use vi.hoisted so variables are available before vi.mock hoisting

const { mockSignIn, mockSignUp, mockSignOut, mockGetSession, mockOnAuthStateChange, mockFrom } =
  vi.hoisted(() => ({
    mockSignIn: vi.fn(),
    mockSignUp: vi.fn(),
    mockSignOut: vi.fn(),
    mockGetSession: vi.fn(),
    mockOnAuthStateChange: vi.fn(),
    mockFrom: vi.fn(),
  }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignIn,
      signUp: mockSignUp,
      signOut: mockSignOut,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
    from: mockFrom,
  },
}));

// ─── Helper component ─────────────────────────────────────────────────────────

function TestConsumer() {
  const { session, user, profile, loading, signIn, signOut } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="session">{session ? "has-session" : "no-session"}</span>
      <span data-testid="user">{user?.email ?? "no-user"}</span>
      <span data-testid="profile-role">{profile?.role ?? "no-role"}</span>
      <button onClick={() => signIn("test@example.com", "password123")}>Sign In</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockImplementation((_event: unknown, _cb: unknown) => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }));
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
    });
  });

  it("resolves loading state after mount", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
    expect(screen.getByTestId("session").textContent).toBe("no-session");
    expect(screen.getByTestId("user").textContent).toBe("no-user");
  });

  it("exposes session and user after getSession returns data", async () => {
    const mockUser = { id: "user-1", email: "alice@example.com" };
    const mockSession = { user: mockUser, access_token: "tok", refresh_token: "ref" };

    mockGetSession.mockResolvedValue({ data: { session: mockSession } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { display_name: "Alice", role: "project_manager", avatar_url: null },
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("session").textContent).toBe("has-session");
    });
    expect(screen.getByTestId("user").textContent).toBe("alice@example.com");
  });

  it("signIn calls supabase with correct credentials", async () => {
    mockSignIn.mockResolvedValue({ error: null });
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    await userEvent.click(screen.getByText("Sign In"));

    expect(mockSignIn).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
  });

  it("signIn returns error when credentials are wrong", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "Invalid credentials" } });

    let capturedResult: { error: Error | null } | undefined;

    function TestSignIn() {
      const { signIn } = useAuth();
      return (
        <button
          onClick={async () => {
            capturedResult = await signIn("bad@example.com", "wrong");
          }}
        >
          Sign In
        </button>
      );
    }

    render(
      <AuthProvider>
        <TestSignIn />
      </AuthProvider>
    );

    await act(async () => {
      await userEvent.click(screen.getByText("Sign In"));
    });

    expect(capturedResult?.error).toBeTruthy();
  });

  it("signOut calls supabase signOut", async () => {
    mockSignOut.mockResolvedValue({});
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    await userEvent.click(screen.getByText("Sign Out"));

    expect(mockSignOut).toHaveBeenCalled();
  });
});

describe("useAuth throws outside AuthProvider", () => {
  it("throws if used without AuthProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow();
    consoleSpy.mockRestore();
  });
});
