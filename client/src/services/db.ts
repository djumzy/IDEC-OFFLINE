import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface EdicDB extends DBSchema {
  auth: {
    key: string;
    value: {
      user: {
        id: number;
        username: string;
        full_name: string;
        role: 'admin' | 'vht';
        district?: string;
        health_facility?: string;
      };
      token: string;
      lastSync: number;
    };
  };
  children: {
    key: number;
    value: {
      id: number;
      child_id: string;
      full_name: string;
      date_of_birth: string;
      gender: string;
      district: string;
      health_facility: string;
      caretaker_name: string;
      caretaker_contact?: string;
      address?: string;
      status: string;
      registered_by: number;
      created_at: string;
      sync_status: 'synced' | 'pending' | 'error';
      last_modified: number;
    };
    indexes: { 'by-child-id': string };
  };
  screenings: {
    key: number;
    value: {
      id: number;
      child_id: number;
      date: string;
      weight?: string;
      height?: string;
      muac?: string;
      hearing_screening?: string;
      vision_screening?: string;
      mdat_sf1?: string;
      mdat_lf1?: string;
      mdat_sf2?: string;
      mdat_lf2?: string;
      current_age?: string;
      screening_date?: string;
      oedema: boolean;
      appetite?: string;
      symptoms?: string;
      height_for_age?: 'normal' | 'moderate' | 'severe';
      weight_for_age?: 'normal' | 'moderate' | 'severe';
      weight_for_height?: 'normal' | 'moderate' | 'severe';
      muac_result?: 'normal' | 'moderate' | 'severe';
      referral_required: boolean;
      referral_facility?: string;
      referral_date?: string;
      referral_reason?: string;
      screened_by: number;
      created_at: string;
      sync_status: 'synced' | 'pending' | 'error';
      last_modified: number;
    };
    indexes: { 'by-child-id': number };
  };
}

class DatabaseService {
  private db: IDBPDatabase<EdicDB> | null = null;

  async init() {
    this.db = await openDB<EdicDB>('edic-db', 1, {
      upgrade(db) {
        // Create auth store
        db.createObjectStore('auth');

        // Create children store
        const childrenStore = db.createObjectStore('children', { keyPath: 'id', autoIncrement: true });
        childrenStore.createIndex('by-child-id', 'child_id', { unique: true });

        // Create screenings store
        const screeningsStore = db.createObjectStore('screenings', { keyPath: 'id', autoIncrement: true });
        screeningsStore.createIndex('by-child-id', 'child_id');
      },
    });
  }

  // Auth methods
  async saveAuthData(user: EdicDB['auth']['value']['user'], token: string) {
    if (!this.db) await this.init();
    await this.db!.put('auth', { user, token, lastSync: Date.now() }, 'current');
  }

  async getAuthData() {
    if (!this.db) await this.init();
    return this.db!.get('auth', 'current');
  }

  async clearAuthData() {
    if (!this.db) await this.init();
    await this.db!.delete('auth', 'current');
  }

  // Children methods
  async addChild(child: Omit<EdicDB['children']['value'], 'id' | 'sync_status' | 'last_modified'>) {
    if (!this.db) await this.init();
    return this.db!.add('children', { 
      ...child, 
      sync_status: 'pending',
      last_modified: Date.now()
    });
  }

  async updateChild(id: number, child: Partial<EdicDB['children']['value']>) {
    if (!this.db) await this.init();
    const existing = await this.db!.get('children', id);
    if (existing) {
      await this.db!.put('children', {
        ...existing,
        ...child,
        last_modified: Date.now(),
        sync_status: 'pending'
      });
    }
  }

  async getChild(id: number) {
    if (!this.db) await this.init();
    return this.db!.get('children', id);
  }

  async getAllChildren() {
    if (!this.db) await this.init();
    return this.db!.getAll('children');
  }

  // Screening methods
  async addScreening(screening: Omit<EdicDB['screenings']['value'], 'id' | 'sync_status' | 'last_modified'>) {
    if (!this.db) await this.init();
    return this.db!.add('screenings', { 
      ...screening, 
      sync_status: 'pending',
      last_modified: Date.now()
    });
  }

  async updateScreening(id: number, screening: Partial<EdicDB['screenings']['value']>) {
    if (!this.db) await this.init();
    const existing = await this.db!.get('screenings', id);
    if (existing) {
      await this.db!.put('screenings', {
        ...existing,
        ...screening,
        last_modified: Date.now(),
        sync_status: 'pending'
      });
    }
  }

  async getScreening(id: number) {
    if (!this.db) await this.init();
    return this.db!.get('screenings', id);
  }

  async getChildScreenings(childId: number) {
    if (!this.db) await this.init();
    return this.db!.getAllFromIndex('screenings', 'by-child-id', childId);
  }

  async getAllScreenings() {
    if (!this.db) await this.init();
    return this.db!.getAll('screenings');
  }

  // Sync methods
  async getPendingSync() {
    if (!this.db) await this.init();
    const pendingChildren = await this.db!.getAllFromIndex('children', 'sync_status', 'pending');
    const pendingScreenings = await this.db!.getAllFromIndex('screenings', 'sync_status', 'pending');
    return { children: pendingChildren, screenings: pendingScreenings };
  }

  async updateSyncStatus(store: 'children' | 'screenings', id: number, status: 'synced' | 'error') {
    if (!this.db) await this.init();
    const item = await this.db!.get(store, id);
    if (item) {
      item.sync_status = status;
      await this.db!.put(store, item);
    }
  }
}

export const db = new DatabaseService(); 