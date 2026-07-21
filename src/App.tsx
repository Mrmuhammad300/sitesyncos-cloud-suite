import { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { FieldLayout } from "@/components/FieldLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AnimatedRoutes } from "@/components/AnimatedRoutes";
import { lazy } from "react";

const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"));
const FieldModePage = lazy(() => import("@/pages/field/FieldModePage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
    },
  },
});

const Loading = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/field" element={
                <ProtectedRoute>
                  <FieldLayout>
                    <ErrorBoundary>
                      <FieldModePage />
                    </ErrorBoundary>
                  </FieldLayout>
                </ProtectedRoute>
              } />
              <Route path="*" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ErrorBoundary>
                      <AnimatedRoutes />
                    </ErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
