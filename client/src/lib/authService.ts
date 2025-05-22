// Service for handling authentication
import { User } from "@shared/mysql-schema";
import { apiRequest } from "./queryClient";
import React from 'react';

// Define user type specifically for authService
// This matches the MySQL schema but with specific types for createdAt
export type AuthUser = {
  id: number;
  username: string;
  password: string;
  fullName: string;
  mobilePhone: string | null;
  role: "admin" | "vht";
  district: string | null;
  healthFacility: string | null;
  status: "active" | "inactive" | "pending";
  createdAt: Date | null;
};

// User authentication credentials
interface LoginCredentials {
  username: string;
  password: string;
}

// Class to handle authentication
class AuthService {
  private currentUser: AuthUser | null = null;
  private listeners = new Set<(user: AuthUser | null) => void>();

  constructor() {
    // Try to get user from session storage on initialization
    if (typeof window !== "undefined") {
      try {
        const storedUser = sessionStorage.getItem("currentUser");
        if (storedUser) {
          this.currentUser = JSON.parse(storedUser);
          this.notifyListeners();
        }
      } catch (error) {
        console.error("Error loading stored user:", error);
      }
    }
  }

  // Log in user with online validation
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    try {
      // Try API login first for all cases - this will check against MySQL database
      console.log("Attempting API login");
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        console.log("API login failed, status:", response.status);
        throw new Error("Username or password is incorrect");
      }

      const user = await response.json();
      console.log("API login successful");
      
      // Store user in session
      await this.setCurrentUser(user);
      
      return user;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  // Log out user
  async logout(): Promise<void> {
    try {
      // Try online logout
      try {
        await fetch("/api/logout", {
          method: "POST",
          credentials: "include",
        });
      } catch (error) {
        console.error("Logout request failed:", error);
      }
      
      // Clear local user state
      sessionStorage.removeItem("currentUser");
      this.currentUser = null;
      this.notifyListeners();
      
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  }

  // Register a new user
  async register(userData: Omit<AuthUser, "id" | "createdAt">): Promise<AuthUser> {
    try {
      // Try online registration
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error("Registration failed");
      }

      const user = await response.json();
      return user;
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  }

  // Get current authenticated user
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  // Check if a user has admin role
  isAdmin(): boolean {
    return this.currentUser?.role === "admin";
  }

  // Check if a user is authenticated
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Set current user and notify listeners
  setCurrentUser(user: AuthUser): Promise<void> {
    this.currentUser = user;
    
    // Store in session storage for persistence
    if (typeof window !== "undefined") {
      sessionStorage.setItem("currentUser", JSON.stringify(user));
    }
    
    this.notifyListeners();
    return Promise.resolve();
  }

  // Subscribe to user changes
  subscribe(listener: (user: AuthUser | null) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately notify with current state
    listener(this.currentUser);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Notify all listeners of user changes
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentUser);
      } catch (error) {
        console.error("Error in auth listener:", error);
      }
    });
  }
}

// Create singleton instance
export const authService = new AuthService();

// React Hook for authentication state
export function useAuth() {
  const [user, setUser] = React.useState<User | null>(authService.getCurrentUser());
  
  React.useEffect(() => {
    return authService.subscribe(setUser);
  }, []);
  
  return {
    user,
    login: authService.login.bind(authService),
    logout: authService.logout.bind(authService),
    register: authService.register.bind(authService),
    isAdmin: authService.isAdmin.bind(authService),
    isAuthenticated: authService.isAuthenticated.bind(authService),
  };
}