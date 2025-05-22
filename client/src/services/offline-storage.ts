import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Child, Screening, Tier, Referral, User, PendingOperation } from '../types';
import { fileStorage } from './file-storage';
import { fileScanner } from './file-scanner';
import { errorHandler } from './error-handler';

interface IDECDB extends DBSchema {
  children: {
    key: number;
    value: Child;
    indexes: { 'by-childId': string };
  };
  screenings: {
    key: number;
    value: Screening;
    indexes: { 'by-childId': number };
  };
  tiers: {
    key: number;
    value: Tier;
  };
  referrals: {
    key: number;
    value: Referral;
    indexes: { 'by-childId': number; 'by-tierId': number };
  };
  pendingOperations: {
    key: number;
    value: PendingOperation;
  };
  currentUser: {
    key: string;
    value: User;
  };
}

class OfflineStorage {
  private static instance: OfflineStorage;
  private db: IDBPDatabase<IDECDB> | null = null;
  private isInitialized = false;
  private isAndroid: boolean;

  private constructor() {
    this.isAndroid = /Android/i.test(navigator.userAgent);
  }

  static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage();
    }
    return OfflineStorage.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = await openDB<IDECDB>('idec-offline', 1, {
        upgrade(db) {
          // Children store
          const childrenStore = db.createObjectStore('children', { keyPath: 'id', autoIncrement: true });
          childrenStore.createIndex('by-childId', 'childId', { unique: true });

          // Screenings store
          const screeningsStore = db.createObjectStore('screenings', { keyPath: 'id', autoIncrement: true });
          screeningsStore.createIndex('by-childId', 'childId');

          // Tiers store
          db.createObjectStore('tiers', { keyPath: 'id', autoIncrement: true });

          // Referrals store
          const referralsStore = db.createObjectStore('referrals', { keyPath: 'id', autoIncrement: true });
          referralsStore.createIndex('by-childId', 'childId');
          referralsStore.createIndex('by-tierId', 'tierId');

          // Pending operations store
          db.createObjectStore('pendingOperations', { keyPath: 'id', autoIncrement: true });

          // Current user store
          db.createObjectStore('currentUser', { keyPath: 'id' });
        },
      });

      // Load data from file storage if available
      if (this.isAndroid) {
        await this.syncFromAndroidFiles();
      } else {
        await this.syncFromFileStorage();
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
      throw error;
    }
  }

  private async syncFromFileStorage(): Promise<void> {
    try {
      // Load all data from file storage
      const [children, screenings, tiers, referrals, user] = await Promise.all([
        fileStorage.loadChildren(),
        fileStorage.loadScreenings(),
        fileStorage.loadTiers(),
        fileStorage.loadReferrals(),
        fileStorage.loadUser()
      ]);

      // Save to IndexedDB
      if (children.length > 0) {
        const tx = this.db!.transaction('children', 'readwrite');
        await Promise.all(children.map(child => tx.store.put(child)));
        await tx.done;
      }

      if (screenings.length > 0) {
        const tx = this.db!.transaction('screenings', 'readwrite');
        await Promise.all(screenings.map(screening => tx.store.put(screening)));
        await tx.done;
      }

      if (tiers.length > 0) {
        const tx = this.db!.transaction('tiers', 'readwrite');
        await Promise.all(tiers.map(tier => tx.store.put(tier)));
        await tx.done;
      }

      if (referrals.length > 0) {
        const tx = this.db!.transaction('referrals', 'readwrite');
        await Promise.all(referrals.map(referral => tx.store.put(referral)));
        await tx.done;
      }

      if (user) {
        const tx = this.db!.transaction('currentUser', 'readwrite');
        await tx.store.put(user);
        await tx.done;
      }
    } catch (error) {
      console.error('Error syncing from file storage:', error);
      throw error;
    }
  }

  private async syncFromAndroidFiles(): Promise<void> {
    try {
      const data = await fileScanner.scanDirectory();
      
      // Save to IndexedDB
      if (data.children.length > 0) {
        const tx = this.db!.transaction('children', 'readwrite');
        await Promise.all(data.children.map(child => tx.store.put(child)));
        await tx.done;
      }

      if (data.screenings.length > 0) {
        const tx = this.db!.transaction('screenings', 'readwrite');
        await Promise.all(data.screenings.map(screening => tx.store.put(screening)));
        await tx.done;
      }

      if (data.tiers.length > 0) {
        const tx = this.db!.transaction('tiers', 'readwrite');
        await Promise.all(data.tiers.map(tier => tx.store.put(tier)));
        await tx.done;
      }

      if (data.referrals.length > 0) {
        const tx = this.db!.transaction('referrals', 'readwrite');
        await Promise.all(data.referrals.map(referral => tx.store.put(referral)));
        await tx.done;
      }

      if (data.user) {
        const tx = this.db!.transaction('currentUser', 'readwrite');
        await tx.store.put(data.user);
        await tx.done;
      }
    } catch (error) {
      console.error('Error syncing from Android files:', error);
      throw error;
    }
  }

  private async syncToFileStorage(): Promise<void> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      // Load all data from IndexedDB
      const [children, screenings, tiers, referrals, user] = await Promise.all([
        this.getAllChildren(),
        this.getAllScreenings(),
        this.getAllTiers(),
        this.getAllReferrals(),
        this.getCurrentUser()
      ]);

      // Save to file storage
      await Promise.all([
        fileStorage.saveChildren(children),
        fileStorage.saveScreenings(screenings),
        fileStorage.saveTiers(tiers),
        fileStorage.saveReferrals(referrals),
        user ? fileStorage.saveUser(user) : Promise.resolve()
      ]);
    } catch (error) {
      console.error('Error syncing to file storage:', error);
      throw error;
    }
  }

  private async syncToAndroidFiles(): Promise<void> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      // Load all data from IndexedDB
      const [children, screenings, tiers, referrals, user] = await Promise.all([
        this.getAllChildren(),
        this.getAllScreenings(),
        this.getAllTiers(),
        this.getAllReferrals(),
        this.getCurrentUser()
      ]);

      // Save to Android files
      await Promise.all([
        fileScanner.saveFile('children', children),
        fileScanner.saveFile('screenings', screenings),
        fileScanner.saveFile('tiers', tiers),
        fileScanner.saveFile('referrals', referrals),
        user ? fileScanner.saveFile('user', user) : Promise.resolve()
      ]);

      // Clean up old files
      await fileScanner.deleteOldFiles();
    } catch (error) {
      console.error('Error syncing to Android files:', error);
      throw error;
    }
  }

  // User operations
  async setCurrentUser(user: any) {
    const db = await this.init();
    await db.put('currentUser', user);
  }

  async getCurrentUser() {
    const db = await this.init();
    return db.get('currentUser');
  }

  // Children operations
  async saveChild(child: any) {
    const db = await this.init();
    return db.put('children', child);
  }

  async getChild(id: number) {
    const db = await this.init();
    return db.get('children', id);
  }

  async getChildByChildId(childId: string) {
    const db = await this.init();
    const index = db.transaction('children').store.index('by-childId');
    return index.get(childId);
  }

  async getChildrenByDistrict(district: string) {
    const db = await this.init();
    const index = db.transaction('children').store.index('by-district');
    return index.getAll(district);
  }

  async getChildrenByHealthFacility(healthFacility: string) {
    const db = await this.init();
    const index = db.transaction('children').store.index('by-healthFacility');
    return index.getAll(healthFacility);
  }

  async getAllChildren() {
    const db = await this.init();
    return db.getAll('children');
  }

  async deleteChild(id: number) {
    const db = await this.init();
    return db.delete('children', id);
  }

  // Screenings operations
  async saveScreening(screening: any) {
    const db = await this.init();
    return db.put('screenings', screening);
  }

  async getScreening(id: number) {
    const db = await this.init();
    return db.get('screenings', id);
  }

  async getScreeningsByChildId(childId: number) {
    const db = await this.init();
    const index = db.transaction('screenings').store.index('by-childId');
    return index.getAll(childId);
  }

  async getScreeningsByDate(date: string) {
    const db = await this.init();
    const index = db.transaction('screenings').store.index('by-date');
    return index.getAll(date);
  }

  async deleteScreening(id: number) {
    const db = await this.init();
    return db.delete('screenings', id);
  }

  // Tiers operations
  async saveTier(tier: any) {
    const db = await this.init();
    return db.put('tiers', tier);
  }

  async getTier(id: number) {
    const db = await this.init();
    return db.get('tiers', id);
  }

  async getTiersByDistrict(district: string) {
    const db = await this.init();
    const index = db.transaction('tiers').store.index('by-district');
    return index.getAll(district);
  }

  async getAllTiers() {
    const db = await this.init();
    return db.getAll('tiers');
  }

  // Referrals operations
  async saveReferral(referral: any) {
    const db = await this.init();
    return db.put('referrals', referral);
  }

  async getReferral(id: number) {
    const db = await this.init();
    return db.get('referrals', id);
  }

  async getReferralsByChildId(childId: number) {
    const db = await this.init();
    const index = db.transaction('referrals').store.index('by-childId');
    return index.getAll(childId);
  }

  async getReferralsByStatus(status: string) {
    const db = await this.init();
    const index = db.transaction('referrals').store.index('by-status');
    return index.getAll(status);
  }

  // Pending operations
  async addPendingOperation(operation: {
    type: 'create' | 'update' | 'delete';
    entity: 'children' | 'screenings' | 'tiers' | 'referrals';
    data: any;
  }) {
    const db = await this.init();
    const user = await this.getCurrentUser();
    return db.add('pendingOperations', {
      ...operation,
      timestamp: Date.now(),
      userId: user?.id
    });
  }

  async getPendingOperations() {
    const db = await this.init();
    return db.getAll('pendingOperations');
  }

  async removePendingOperation(id: number) {
    const db = await this.init();
    return db.delete('pendingOperations', id);
  }

  // Sync status
  async updateSyncStatus(status: 'success' | 'error' | 'pending', error?: string) {
    const db = await this.init();
    await db.put('syncStatus', {
      id: 'lastSync',
      lastSync: Date.now(),
      status,
      error
    });
  }

  async getSyncStatus() {
    const db = await this.init();
    return db.get('syncStatus', 'lastSync');
  }

  // Update sync methods to handle Android files
  async syncWithFileStorage(): Promise<void> {
    if (this.isAndroid) {
      await this.syncToAndroidFiles();
    } else {
      await this.syncToFileStorage();
    }
  }

  async loadFromFileStorage(): Promise<void> {
    if (this.isAndroid) {
      await this.syncFromAndroidFiles();
    } else {
      await this.syncFromFileStorage();
    }
  }

  // Add method to check storage status
  async getStorageStatus(): Promise<{
    isAndroid: boolean;
    hasFiles: boolean;
    lastSync: number | null;
    pendingOperations: number;
  }> {
    try {
      const [lastSync, pendingOps] = await Promise.all([
        this.getSyncStatus(),
        this.getPendingOperations()
      ]);

      let hasFiles = false;
      if (this.isAndroid) {
        const data = await fileScanner.scanDirectory();
        hasFiles = data.children.length > 0 || 
                  data.screenings.length > 0 || 
                  data.tiers.length > 0 || 
                  data.referrals.length > 0;
      }

      return {
        isAndroid: this.isAndroid,
        hasFiles,
        lastSync: lastSync?.lastSync || null,
        pendingOperations: pendingOps.length
      };
    } catch (error) {
      console.error('Error getting storage status:', error);
      throw error;
    }
  }
}

export const offlineStorage = OfflineStorage.getInstance(); 