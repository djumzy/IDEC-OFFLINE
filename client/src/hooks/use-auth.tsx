import React, { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser } from "@shared/mysql-schema";
import { getQueryFn, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/authService";

// Import the AuthUser type from authService
// @ts-ignore - This is a workaround for importing types from a file that exports values
import { AuthUser } from "@/lib/authService";

type LoginData = {
  username: string;
  password: string;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<AuthUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
};

// Create context with a default value
const defaultContext: AuthContextType = {
  user: null,
  isLoading: true,
  error: null,
  loginMutation: {} as UseMutationResult<AuthUser, Error, LoginData>,
  logoutMutation: {} as UseMutationResult<void, Error, void>
};

export const AuthContext = createContext<AuthContextType>(defaultContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Initialize auth state from session storage
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        
        // Load user data if available in session
        if (authService.getCurrentUser()) {
          queryClient.setQueryData(["/api/user"], authService.getCurrentUser());
        } else {
          // Try the server API
          try {
            const response = await fetch("/api/user");
            if (response.ok) {
              const userData = await response.json();
              if (userData) {
                authService.setCurrentUser(userData);
              }
            }
          } catch (err) {
            console.error("Error fetching user data:", err);
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Use React Query to get the user (will be populated by the auth service)
  const { data: user } = useQuery<AuthUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !isLoading, // Don't start this query until initial loading is done
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      return await authService.login(credentials);
    },
    onSuccess: (user: AuthUser) => {
      console.log("Login successful, setting user data");
      queryClient.setQueryData(["/api/user"], user);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Login Successful",
        description: `Welcome, ${user.fullName}`,
      });
      
      // Redirect to dashboard
      window.location.href = "/dashboard";
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await authService.logout();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries();
      
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  return context;
}
