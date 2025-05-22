// IndexedDB service for offline data storage
import { SyncOperation, StoreName, SyncQueueItem } from './syncService';

// Define database structure
interface DBSchema {
  version: number;
  stores: {
    [key: string]: {
      keyPath: string;
      indexes?: { name: string; keyPath: string; options?: IDBIndexParameters }[];
    };
  };
}

// Interface for searching children
export interface ChildFilters {
  district?: string;
  healthFacility?: string;
  registeredBy?: number;
  name?: string;       // For searching by name
  ageGroup?: string;   // For filtering by age group
  childId?: string;    // For searching by ID
}

// Interface for searching screenings
export interface ScreeningFilters {
  childId?: number;
  screenedBy?: number;
  date?: string;       // For filtering by date
  result?: string;     // For filtering by result (normal, moderate, severe)
  type?: string;       // For filtering by screening type
}

const DB_NAME = 'idec_offline_db';
const DB_SCHEMA: DBSchema = {
  version: 1,  // Keep version at 1 for now to avoid migration issues
  stores: {
    children: {
      keyPath: 'id',
      indexes: [
        { name: 'childId', keyPath: 'childId' },
        { name: 'district', keyPath: 'district' },
        { name: 'healthFacility', keyPath: 'healthFacility' },
        { name: 'registeredBy', keyPath: 'registeredBy' }
      ]
    },
    screenings: {
      keyPath: 'id',
      indexes: [
        { name: 'childId', keyPath: 'childId' },
        { name: 'screenedBy', keyPath: 'screenedBy' },
        { name: 'date', keyPath: 'date' },            // Added for date filtering
        { name: 'result', keyPath: 'result' },         // Added for result filtering
        { name: 'isOfflineCreated', keyPath: 'isOfflineCreated' }  // To identify offline-created records
      ]
    },
    users: {
      keyPath: 'id',
      indexes: [
        { name: 'username', keyPath: 'username' },
        { name: 'role', keyPath: 'role' },
        { name: 'district', keyPath: 'district' }
      ]
    },
    sync_queue: {
      keyPath: 'id',
      indexes: [
        { name: 'operation', keyPath: 'operation' },
        { name: 'storeName', keyPath: 'storeName' },
        { name: 'timestamp', keyPath: 'timestamp' },
        { name: 'error', keyPath: 'error' },
        { name: 'retryCount', keyPath: 'retryCount' }
      ]
    },
    sync_meta: {
      keyPath: 'id'
    }
  }
};

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private dbReady: Promise<IDBDatabase> | null = null;
  
  constructor() {
    this.dbReady = null;
  }
  
  // Initialize the database
  async initDatabase(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    
    if (this.dbReady) return this.dbReady;
    
    this.dbReady = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_SCHEMA.version);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores based on schema
        for (const [storeName, storeConfig] of Object.entries(DB_SCHEMA.stores)) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: storeConfig.keyPath });
            
            // Add indexes if defined
            if (storeConfig.indexes) {
              for (const index of storeConfig.indexes) {
                store.createIndex(index.name, index.keyPath, index.options);
              }
            }
          }
        }
      };
      
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };
      
      request.onerror = (event) => {
        console.error('Error initializing IndexedDB:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
    
    return this.dbReady;
  }
  
  // Generic methods for data access
  
  async getAll(storeName: string): Promise<any[]> {
    const db = await this.initDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
  
  async get(storeName: string, id: number | string): Promise<any> {
    const db = await this.initDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async put(storeName: string, data: any): Promise<any> {
    const db = await this.initDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      
      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }
  
  async delete(storeName: string, id: number | string): Promise<void> {
    const db = await this.initDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async getAllByIndex(storeName: string, indexName: string, value: any): Promise<any[]> {
    const db = await this.initDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
  
  // Advanced search methods
  
  // Search with multiple criteria and text search
  async searchChildren(filters?: ChildFilters): Promise<any[]> {
    const allChildren = await this.getAll('children');
    
    if (!filters) return allChildren;
    
    return allChildren.filter(child => {
      // Match exact fields if specified
      if (filters.district && child.district !== filters.district) return false;
      if (filters.healthFacility && child.healthFacility !== filters.healthFacility) return false;
      if (filters.registeredBy && child.registeredBy !== filters.registeredBy) return false;
      if (filters.childId && child.childId !== filters.childId) return false;
      
      // Match name with partial text search
      if (filters.name && child.fullName) {
        const searchTerm = filters.name.toLowerCase();
        const fullName = child.fullName.toLowerCase();
        if (!fullName.includes(searchTerm)) return false;
      }
      
      // Match age group if specified
      if (filters.ageGroup && child.dateOfBirth) {
        const birthDate = new Date(child.dateOfBirth);
        const ageInMonths = this.calculateAgeInMonths(birthDate);
        
        switch (filters.ageGroup) {
          case '0-6weeks':
            if (ageInMonths > 1.5) return false; // 1.5 months = 6 weeks
            break;
          case '6weeks-6months':
            if (ageInMonths < 1.5 || ageInMonths > 6) return false;
            break;
          case '6-12months':
            if (ageInMonths < 6 || ageInMonths > 12) return false;
            break;
          case '1-3years':
            if (ageInMonths < 12 || ageInMonths > 36) return false;
            break;
          case '3-5years':
            if (ageInMonths < 36 || ageInMonths > 60) return false;
            break;
        }
      }
      
      return true;
    });
  }
  
  // Helper to calculate age in months from birth date
  private calculateAgeInMonths(birthDate: Date): number {
    const now = new Date();
    const ageInMs = now.getTime() - birthDate.getTime();
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
    return ageInDays / 30.44; // Average days per month
  }
  
  // Search screenings with multiple criteria
  async searchScreenings(filters?: ScreeningFilters): Promise<any[]> {
    const allScreenings = await this.getAll('screenings');
    
    if (!filters) return allScreenings;
    
    return allScreenings.filter(screening => {
      // Match exact fields if specified
      if (filters.childId !== undefined && screening.childId !== filters.childId) return false;
      if (filters.screenedBy !== undefined && screening.screenedBy !== filters.screenedBy) return false;
      if (filters.result && screening.result !== filters.result) return false;
      if (filters.type && screening.type !== filters.type) return false;
      
      // Match date with exact or range
      if (filters.date && screening.date) {
        const screeningDate = new Date(screening.date);
        const filterDate = new Date(filters.date);
        
        // Compare year, month, and day
        if (
          screeningDate.getFullYear() !== filterDate.getFullYear() ||
          screeningDate.getMonth() !== filterDate.getMonth() ||
          screeningDate.getDate() !== filterDate.getDate()
        ) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  // Specific methods for each data type
  
  // Children
  async saveChild(child: any): Promise<any> {
    return this.put('children', child);
  }
  
  async getChild(id: number | string): Promise<any> {
    return this.get('children', id);
  }
  
  async getChildren(filters?: ChildFilters): Promise<any[]> {
    return this.searchChildren(filters);
  }
  
  async getChildByChildId(childId: string): Promise<any> {
    const matches = await this.getAllByIndex('children', 'childId', childId);
    return matches.length > 0 ? matches[0] : null;
  }
  
  async countChildren(filters?: ChildFilters): Promise<number> {
    const children = await this.getChildren(filters);
    return children.length;
  }
  
  // Screenings
  async saveScreening(screening: any): Promise<any> {
    return this.put('screenings', screening);
  }
  
  async getScreening(id: number | string): Promise<any> {
    return this.get('screenings', id);
  }
  
  async getScreeningsByChild(childId: number | string): Promise<any[]> {
    return this.getAllByIndex('screenings', 'childId', childId);
  }
  
  async getScreeningsByUser(userId: number | string): Promise<any[]> {
    return this.getAllByIndex('screenings', 'screenedBy', userId);
  }
  
  async countScreenings(filters?: ScreeningFilters): Promise<number> {
    if (!filters) {
      const screenings = await this.getAll('screenings');
      return screenings.length;
    }
    
    const screenings = await this.searchScreenings(filters);
    return screenings.length;
  }
  
  // Users
  async saveUser(user: any): Promise<any> {
    return this.put('users', user);
  }
  
  async getUser(id: number | string): Promise<any> {
    return this.get('users', id);
  }
  
  async getUserByUsername(username: string): Promise<any> {
    const matches = await this.getAllByIndex('users', 'username', username);
    return matches.length > 0 ? matches[0] : null;
  }
  
  async getUsers(): Promise<any[]> {
    return this.getAll('users');
  }
  
  async getUsersByRole(role: string): Promise<any[]> {
    return this.getAllByIndex('users', 'role', role);
  }
  
  async getUsersByDistrict(district: string): Promise<any[]> {
    return this.getAllByIndex('users', 'district', district);
  }
  
  // Sync queue
  async addToSyncQueue(storeName: StoreName, operation: SyncOperation, data: any): Promise<void> {
    const syncItem: SyncQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      storeName,
      operation,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };
    
    await this.put('sync_queue', syncItem);
    return this.updateSyncMeta();
  }
  
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    return this.getAll('sync_queue');
  }
  
  async removeSyncQueueItem(id: string): Promise<void> {
    await this.delete('sync_queue', id);
    return this.updateSyncMeta();
  }
  
  async clearSyncQueue(): Promise<void> {
    const items = await this.getSyncQueue();
    for (const item of items) {
      await this.delete('sync_queue', item.id);
    }
    return this.updateSyncMeta();
  }
  
  async getFailedSyncItems(): Promise<SyncQueueItem[]> {
    const db = await this.initDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readonly');
      const store = transaction.objectStore('sync_queue');
      const index = store.index('error');
      const request = index.getAll(IDBKeyRange.bound(' ', 'z', false, false)); // Any non-null error
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
  
  // Sync metadata
  async getSyncMeta(): Promise<any> {
    const meta = await this.get('sync_meta', 'sync_info');
    return meta || {
      id: 'sync_info',
      lastSynced: null,
      pendingChanges: 0
    };
  }
  
  async updateSyncMeta(lastSynced: Date | null = null): Promise<void> {
    const queueItems = await this.getSyncQueue();
    const metaData = {
      id: 'sync_info',
      lastSynced: lastSynced ? lastSynced.toISOString() : (await this.getSyncMeta()).lastSynced,
      pendingChanges: queueItems.length
    };
    
    await this.put('sync_meta', metaData);
  }
  
  async updateLastSynced(): Promise<void> {
    await this.updateSyncMeta(new Date());
  }
  
  // Bulk operations for initial sync
  async saveAllChildren(children: any[]): Promise<void> {
    console.log(`Syncing ${children.length} children to IndexedDB`);
    const db = await this.initDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('children', 'readwrite');
      const store = transaction.objectStore('children');
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      
      for (const child of children) {
        store.put(child);
      }
    });
  }
  
  async saveAllScreenings(screenings: any[]): Promise<void> {
    console.log(`Syncing ${screenings.length} screenings to IndexedDB`);
    const db = await this.initDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('screenings', 'readwrite');
      const store = transaction.objectStore('screenings');
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      
      for (const screening of screenings) {
        store.put(screening);
      }
    });
  }
  
  async saveAllUsers(users: any[]): Promise<void> {
    console.log(`Syncing ${users.length} users to IndexedDB`);
    const db = await this.initDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('users', 'readwrite');
      const store = transaction.objectStore('users');
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      
      for (const user of users) {
        store.put(user);
      }
    });
  }
  
  // Statistics and reporting
  async getStats() {
    // Count children by district
    const children = await this.getAll('children');
    const screenings = await this.getAll('screenings');
    
    // Get districts
    const districts = [...new Set(children.map(child => child.district))].filter(Boolean);
    
    // Count children by district
    const childrenByDistrict = districts.map(district => {
      const count = children.filter(child => child.district === district).length;
      return { district, count };
    });
    
    // Count screenings by result
    const resultCounts = {
      normal: screenings.filter(s => s.result === 'normal').length,
      moderate: screenings.filter(s => s.result === 'moderate').length,
      severe: screenings.filter(s => s.result === 'severe').length
    };
    
    // Calculate referrals (any screening with moderate or severe result)
    const referrals = screenings.filter(s => s.result === 'moderate' || s.result === 'severe').length;
    
    // Pending sync items
    const syncQueue = await this.getSyncQueue();
    const pendingChildren = syncQueue.filter(item => item.storeName === 'children').length;
    const pendingScreenings = syncQueue.filter(item => item.storeName === 'screenings').length;
    
    return {
      totalChildren: children.length,
      totalScreenings: screenings.length,
      totalReferrals: referrals,
      childrenByDistrict,
      screeningResults: resultCounts,
      pendingSync: {
        children: pendingChildren,
        screenings: pendingScreenings
      }
    };
  }
}

export const indexedDBService = new IndexedDBService();