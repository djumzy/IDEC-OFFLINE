import { offlineDebug } from './offline-debug';
import { compression } from './compression';
import { offlineStorage } from './offline-storage';

interface BackupMetadata {
  timestamp: number;
  version: string;
  dataTypes: string[];
  checksum: string;
  size: number;
}

class BackupService {
  private static instance: BackupService;
  private backupInterval: number = 24 * 60 * 60 * 1000; // 24 hours
  private maxBackups: number = 7; // Keep last 7 backups

  private constructor() {
    this.initializeBackupSchedule();
  }

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  private async initializeBackupSchedule() {
    // Schedule automatic backups
    setInterval(() => this.createBackup(), this.backupInterval);
  }

  private async calculateChecksum(data: any): Promise<string> {
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async createBackup(): Promise<BackupMetadata> {
    try {
      offlineDebug.logInfo('Starting backup creation', 'backup');

      // Get all data from IndexedDB
      const data = {
        children: await offlineStorage.getAllChildren(),
        screenings: await offlineStorage.getAllScreenings(),
        tiers: await offlineStorage.getAllTiers(),
        referrals: await offlineStorage.getAllReferrals(),
        user: await offlineStorage.getCurrentUser(),
        pendingOperations: await offlineStorage.getPendingOperations()
      };

      // Compress the data
      const compressedData = await compression.compress(data);

      // Create backup metadata
      const metadata: BackupMetadata = {
        timestamp: Date.now(),
        version: '1.0.0',
        dataTypes: Object.keys(data),
        checksum: await this.calculateChecksum(data),
        size: compressedData.length
      };

      // Save backup to IndexedDB
      await offlineStorage.saveBackup(metadata, compressedData);

      // Clean up old backups
      await this.cleanupOldBackups();

      offlineDebug.logInfo(
        'Backup created successfully',
        'backup',
        { metadata }
      );

      return metadata;
    } catch (error) {
      offlineDebug.logError(
        'Backup creation failed',
        'backup',
        { error }
      );
      throw error;
    }
  }

  async restoreBackup(backupId: string): Promise<void> {
    try {
      offlineDebug.logInfo('Starting backup restoration', 'backup', { backupId });

      // Get backup data from IndexedDB
      const backup = await offlineStorage.getBackup(backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }

      // Decompress the data
      const decompressedData = await compression.decompress(backup.data);

      // Verify checksum
      const checksum = await this.calculateChecksum(decompressedData);
      if (checksum !== backup.metadata.checksum) {
        throw new Error('Backup checksum verification failed');
      }

      // Clear existing data
      await offlineStorage.clearAll();

      // Restore data
      await offlineStorage.bulkAddChildren(decompressedData.children);
      await offlineStorage.bulkAddScreenings(decompressedData.screenings);
      await offlineStorage.bulkAddTiers(decompressedData.tiers);
      await offlineStorage.bulkAddReferrals(decompressedData.referrals);
      if (decompressedData.user) {
        await offlineStorage.setCurrentUser(decompressedData.user);
      }
      await offlineStorage.bulkAddPendingOperations(decompressedData.pendingOperations);

      offlineDebug.logInfo(
        'Backup restored successfully',
        'backup',
        { backupId, metadata: backup.metadata }
      );
    } catch (error) {
      offlineDebug.logError(
        'Backup restoration failed',
        'backup',
        { error, backupId }
      );
      throw error;
    }
  }

  async listBackups(): Promise<BackupMetadata[]> {
    try {
      const backups = await offlineStorage.getAllBackups();
      return backups.map(backup => backup.metadata);
    } catch (error) {
      offlineDebug.logError(
        'Failed to list backups',
        'backup',
        { error }
      );
      throw error;
    }
  }

  async deleteBackup(backupId: string): Promise<void> {
    try {
      await offlineStorage.deleteBackup(backupId);
      offlineDebug.logInfo(
        'Backup deleted successfully',
        'backup',
        { backupId }
      );
    } catch (error) {
      offlineDebug.logError(
        'Failed to delete backup',
        'backup',
        { error, backupId }
      );
      throw error;
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();
      if (backups.length <= this.maxBackups) return;

      // Sort backups by timestamp (newest first)
      backups.sort((a, b) => b.timestamp - a.timestamp);

      // Delete old backups
      const backupsToDelete = backups.slice(this.maxBackups);
      for (const backup of backupsToDelete) {
        await this.deleteBackup(backup.timestamp.toString());
      }

      offlineDebug.logInfo(
        'Old backups cleaned up',
        'backup',
        { deletedCount: backupsToDelete.length }
      );
    } catch (error) {
      offlineDebug.logError(
        'Failed to cleanup old backups',
        'backup',
        { error }
      );
      throw error;
    }
  }

  async exportBackup(backupId: string): Promise<Blob> {
    try {
      const backup = await offlineStorage.getBackup(backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }

      const exportData = {
        metadata: backup.metadata,
        data: backup.data
      };

      const blob = new Blob([JSON.stringify(exportData)], {
        type: 'application/json'
      });

      offlineDebug.logInfo(
        'Backup exported successfully',
        'backup',
        { backupId }
      );

      return blob;
    } catch (error) {
      offlineDebug.logError(
        'Failed to export backup',
        'backup',
        { error, backupId }
      );
      throw error;
    }
  }

  async importBackup(file: File): Promise<BackupMetadata> {
    try {
      const content = await file.text();
      const { metadata, data } = JSON.parse(content);

      // Verify metadata
      if (!metadata || !data || !metadata.checksum) {
        throw new Error('Invalid backup file format');
      }

      // Save imported backup
      await offlineStorage.saveBackup(metadata, new Uint8Array(data));

      offlineDebug.logInfo(
        'Backup imported successfully',
        'backup',
        { metadata }
      );

      return metadata;
    } catch (error) {
      offlineDebug.logError(
        'Failed to import backup',
        'backup',
        { error, fileName: file.name }
      );
      throw error;
    }
  }
}

export const backup = BackupService.getInstance(); 