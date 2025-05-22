import { Child, Screening, Tier, Referral, User } from '../types';

interface OfflineError extends Error {
  code: string;
  context: string;
  timestamp: number;
  details?: any;
}

interface DebugLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  context: string;
  details?: any;
}

class OfflineDebugService {
  private static instance: OfflineDebugService;
  private logs: DebugLog[] = [];
  private maxLogs: number = 1000;
  private isDebugMode: boolean = false;

  private constructor() {
    this.isDebugMode = process.env.NODE_ENV === 'development';
  }

  static getInstance(): OfflineDebugService {
    if (!OfflineDebugService.instance) {
      OfflineDebugService.instance = new OfflineDebugService();
    }
    return OfflineDebugService.instance;
  }

  private createError(code: string, message: string, context: string, details?: any): OfflineError {
    const error = new Error(message) as OfflineError;
    error.code = code;
    error.context = context;
    error.timestamp = Date.now();
    error.details = details;
    return error;
  }

  private addLog(level: DebugLog['level'], message: string, context: string, details?: any) {
    const log: DebugLog = {
      timestamp: Date.now(),
      level,
      message,
      context,
      details
    };

    this.logs.unshift(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    if (this.isDebugMode) {
      console[level](`[${context}] ${message}`, details || '');
    }
  }

  // Error handling methods
  handleFileError(error: unknown, context: string): OfflineError {
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        return this.createError(
          'FILE_PERMISSION_DENIED',
          'File access permission denied',
          context,
          { originalError: error.message }
        );
      }
      if (error.name === 'NotFoundError') {
        return this.createError(
          'FILE_NOT_FOUND',
          'File not found',
          context,
          { originalError: error.message }
        );
      }
    }
    return this.createError(
      'FILE_OPERATION_FAILED',
      'File operation failed',
      context,
      { originalError: error }
    );
  }

  handleSyncError(error: unknown, context: string): OfflineError {
    if (error instanceof Error) {
      if (error.message.includes('network')) {
        return this.createError(
          'SYNC_NETWORK_ERROR',
          'Network error during sync',
          context,
          { originalError: error.message }
        );
      }
      if (error.message.includes('quota')) {
        return this.createError(
          'SYNC_STORAGE_QUOTA',
          'Storage quota exceeded',
          context,
          { originalError: error.message }
        );
      }
    }
    return this.createError(
      'SYNC_FAILED',
      'Sync operation failed',
      context,
      { originalError: error }
    );
  }

  handleDataError(error: unknown, context: string): OfflineError {
    if (error instanceof Error) {
      if (error.message.includes('validation')) {
        return this.createError(
          'DATA_VALIDATION_ERROR',
          'Data validation failed',
          context,
          { originalError: error.message }
        );
      }
      if (error.message.includes('parse')) {
        return this.createError(
          'DATA_PARSE_ERROR',
          'Failed to parse data',
          context,
          { originalError: error.message }
        );
      }
    }
    return this.createError(
      'DATA_OPERATION_FAILED',
      'Data operation failed',
      context,
      { originalError: error }
    );
  }

  // Debug logging methods
  logInfo(message: string, context: string, details?: any) {
    this.addLog('info', message, context, details);
  }

  logWarning(message: string, context: string, details?: any) {
    this.addLog('warn', message, context, details);
  }

  logError(message: string, context: string, details?: any) {
    this.addLog('error', message, context, details);
  }

  // Debug inspection methods
  getLogs(options: {
    level?: DebugLog['level'];
    context?: string;
    startTime?: number;
    endTime?: number;
  } = {}): DebugLog[] {
    return this.logs.filter(log => {
      if (options.level && log.level !== options.level) return false;
      if (options.context && log.context !== options.context) return false;
      if (options.startTime && log.timestamp < options.startTime) return false;
      if (options.endTime && log.timestamp > options.endTime) return false;
      return true;
    });
  }

  getErrorSummary(): {
    totalErrors: number;
    errorsByCode: Record<string, number>;
    errorsByContext: Record<string, number>;
    recentErrors: OfflineError[];
  } {
    const errors = this.logs.filter(log => log.level === 'error');
    const errorsByCode: Record<string, number> = {};
    const errorsByContext: Record<string, number> = {};
    const recentErrors: OfflineError[] = [];

    errors.forEach(log => {
      if (log.details?.code) {
        errorsByCode[log.details.code] = (errorsByCode[log.details.code] || 0) + 1;
      }
      errorsByContext[log.context] = (errorsByContext[log.context] || 0) + 1;
      if (log.details?.code) {
        recentErrors.push(log.details as OfflineError);
      }
    });

    return {
      totalErrors: errors.length,
      errorsByCode,
      errorsByContext,
      recentErrors: recentErrors.slice(0, 10)
    };
  }

  // Storage status methods
  async getStorageStatus(): Promise<{
    isDebugMode: boolean;
    logCount: number;
    errorCount: number;
    lastError?: OfflineError;
    storageQuota?: {
      used: number;
      total: number;
    };
  }> {
    const errorSummary = this.getErrorSummary();
    let storageQuota;

    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        storageQuota = {
          used: estimate.usage || 0,
          total: estimate.quota || 0
        };
      }
    } catch (error) {
      this.logWarning('Failed to get storage quota', 'storage', { error });
    }

    return {
      isDebugMode: this.isDebugMode,
      logCount: this.logs.length,
      errorCount: errorSummary.totalErrors,
      lastError: errorSummary.recentErrors[0],
      storageQuota
    };
  }

  // Debug mode control
  setDebugMode(enabled: boolean) {
    this.isDebugMode = enabled;
    this.logInfo(
      `Debug mode ${enabled ? 'enabled' : 'disabled'}`,
      'debug',
      { timestamp: Date.now() }
    );
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    this.logInfo('Logs cleared', 'debug');
  }
}

export const offlineDebug = OfflineDebugService.getInstance(); 