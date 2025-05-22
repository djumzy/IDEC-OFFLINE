import { indexedDBService } from './indexedDB';
import { apiRequest } from './queryClient';
import { queryClient } from './queryClient';

// Types for better type safety
export type SyncOperation = 'create' | 'update' | 'delete';
export type StoreName = 'users' | 'children' | 'screenings';

export interface SyncQueueItem {
  id: string;
  storeName: StoreName;
  operation: SyncOperation;
  data: any;
  timestamp: string;
  retryCount?: number;
  error?: string;
}

export interface SyncInfo {
  pendingChanges: number;
  pendingByType?: {
    children: number;
    screenings: number;
    users: number;
  };
  lastSynced: string | null;
  isOnline: boolean;
  isSyncing: boolean;
}

// Improved sync service for managing offline/online data synchronization
class SyncService {
  private subscribers: Set<Function>;
  private isSyncing: boolean;
  private syncInterval: NodeJS.Timeout | null;
  private offlineMode: boolean = false;
  
  constructor() {
    this.subscribers = new Set();
    this.isSyncing = false;
    this.syncInterval = null;
    
    // Initialize auto-sync when online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      
      // Start auto-sync if online
      if (navigator.onLine) {
        this.startAutoSync();
      }
      
      // Initialize IndexedDB
      this.initializeIndexedDB();
    }
  }
  
  // Initialize IndexedDB and load initial data
  private async initializeIndexedDB() {
    try {
      await indexedDBService.initDatabase();
      
      // If online, pull initial data
      if (navigator.onLine) {
        this.initialDataLoad();
      }
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
    }
  }
  
  // Event handlers
  private handleOnline = async () => {
    console.log('Connection restored - online mode activated');
    this.offlineMode = false;
    this.startAutoSync();
    this.notifySubscribers({ isOnline: true });
    
    // Sync immediately when coming back online
    await this.syncAll();
  };
  
  private handleOffline = () => {
    console.log('Connection lost - offline mode activated');
    this.offlineMode = true;
    this.stopAutoSync();
    this.notifySubscribers({ isOnline: false });
  };
  
  // Notification for subscribers
  private notifySubscribers(data: any) {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in sync subscriber:', error);
      }
    });
  }
  
  // Subscribe to sync events
  subscribe(callback: Function) {
    this.subscribers.add(callback);
    // Immediately notify with current status
    this.getSyncInfo().then(info => callback(info));
    return () => this.unsubscribe(callback);
  }
  
  // Unsubscribe from sync events
  unsubscribe(callback: Function) {
    this.subscribers.delete(callback);
  }
  
  // Get sync information
  async getSyncInfo(): Promise<SyncInfo> {
    const meta = await indexedDBService.getSyncMeta();
    const queue = await indexedDBService.getSyncQueue();
    
    // Count pending changes by type
    const pendingByType = {
      children: 0,
      screenings: 0,
      users: 0
    };
    
    queue.forEach(item => {
      if (item.storeName in pendingByType) {
        pendingByType[item.storeName as keyof typeof pendingByType]++;
      }
    });
    
    return {
      pendingChanges: meta.pendingChanges,
      pendingByType,
      lastSynced: meta.lastSynced,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSyncing: this.isSyncing
    };
  }
  
  // Get offline status
  isOffline(): boolean {
    return this.offlineMode || !navigator.onLine;
  }
  
  // Start automatic sync when online
  private startAutoSync() {
    if (this.syncInterval) return;
    
    // Check for pending changes every minute
    this.syncInterval = setInterval(async () => {
      const { pendingChanges } = await this.getSyncInfo();
      if (pendingChanges > 0) {
        this.syncAll();
      }
    }, 60000); // 1 minute
    
    // Initial sync when coming online
    this.syncAll();
  }
  
  // Stop automatic sync
  private stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  // Sync all pending changes
  async syncAll() {
    if (this.isSyncing || !navigator.onLine) return;
    
    this.isSyncing = true;
    this.notifySubscribers({ isSyncing: true });
    
    try {
      // First, pull data from server to ensure we have latest data
      await this.pullFromServer();
      
      // Then push pending changes to server
      await this.pushToServer();
      
      // Update last synced time
      await indexedDBService.updateLastSynced();
      const info = await this.getSyncInfo();
      this.notifySubscribers(info);
      
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
      this.notifySubscribers({ isSyncing: false });
    }
  }
  
  // Pull data from server to local storage
  private async pullFromServer() {
    try {
      // Load all data types from the server
      const [users, children, screenings] = await Promise.all([
        this.fetchData('/api/users'),
        this.fetchData('/api/children'),
        this.fetchData('/api/screenings')
      ]);
      
      // Save to IndexedDB
      if (users) await indexedDBService.saveAllUsers(users);
      if (children) await indexedDBService.saveAllChildren(children);
      if (screenings) await indexedDBService.saveAllScreenings(screenings);
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/children'] });
      queryClient.invalidateQueries({ queryKey: ['/api/screenings'] });
      
      console.log(`Pulled data: ${users?.length || 0} users, ${children?.length || 0} children, ${screenings?.length || 0} screenings`);
    } catch (error) {
      console.error('Error pulling data from server:', error);
    }
  }
  
  // Helper to fetch data and handle errors
  private async fetchData(url: string): Promise<any[] | null> {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        console.error(`Failed to fetch ${url}:`, res.status, res.statusText);
        return null;
      }
      return await res.json();
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      return null;
    }
  }
  
  // Push pending changes to server
  private async pushToServer() {
    const queue = await indexedDBService.getSyncQueue();
    if (queue.length === 0) return;
    
    console.log(`Processing ${queue.length} pending changes`);
    
    // Process in order (oldest first)
    const sortedQueue = [...queue].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    for (const item of sortedQueue) {
      try {
        await this.processSyncItem(item);
        // Remove from queue when successfully processed
        await indexedDBService.removeSyncQueueItem(item.id);
      } catch (error) {
        console.error(`Error processing sync item ${item.id}:`, error);
        
        // Mark as errored but keep in queue for retry later
        const updatedItem = {
          ...item,
          retryCount: (item.retryCount || 0) + 1,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        
        // Only update if we haven't tried too many times
        if (updatedItem.retryCount < 5) {
          await indexedDBService.put('sync_queue', updatedItem);
        }
        // Continue with other items
      }
    }
  }
  
  // Process a single sync queue item
  private async processSyncItem(item: SyncQueueItem) {
    const { storeName, operation, data } = item;
    
    if (operation === 'create' || operation === 'update') {
      let url = '';
      let method = operation === 'create' ? 'POST' : 'PUT';
      
      switch (storeName) {
        case 'users':
          url = operation === 'create' ? '/api/users' : `/api/users/${data.id}`;
          break;
        case 'children':
          url = operation === 'create' ? '/api/children' : `/api/children/${data.id}`;
          break;
        case 'screenings':
          url = operation === 'create' ? '/api/screenings' : `/api/screenings/${data.id}`;
          break;
        default:
          throw new Error(`Unknown store name: ${storeName}`);
      }
      
      const result = await apiRequest(method, url, data);
      
      // If it was a create operation, update the local entity with the new ID
      if (operation === 'create' && result && result.id && result.id !== data.id) {
        // Update local entity with server-generated ID
        await indexedDBService.put(storeName, result);
      }
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [`/api/${storeName}`] });
      if (storeName === 'screenings') {
        queryClient.invalidateQueries({ queryKey: [`/api/children/${data.childId}`] });
      }
      
    } else if (operation === 'delete') {
      let url = '';
      
      switch (storeName) {
        case 'users':
          url = `/api/users/${data.id}`;
          break;
        case 'children':
          url = `/api/children/${data.id}`;
          break;
        case 'screenings':
          url = `/api/screenings/${data.id}`;
          break;
        default:
          throw new Error(`Unknown store name: ${storeName}`);
      }
      
      await apiRequest('DELETE', url);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [`/api/${storeName}`] });
      if (storeName === 'screenings') {
        queryClient.invalidateQueries({ queryKey: [`/api/children/${data.childId}`] });
      }
    }
  }
  
  // Initial data load (called when app starts)
  async initialDataLoad() {
    if (!navigator.onLine) return;
    
    try {
      await this.pullFromServer();
    } catch (error) {
      console.error('Initial data load failed:', error);
    }
  }
  
  // OFFLINE DATA OPERATIONS
  // These methods handle creating, updating and retrieving data while offline
  
  // Create or update a child whether online or offline
  async saveChild(childData: any) {
    const isOffline = this.isOffline();
    
    try {
      // Generate a temporary ID if this is a new child and we're offline
      const isNew = !childData.id;
      if (isNew && isOffline) {
        childData.id = this.generateTempId('child');
        childData.childId = `TEMP-${Date.now().toString(36)}`;
        childData.isOfflineCreated = true;
      }
      
      // Save to local storage
      const savedChild = await indexedDBService.put('children', childData);
      
      // Add to sync queue if offline
      if (isOffline) {
        const operation: SyncOperation = isNew ? 'create' : 'update';
        await indexedDBService.addToSyncQueue('children', operation, childData);
      } else if (!isNew) {
        // If online and updating existing, also update server directly
        await apiRequest('PUT', `/api/children/${childData.id}`, childData);
      } else {
        // If online and creating new, send to server
        const result = await apiRequest('POST', '/api/children', childData);
        if (result && result.id) {
          // Update with server-assigned ID
          await indexedDBService.put('children', result);
          return result;
        }
      }
      
      // Invalidate queries to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/children'] });
      return savedChild;
    } catch (error) {
      console.error('Error saving child:', error);
      throw error;
    }
  }
  
  // Create or update a screening whether online or offline
  async saveScreening(screeningData: any) {
    const isOffline = this.isOffline();
    
    try {
      // Generate a temporary ID if this is a new screening and we're offline
      const isNew = !screeningData.id;
      if (isNew && isOffline) {
        screeningData.id = this.generateTempId('screening');
        screeningData.isOfflineCreated = true;
      }
      
      // Save to local storage
      const savedScreening = await indexedDBService.put('screenings', screeningData);
      
      // Add to sync queue if offline
      if (isOffline) {
        const operation: SyncOperation = isNew ? 'create' : 'update';
        await indexedDBService.addToSyncQueue('screenings', operation, screeningData);
      } else if (!isNew) {
        // If online and updating existing, also update server directly
        await apiRequest('PUT', `/api/screenings/${screeningData.id}`, screeningData);
      } else {
        // If online and creating new, send to server
        const result = await apiRequest('POST', '/api/screenings', screeningData);
        if (result && result.id) {
          // Update with server-assigned ID
          await indexedDBService.put('screenings', result);
          return result;
        }
      }
      
      // Invalidate queries to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/screenings'] });
      queryClient.invalidateQueries({ queryKey: [`/api/children/${screeningData.childId}`] });
      return savedScreening;
    } catch (error) {
      console.error('Error saving screening:', error);
      throw error;
    }
  }
  
  // Get children with offline support
  async getChildren(filters?: { district?: string, healthFacility?: string, registeredBy?: number }) {
    try {
      // Try server if online
      if (!this.isOffline()) {
        try {
          // Build query params
          const queryParams = new URLSearchParams();
          if (filters?.district) queryParams.append('district', filters.district);
          if (filters?.healthFacility) queryParams.append('healthFacility', filters.healthFacility);
          if (filters?.registeredBy) queryParams.append('registeredBy', filters.registeredBy.toString());
          
          const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
          const children = await this.fetchData(`/api/children${queryString}`);
          
          if (children) {
            // Update local cache
            await indexedDBService.saveAllChildren(children);
            return children;
          }
        } catch (error) {
          console.warn('Failed to fetch children from server, falling back to local data');
        }
      }
      
      // Fall back to local data
      return await indexedDBService.getChildren(filters);
    } catch (error) {
      console.error('Error getting children:', error);
      throw error;
    }
  }
  
  // Get a single child with offline support
  async getChild(id: number | string) {
    try {
      // Try server if online
      if (!this.isOffline()) {
        try {
          const response = await fetch(`/api/children/${id}`);
          if (response.ok) {
            const child = await response.json();
            // Update local cache
            await indexedDBService.put('children', child);
            return child;
          }
        } catch (error) {
          console.warn(`Failed to fetch child ${id} from server, falling back to local data`);
        }
      }
      
      // Fall back to local data
      return await indexedDBService.getChild(id);
    } catch (error) {
      console.error(`Error getting child ${id}:`, error);
      throw error;
    }
  }
  
  // Get screenings with offline support
  async getScreenings(childId?: number) {
    try {
      // Try server if online
      if (!this.isOffline()) {
        try {
          const url = childId ? `/api/screenings?childId=${childId}` : '/api/screenings';
          const screenings = await this.fetchData(url);
          
          if (screenings) {
            // Update local cache
            await indexedDBService.saveAllScreenings(screenings);
            return screenings;
          }
        } catch (error) {
          console.warn('Failed to fetch screenings from server, falling back to local data');
        }
      }
      
      // Fall back to local data
      return childId 
        ? await indexedDBService.getScreeningsByChild(childId)
        : await indexedDBService.getAll('screenings');
    } catch (error) {
      console.error('Error getting screenings:', error);
      throw error;
    }
  }
  
  // Get a single screening with offline support
  async getScreening(id: number | string) {
    try {
      // Try server if online
      if (!this.isOffline()) {
        try {
          const response = await fetch(`/api/screenings/${id}`);
          if (response.ok) {
            const screening = await response.json();
            // Update local cache
            await indexedDBService.put('screenings', screening);
            return screening;
          }
        } catch (error) {
          console.warn(`Failed to fetch screening ${id} from server, falling back to local data`);
        }
      }
      
      // Fall back to local data
      return await indexedDBService.getScreening(id);
    } catch (error) {
      console.error(`Error getting screening ${id}:`, error);
      throw error;
    }
  }
  
  // Helper method to generate temporary IDs for offline created items
  private generateTempId(type: string): number {
    // Create a negative ID to ensure it doesn't conflict with server IDs
    return -Math.floor(Math.random() * 100000) - 1;
  }
  
  // Manually trigger a sync
  async manualSync() {
    if (this.isOffline()) {
      console.warn('Cannot sync while offline');
      return { success: false, message: 'Cannot sync while offline' };
    }
    
    try {
      await this.syncAll();
      return { success: true };
    } catch (error) {
      console.error('Manual sync failed:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const syncService = new SyncService();