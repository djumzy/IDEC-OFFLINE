import { offlineStorage } from './offline-storage';

class SyncService {
  private static instance: SyncService;
  private syncInProgress: boolean = false;
  private syncInterval: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.setupSync();
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  private setupSync() {
    // Sync when coming back online
    window.addEventListener('online', () => {
      this.syncPendingOperations();
    });

    // Periodic sync
    setInterval(() => {
      if (navigator.onLine) {
        this.syncPendingOperations();
      }
    }, this.syncInterval);
  }

  async syncPendingOperations() {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      const pendingOps = await offlineStorage.getPendingOperations();
      
      for (const op of pendingOps) {
        try {
          switch (op.entity) {
            case 'children':
              await this.syncChildOperation(op);
              break;
            case 'screenings':
              await this.syncScreeningOperation(op);
              break;
          }
          // Remove successful operation
          await offlineStorage.removePendingOperation(op.id);
        } catch (error) {
          console.error(`Failed to sync operation:`, op, error);
          // Keep failed operations for retry
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncChildOperation(op: any) {
    const endpoint = '/api/children';
    const childId = op.data.childId;

    switch (op.type) {
      case 'create':
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op.data)
        });
        break;

      case 'update':
        await fetch(`${endpoint}/${childId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op.data)
        });
        break;

      case 'delete':
        await fetch(`${endpoint}/${childId}`, {
          method: 'DELETE'
        });
        break;
    }
  }

  private async syncScreeningOperation(op: any) {
    const endpoint = '/api/screenings';
    const screeningId = op.data.id;

    switch (op.type) {
      case 'create':
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op.data)
        });
        break;

      case 'update':
        await fetch(`${endpoint}/${screeningId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op.data)
        });
        break;

      case 'delete':
        await fetch(`${endpoint}/${screeningId}`, {
          method: 'DELETE'
        });
        break;
    }
  }
}

export const syncService = SyncService.getInstance(); 