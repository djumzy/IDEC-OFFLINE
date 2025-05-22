import { offlineStorage } from './offline-storage';

class DataService {
  private static instance: DataService;
  private currentUser: any = null;

  private constructor() {}

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  async setCurrentUser(user: any) {
    this.currentUser = user;
    await offlineStorage.setCurrentUser(user);
  }

  async getCurrentUser() {
    if (!this.currentUser) {
      this.currentUser = await offlineStorage.getCurrentUser();
    }
    return this.currentUser;
  }

  // Generic data operation helper
  private async performOperation<T>(
    entity: 'children' | 'screenings' | 'tiers' | 'referrals',
    operation: 'create' | 'update' | 'delete' | 'get',
    data?: any,
    id?: number
  ): Promise<T> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    try {
      if (navigator.onLine) {
        // If online, try server operation first
        const endpoint = `/${entity}${id ? `/${id}` : ''}`;
        const method = operation === 'create' ? 'POST' : 
                      operation === 'update' ? 'PUT' : 
                      operation === 'delete' ? 'DELETE' : 'GET';

        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: method !== 'GET' ? JSON.stringify(data) : undefined
        });

        if (!response.ok) throw new Error(`Failed to ${operation} ${entity}`);

        const result = await response.json();

        // Also update local storage
        if (operation === 'create' || operation === 'update') {
          await offlineStorage[`save${entity.charAt(0).toUpperCase() + entity.slice(1)}`](result);
        } else if (operation === 'delete') {
          await offlineStorage[`delete${entity.charAt(0).toUpperCase() + entity.slice(1)}`](id);
        }

        return result;
      } else {
        // If offline, perform local operation and queue for sync
        let result;
        if (operation === 'create' || operation === 'update') {
          result = await offlineStorage[`save${entity.charAt(0).toUpperCase() + entity.slice(1)}`]({
            ...data,
            [entity === 'children' ? 'registeredBy' :
             entity === 'screenings' ? 'screenedBy' :
             entity === 'referrals' ? 'referredBy' : 'createdBy']: user.id
          });
        } else if (operation === 'delete') {
          await offlineStorage[`delete${entity.charAt(0).toUpperCase() + entity.slice(1)}`](id);
          result = true;
        } else {
          result = await offlineStorage[`get${entity.charAt(0).toUpperCase() + entity.slice(1)}`](id);
        }

        // Queue the operation for sync
        if (operation !== 'get') {
          await offlineStorage.addPendingOperation({
            type: operation,
            entity,
            data: operation === 'delete' ? { id } : data
          });
        }

        return result;
      }
    } catch (error) {
      console.error(`Error performing ${operation} on ${entity}:`, error);
      throw error;
    }
  }

  // Children operations
  async addChild(childData: any) {
    return this.performOperation('children', 'create', childData);
  }

  async updateChild(id: number, childData: any) {
    return this.performOperation('children', 'update', childData, id);
  }

  async deleteChild(id: number) {
    return this.performOperation('children', 'delete', undefined, id);
  }

  async getChild(id: number) {
    return this.performOperation('children', 'get', undefined, id);
  }

  async getChildren() {
    try {
      if (navigator.onLine) {
        const response = await fetch('/children');
        if (!response.ok) throw new Error('Failed to fetch children');
        
        const children = await response.json();
        // Update local storage
        for (const child of children) {
          await offlineStorage.saveChild(child);
        }
        return children;
      } else {
        return await offlineStorage.getAllChildren();
      }
    } catch (error) {
      console.error('Error getting children:', error);
      return await offlineStorage.getAllChildren();
    }
  }

  // Screenings operations
  async addScreening(screeningData: any) {
    return this.performOperation('screenings', 'create', screeningData);
  }

  async updateScreening(id: number, screeningData: any) {
    return this.performOperation('screenings', 'update', screeningData, id);
  }

  async deleteScreening(id: number) {
    return this.performOperation('screenings', 'delete', undefined, id);
  }

  async getScreening(id: number) {
    return this.performOperation('screenings', 'get', undefined, id);
  }

  async getScreeningsByChildId(childId: number) {
    try {
      if (navigator.onLine) {
        const response = await fetch(`/screenings?childId=${childId}`);
        if (!response.ok) throw new Error('Failed to fetch screenings');
        
        const screenings = await response.json();
        // Update local storage
        for (const screening of screenings) {
          await offlineStorage.saveScreening(screening);
        }
        return screenings;
      } else {
        return await offlineStorage.getScreeningsByChildId(childId);
      }
    } catch (error) {
      console.error('Error getting screenings:', error);
      return await offlineStorage.getScreeningsByChildId(childId);
    }
  }

  // Tiers operations
  async addTier(tierData: any) {
    return this.performOperation('tiers', 'create', tierData);
  }

  async updateTier(id: number, tierData: any) {
    return this.performOperation('tiers', 'update', tierData, id);
  }

  async deleteTier(id: number) {
    return this.performOperation('tiers', 'delete', undefined, id);
  }

  async getTier(id: number) {
    return this.performOperation('tiers', 'get', undefined, id);
  }

  async getTiers() {
    try {
      if (navigator.onLine) {
        const response = await fetch('/tiers');
        if (!response.ok) throw new Error('Failed to fetch tiers');
        
        const tiers = await response.json();
        // Update local storage
        for (const tier of tiers) {
          await offlineStorage.saveTier(tier);
        }
        return tiers;
      } else {
        return await offlineStorage.getAllTiers();
      }
    } catch (error) {
      console.error('Error getting tiers:', error);
      return await offlineStorage.getAllTiers();
    }
  }

  // Referrals operations
  async addReferral(referralData: any) {
    return this.performOperation('referrals', 'create', referralData);
  }

  async updateReferral(id: number, referralData: any) {
    return this.performOperation('referrals', 'update', referralData, id);
  }

  async deleteReferral(id: number) {
    return this.performOperation('referrals', 'delete', undefined, id);
  }

  async getReferral(id: number) {
    return this.performOperation('referrals', 'get', undefined, id);
  }

  async getReferralsByChildId(childId: number) {
    try {
      if (navigator.onLine) {
        const response = await fetch(`/referrals?childId=${childId}`);
        if (!response.ok) throw new Error('Failed to fetch referrals');
        
        const referrals = await response.json();
        // Update local storage
        for (const referral of referrals) {
          await offlineStorage.saveReferral(referral);
        }
        return referrals;
      } else {
        return await offlineStorage.getReferralsByChildId(childId);
      }
    } catch (error) {
      console.error('Error getting referrals:', error);
      return await offlineStorage.getReferralsByChildId(childId);
    }
  }

  // Sync operations
  async syncPendingOperations() {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }

    const pendingOps = await offlineStorage.getPendingOperations();
    const user = await this.getCurrentUser();

    for (const op of pendingOps) {
      try {
        if (op.userId !== user.id) continue; // Skip operations from other users

        const endpoint = `/${op.entity}${op.type === 'update' || op.type === 'delete' ? `/${op.data.id}` : ''}`;
        const method = op.type === 'create' ? 'POST' : 
                      op.type === 'update' ? 'PUT' : 'DELETE';

        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: method !== 'DELETE' ? JSON.stringify(op.data) : undefined
        });

        if (!response.ok) throw new Error(`Failed to sync ${op.type} operation`);

        await offlineStorage.removePendingOperation(op.id);
      } catch (error) {
        console.error('Error syncing operation:', error);
        await offlineStorage.updateSyncStatus('error', error.message);
        throw error;
      }
    }

    await offlineStorage.updateSyncStatus('success');
  }

  async downloadAllData() {
    if (!navigator.onLine) {
      throw new Error('Cannot download data while offline');
    }

    try {
      // Download all data types
      const [children, screenings, tiers, referrals] = await Promise.all([
        fetch('/children').then(r => r.json()),
        fetch('/screenings').then(r => r.json()),
        fetch('/tiers').then(r => r.json()),
        fetch('/referrals').then(r => r.json())
      ]);

      // Save all data to IndexedDB
      await Promise.all([
        ...children.map(child => offlineStorage.saveChild(child)),
        ...screenings.map(screening => offlineStorage.saveScreening(screening)),
        ...tiers.map(tier => offlineStorage.saveTier(tier)),
        ...referrals.map(referral => offlineStorage.saveReferral(referral))
      ]);

      await offlineStorage.updateSyncStatus('success');
    } catch (error) {
      console.error('Error downloading data:', error);
      await offlineStorage.updateSyncStatus('error', error.message);
      throw error;
    }
  }
}

export const dataService = DataService.getInstance(); 