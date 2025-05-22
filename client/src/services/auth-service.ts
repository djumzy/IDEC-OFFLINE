import { dataService } from './data-service';
import { offlineStorage } from './offline-storage';

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  district: string;
  healthFacility: string;
}

class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(username: string, password: string): Promise<User> {
    try {
      if (navigator.onLine) {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        if (!response.ok) throw new Error('Login failed');

        const user = await response.json();
        await this.setCurrentUser(user);
        return user;
      } else {
        // Try to get user from offline storage
        const user = await offlineStorage.getCurrentUser();
        if (!user) throw new Error('No offline user found');
        return user;
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      if (navigator.onLine) {
        await fetch('/api/auth/logout', { method: 'POST' });
      }
      this.currentUser = null;
      await offlineStorage.setCurrentUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.currentUser) {
      this.currentUser = await offlineStorage.getCurrentUser();
    }
    return this.currentUser;
  }

  private async setCurrentUser(user: User | null) {
    this.currentUser = user;
    await offlineStorage.setCurrentUser(user);
    await dataService.setCurrentUser(user);
  }

  isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  async checkAuth(): Promise<boolean> {
    try {
      if (navigator.onLine) {
        const response = await fetch('/api/auth/check');
        if (!response.ok) {
          await this.logout();
          return false;
        }
        const user = await response.json();
        await this.setCurrentUser(user);
        return true;
      } else {
        const user = await this.getCurrentUser();
        return !!user;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  }
}

export const authService = AuthService.getInstance(); 