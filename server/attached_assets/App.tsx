import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "./hooks/use-auth";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "./lib/protected-route";
import DashboardPage from "@/pages/dashboard";
import ChildrenListPage from "@/pages/children-list";
import ChildFormPage from "@/pages/child-form";
import ScreeningFormPage from "@/pages/screening-form";
import UserManagementPage from "@/pages/user-management";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/children" component={ChildrenListPage} />
      <ProtectedRoute path="/children/new" component={ChildFormPage} />
      <ProtectedRoute path="/children/:id/edit" component={ChildFormPage} />
      <ProtectedRoute path="/children/:id/screening" component={ScreeningFormPage} />
      <ProtectedRoute path="/users" component={UserManagementPage} adminOnly={true} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
