import { Child, Screening, Tier, Referral, User } from '../types';
import { fileStorage } from './file-storage';
import { offlineDebug } from './offline-debug';

interface FileMetadata {
  type: 'children' | 'screenings' | 'tiers' | 'referrals' | 'user';
  timestamp: number;
  version: string;
  checksum: string;
}

class FileScannerService {
  private static instance: FileScannerService;
  private isAndroid: boolean;
  private baseDir: string = 'IDEC';
  private filePattern: RegExp = /^(.+)_(\d+)\.idec$/;

  private constructor() {
    this.isAndroid = /Android/i.test(navigator.userAgent);
  }

  static getInstance(): FileScannerService {
    if (!FileScannerService.instance) {
      FileScannerService.instance = new FileScannerService();
    }
    return FileScannerService.instance;
  }

  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async getFileMetadata(file: File): Promise<FileMetadata | null> {
    try {
      const content = await file.text();
      const firstLine = content.split('\n')[0];
      return JSON.parse(firstLine);
    } catch {
      return null;
    }
  }

  private async validateFile(file: File, metadata: FileMetadata): Promise<boolean> {
    try {
      const content = await file.text();
      const dataLines = content.split('\n').slice(1).join('\n');
      const checksum = await this.calculateChecksum(dataLines);
      return checksum === metadata.checksum;
    } catch {
      return false;
    }
  }

  async scanDirectory(): Promise<{
    children: Child[];
    screenings: Screening[];
    tiers: Tier[];
    referrals: Referral[];
    user: User | null;
  }> {
    if (!this.isAndroid) {
      offlineDebug.logInfo('Not running on Android, skipping file scan', 'file-scanner');
      return {
        children: [],
        screenings: [],
        tiers: [],
        referrals: [],
        user: null
      };
    }

    try {
      offlineDebug.logInfo('Starting directory scan', 'file-scanner');
      const dirHandle = await window.showDirectoryPicker({
        mode: 'read',
        startIn: 'documents'
      });

      const results = {
        children: [] as Child[],
        screenings: [] as Screening[],
        tiers: [] as Tier[],
        referrals: [] as Referral[],
        user: null as User | null
      };

      let fileCount = 0;
      let errorCount = 0;

      for await (const entry of dirHandle.values()) {
        if (entry.kind !== 'file') continue;

        const match = entry.name.match(this.filePattern);
        if (!match) {
          offlineDebug.logWarning(`Skipping non-IDEC file: ${entry.name}`, 'file-scanner');
          continue;
        }

        try {
          const [, type, timestamp] = match;
          const file = await entry.getFile();
          const metadata = await this.getFileMetadata(file);

          if (!metadata) {
            offlineDebug.logError(
              `Invalid metadata in file: ${entry.name}`,
              'file-scanner',
              { fileName: entry.name }
            );
            errorCount++;
            continue;
          }

          if (!await this.validateFile(file, metadata)) {
            offlineDebug.logError(
              `File validation failed: ${entry.name}`,
              'file-scanner',
              { fileName: entry.name, metadata }
            );
            errorCount++;
            continue;
          }

          const content = await file.text();
          const data = JSON.parse(content.split('\n').slice(1).join('\n'));

          switch (type) {
            case 'children':
              results.children.push(...data);
              break;
            case 'screenings':
              results.screenings.push(...data);
              break;
            case 'tiers':
              results.tiers.push(...data);
              break;
            case 'referrals':
              results.referrals.push(...data);
              break;
            case 'user':
              results.user = data;
              break;
          }

          fileCount++;
          offlineDebug.logInfo(
            `Successfully processed file: ${entry.name}`,
            'file-scanner',
            { type, timestamp }
          );
        } catch (error) {
          errorCount++;
          offlineDebug.logError(
            `Error processing file: ${entry.name}`,
            'file-scanner',
            { error, fileName: entry.name }
          );
        }
      }

      offlineDebug.logInfo(
        'Directory scan completed',
        'file-scanner',
        { fileCount, errorCount, results }
      );

      return results;
    } catch (error) {
      const offlineError = offlineDebug.handleFileError(error, 'file-scanner');
      offlineDebug.logError(
        'Directory scan failed',
        'file-scanner',
        { error: offlineError }
      );
      throw offlineError;
    }
  }

  async saveFile(type: string, data: any): Promise<void> {
    if (!this.isAndroid) {
      offlineDebug.logInfo('Not running on Android, skipping file save', 'file-scanner');
      return;
    }

    try {
      offlineDebug.logInfo(`Starting file save for type: ${type}`, 'file-scanner');
      
      const metadata: FileMetadata = {
        type: type as FileMetadata['type'],
        timestamp: Date.now(),
        version: '1.0.0',
        checksum: await this.calculateChecksum(JSON.stringify(data))
      };

      const content = JSON.stringify(metadata) + '\n' + JSON.stringify(data);
      const encryptedContent = await fileStorage.encryptData(content);

      const fileHandle = await window.showSaveFilePicker({
        suggestedName: `${type}_${Date.now()}.idec`,
        types: [{
          description: 'IDEC Data File',
          accept: { 'application/idec': ['.idec'] }
        }]
      });

      const writable = await fileHandle.createWritable();
      await writable.write(encryptedContent);
      await writable.close();

      offlineDebug.logInfo(
        `File saved successfully: ${fileHandle.name}`,
        'file-scanner',
        { type, timestamp: metadata.timestamp }
      );
    } catch (error) {
      const offlineError = offlineDebug.handleFileError(error, 'file-scanner');
      offlineDebug.logError(
        `Failed to save file for type: ${type}`,
        'file-scanner',
        { error: offlineError, type }
      );
      throw offlineError;
    }
  }

  async deleteOldFiles(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.isAndroid) {
      offlineDebug.logInfo('Not running on Android, skipping file cleanup', 'file-scanner');
      return;
    }

    try {
      offlineDebug.logInfo('Starting old files cleanup', 'file-scanner', { maxAge });
      
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      const now = Date.now();
      let deletedCount = 0;
      let errorCount = 0;

      for await (const entry of dirHandle.values()) {
        if (entry.kind !== 'file') continue;

        const match = entry.name.match(this.filePattern);
        if (!match) continue;

        try {
          const [, , timestamp] = match;
          const fileAge = now - parseInt(timestamp);

          if (fileAge > maxAge) {
            await dirHandle.removeEntry(entry.name);
            deletedCount++;
            offlineDebug.logInfo(
              `Deleted old file: ${entry.name}`,
              'file-scanner',
              { fileAge, maxAge }
            );
          }
        } catch (error) {
          errorCount++;
          offlineDebug.logError(
            `Failed to delete file: ${entry.name}`,
            'file-scanner',
            { error, fileName: entry.name }
          );
        }
      }

      offlineDebug.logInfo(
        'File cleanup completed',
        'file-scanner',
        { deletedCount, errorCount }
      );
    } catch (error) {
      const offlineError = offlineDebug.handleFileError(error, 'file-scanner');
      offlineDebug.logError(
        'File cleanup failed',
        'file-scanner',
        { error: offlineError }
      );
      throw offlineError;
    }
  }
}

export const fileScanner = FileScannerService.getInstance(); 