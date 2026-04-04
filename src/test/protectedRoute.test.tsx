import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// ─── Auth mock ────────────────────────────────────────────────────────────────

const mockUseAuth = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// ─── Test helpers ─────────────────────────────────────────────────────────────

function renderWithRouter(element: React.ReactNode, initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/" element={element} />
        <Route path="/admin" element={element} />
      </Routes>
    </MemoryRouter>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ProtectedRoute", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows spinner while loading", () => {
    mockUseAuth.mockReturnValue({ loading: true, session: null, profile: null });
    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("redirects to /login when no session", async () => {
    mockUseAuth.mockReturnValue({ loading: false, session: null, profile: null });
    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );
    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders children when session exists and no role required", () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      session: { user: { id: "u1" } },
      profile: { role: "field_staff" },
    });
    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("renders children when user has required role", () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      session: { user: { id: "u1" } },
      profile: { role: "admin" },
    });
    renderWithRouter(
      <ProtectedRoute requiredRoles={["admin", "super_admin"]}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });

  it("shows access restricted when user lacks required role", () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      session: { user: { id: "u1" } },
      profile: { role: "field_staff" },
    });
    renderWithRouter(
      <ProtectedRoute requiredRoles={["admin", "super_admin"]}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("shows access restricted when profile is null but role required", () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      session: { user: { id: "u1" } },
      profile: null,
    });
    renderWithRouter(
      <ProtectedRoute requiredRoles={["admin"]}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders children for super_admin when admin is required", () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      session: { user: { id: "u1" } },
      profile: { role: "super_admin" },
    });
    renderWithRouter(
      <ProtectedRoute requiredRoles={["admin", "super_admin"]}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });
});
