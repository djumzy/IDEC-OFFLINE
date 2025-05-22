import { db } from './db';

class SyncService {
  private isOnline = navigator.onLine;
  private syncInProgress = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    this.startPeriodicSync();
  }

  private startPeriodicSync() {
    // Sync every 5 minutes when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncPendingData();
      }
    }, 5 * 60 * 1000);
  }

  private handleOnline = () => {
    this.isOnline = true;
    this.syncPendingData();
  };

  private handleOffline = () => {
    this.isOnline = false;
  };

  async login(username: string, password: string) {
    if (this.isOnline) {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
          const data = await response.json();
          await db.saveAuthData(data.user, data.token);
          await this.syncAllData();
          return data;
        }
        throw new Error('Login failed');
      } catch (error) {
        console.error('Login failed:', error);
        throw error;
      }
    } else {
      // Check if we have stored credentials
      const authData = await db.getAuthData();
      if (authData) {
        return authData;
      }
      throw new Error('No stored credentials and offline');
    }
  }

  async logout() {
    await db.clearAuthData();
    if (this.isOnline) {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
  }

  private async syncAllData() {
    if (!this.isOnline) return;

    const authData = await db.getAuthData();
    if (!authData) return;

    try {
      // Fetch all children
      const childrenResponse = await fetch('/api/children', {
        headers: { 'Authorization': `Bearer ${authData.token}` }
      });
      if (childrenResponse.ok) {
        const children = await childrenResponse.json();
        for (const child of children) {
          await db.updateChild(child.id, { ...child, sync_status: 'synced' });
        }
      }

      // Fetch all screenings
      const screeningsResponse = await fetch('/api/screenings', {
        headers: { 'Authorization': `Bearer ${authData.token}` }
      });
      if (screeningsResponse.ok) {
        const screenings = await screeningsResponse.json();
        for (const screening of screenings) {
          await db.updateScreening(screening.id, { ...screening, sync_status: 'synced' });
        }
      }
    } catch (error) {
      console.error('Failed to sync all data:', error);
    }
  }

  async syncPendingData() {
    if (!this.isOnline || this.syncInProgress) return;

    const authData = await db.getAuthData();
    if (!authData) return;

    try {
      this.syncInProgress = true;
      const { children, screenings } = await db.getPendingSync();

      // Sync children
      for (const child of children) {
        try {
          const response = await fetch('/api/children', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authData.token}`
            },
            body: JSON.stringify(child),
          });

          if (response.ok) {
            const syncedChild = await response.json();
            await db.updateChild(child.id, { ...syncedChild, sync_status: 'synced' });
          } else {
            await db.updateSyncStatus('children', child.id, 'error');
          }
        } catch (error) {
          await db.updateSyncStatus('children', child.id, 'error');
        }
      }

      // Sync screenings
      for (const screening of screenings) {
        try {
          const response = await fetch('/api/screenings', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authData.token}`
            },
            body: JSON.stringify(screening),
          });

          if (response.ok) {
            const syncedScreening = await response.json();
            await db.updateScreening(screening.id, { ...syncedScreening, sync_status: 'synced' });
          } else {
            await db.updateSyncStatus('screenings', screening.id, 'error');
          }
        } catch (error) {
          await db.updateSyncStatus('screenings', screening.id, 'error');
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  async addChild(child: any) {
    const authData = await db.getAuthData();
    if (!authData) throw new Error('Not authenticated');

    if (this.isOnline) {
      try {
        const response = await fetch('/api/children', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authData.token}`
          },
          body: JSON.stringify(child),
        });

        if (response.ok) {
          const syncedChild = await response.json();
          await db.updateChild(syncedChild.id, { ...syncedChild, sync_status: 'synced' });
          return syncedChild;
        }
      } catch (error) {
        console.error('Failed to add child online:', error);
      }
    }

    // If offline or request failed, store locally
    return db.addChild(child);
  }

  async addScreening(screening: any) {
    const authData = await db.getAuthData();
    if (!authData) throw new Error('Not authenticated');

    if (this.isOnline) {
      try {
        const response = await fetch('/api/screenings', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authData.token}`
          },
          body: JSON.stringify(screening),
        });

        if (response.ok) {
          const syncedScreening = await response.json();
          await db.updateScreening(syncedScreening.id, { ...syncedScreening, sync_status: 'synced' });
          return syncedScreening;
        }
      } catch (error) {
        console.error('Failed to add screening online:', error);
      }
    }

    // If offline or request failed, store locally
    return db.addScreening(screening);
  }
}

export const sync = new SyncService(); 