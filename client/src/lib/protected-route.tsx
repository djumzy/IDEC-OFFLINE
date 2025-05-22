import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

// Demo mode lets you bypass authentication
const DEMO_MODE = true;

// Mock admin user for demo access
const demoUser = {
  id: 1,
  username: "admin",
  password: "admin123",
  fullName: "Administrator",
  mobilePhone: "1234567890",
  role: "admin",
  district: "Kassanda",
  healthFacility: "Kassanda Health Center",
  status: "active",
  createdAt: new Date()
};

export function ProtectedRoute({
  path,
  component: Component,
  adminOnly = false,
}: {
  path: string;
  component: () => React.JSX.Element;
  adminOnly?: boolean;
}) {
  const { user, isLoading } = useAuth();
  
  // In demo mode, we use the mock user if no real user is available
  const effectiveUser = DEMO_MODE ? (user || demoUser) : user;

  if (isLoading && !DEMO_MODE) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // In demo mode, we don't redirect even if not authenticated
  if (!effectiveUser && !DEMO_MODE) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  if (adminOnly && effectiveUser?.role !== "admin" && !DEMO_MODE) {
    return (
      <Route path={path}>
        <Redirect to="/dashboard" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
