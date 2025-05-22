import { Child, Screening, Tier, Referral, User } from '../types';
import { errorHandler } from './error-handler';

interface FileStorageConfig {
  baseDir: string;
  encryptionKey?: string;
}

class FileStorageService {
  private static instance: FileStorageService;
  private config: FileStorageConfig;
  private isAndroid: boolean;

  private constructor() {
    this.isAndroid = this.detectAndroid();
    this.config = {
      baseDir: this.isAndroid ? 'IDEC' : 'idec_data',
      encryptionKey: process.env.REACT_APP_ENCRYPTION_KEY
    };
  }

  static getInstance(): FileStorageService {
    if (!FileStorageService.instance) {
      FileStorageService.instance = new FileStorageService();
    }
    return FileStorageService.instance;
  }

  private detectAndroid(): boolean {
    return /Android/i.test(navigator.userAgent);
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      if (this.isAndroid) {
        // For Android, we'll use the app's internal storage
        const dirHandle = await window.showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'documents'
        });
        return;
      }

      // For web browsers, we'll use IndexedDB to simulate file system
      const db = await this.getFileSystemDB();
      await db.put('metadata', { initialized: true }, 'system');
    } catch (error) {
      console.error('Error ensuring directory exists:', error);
      throw error;
    }
  }

  private async getFileSystemDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('IDEC_FileSystem', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files');
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata');
        }
      };
    });
  }

  private async encryptData(data: any): Promise<string> {
    if (!this.config.encryptionKey) return JSON.stringify(data);

    // Simple encryption for demonstration
    // In production, use a proper encryption library
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    const keyBuffer = encoder.encode(this.config.encryptionKey);
    
    // XOR encryption (for demonstration only)
    const encryptedBuffer = dataBuffer.map((byte, i) => 
      byte ^ keyBuffer[i % keyBuffer.length]
    );
    
    return btoa(String.fromCharCode(...encryptedBuffer));
  }

  private async decryptData(encryptedData: string): Promise<any> {
    if (!this.config.encryptionKey) return JSON.parse(encryptedData);

    // Simple decryption for demonstration
    const decoder = new TextDecoder();
    const encryptedBuffer = new Uint8Array(
      atob(encryptedData).split('').map(c => c.charCodeAt(0))
    );
    const keyBuffer = encoder.encode(this.config.encryptionKey);
    
    // XOR decryption (for demonstration only)
    const decryptedBuffer = encryptedBuffer.map((byte, i) => 
      byte ^ keyBuffer[i % keyBuffer.length]
    );
    
    return JSON.parse(decoder.decode(decryptedBuffer));
  }

  async saveData<T>(entity: string, data: T): Promise<void> {
    try {
      await this.ensureDirectoryExists();
      const encryptedData = await this.encryptData(data);
      
      if (this.isAndroid) {
        // For Android, save to actual file system
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: `${entity}_${Date.now()}.idec`,
          types: [{
            description: 'IDEC Data File',
            accept: { 'application/idec': ['.idec'] }
          }]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(encryptedData);
        await writable.close();
      } else {
        // For web, save to IndexedDB
        const db = await this.getFileSystemDB();
        await db.put('files', encryptedData, `${entity}_${Date.now()}`);
      }
    } catch (error) {
      console.error(`Error saving ${entity} data:`, error);
      throw error;
    }
  }

  async loadData<T>(entity: string, id?: string): Promise<T | null> {
    try {
      if (this.isAndroid) {
        // For Android, read from file system
        const fileHandle = await window.showOpenFilePicker({
          types: [{
            description: 'IDEC Data File',
            accept: { 'application/idec': ['.idec'] }
          }]
        });
        const file = await fileHandle[0].getFile();
        const encryptedData = await file.text();
        return await this.decryptData(encryptedData);
      } else {
        // For web, read from IndexedDB
        const db = await this.getFileSystemDB();
        const encryptedData = await db.get('files', id || entity);
        if (!encryptedData) return null;
        return await this.decryptData(encryptedData);
      }
    } catch (error) {
      console.error(`Error loading ${entity} data:`, error);
      return null;
    }
  }

  async saveChildren(children: Child[]): Promise<void> {
    await this.saveData('children', children);
  }

  async loadChildren(): Promise<Child[]> {
    return await this.loadData<Child[]>('children') || [];
  }

  async saveScreenings(screenings: Screening[]): Promise<void> {
    await this.saveData('screenings', screenings);
  }

  async loadScreenings(): Promise<Screening[]> {
    return await this.loadData<Screening[]>('screenings') || [];
  }

  async saveTiers(tiers: Tier[]): Promise<void> {
    await this.saveData('tiers', tiers);
  }

  async loadTiers(): Promise<Tier[]> {
    return await this.loadData<Tier[]>('tiers') || [];
  }

  async saveReferrals(referrals: Referral[]): Promise<void> {
    await this.saveData('referrals', referrals);
  }

  async loadReferrals(): Promise<Referral[]> {
    return await this.loadData<Referral[]>('referrals') || [];
  }

  async saveUser(user: User): Promise<void> {
    await this.saveData('user', user);
  }

  async loadUser(): Promise<User | null> {
    return await this.loadData<User>('user');
  }

  async clearAllData(): Promise<void> {
    try {
      if (this.isAndroid) {
        // For Android, we would need to implement file deletion
        // This would require additional permissions and implementation
        console.warn('File deletion not implemented for Android');
      } else {
        // For web, clear IndexedDB
        const db = await this.getFileSystemDB();
        const tx = db.transaction(['files', 'metadata'], 'readwrite');
        await tx.objectStore('files').clear();
        await tx.objectStore('metadata').clear();
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }
}

export const fileStorage = FileStorageService.getInstance(); 