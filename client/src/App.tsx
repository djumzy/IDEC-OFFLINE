import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { Route, Switch, useLocation } from "wouter";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ChildrenListPage from "@/pages/children-list";
import ChildFormPage from "@/pages/child-form";
import ChildDashboardPage from "@/pages/child-dashboard";
import ScreeningFormPage from "@/pages/screening-form";
import ScreeningViewPage from "@/pages/screening-view";
import UserManagementPage from "@/pages/user-management";
import ScreeningsPage from "@/pages/screenings-page";
import ReportsPage from "@/pages/reports-page";
import TierFollowUpsPage from "@/pages/tier-followups";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/use-auth";
import TriersPage from "@/pages/tiers-page";

// Protected Route component
function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  if (adminOnly && user.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      
      <Route path="/dashboard">
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/children">
        <ProtectedRoute>
          <ChildrenListPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/children/new">
        <ProtectedRoute>
          <ChildFormPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/children/edit/:id">
        <ProtectedRoute>
          <ChildFormPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/children/:id">
        <ProtectedRoute>
          <ChildDashboardPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/children/:id/screening">
        <ProtectedRoute>
          <ScreeningFormPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/screenings">
        <ProtectedRoute>
          <ScreeningsPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/screenings/:id">
        <ProtectedRoute>
          <ScreeningViewPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/screening/new/:id">
        <ProtectedRoute>
          <ScreeningFormPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/triers">
        <ProtectedRoute>
          <TriersPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/tier-followups">
        <ProtectedRoute>
          <TierFollowUpsPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/users">
        <ProtectedRoute adminOnly>
          <UserManagementPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/reports">
        <ProtectedRoute adminOnly>
          <ReportsPage />
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}