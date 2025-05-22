import { useState, useEffect } from 'react';
import { dataService } from '../services/data-service';
import { offlineStorage } from '../services/offline-storage';

export function useOffline() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'success' | 'error' | 'pending'>('success');
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncData();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check for pending operations
    checkPendingOperations();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkPendingOperations = async () => {
    const operations = await offlineStorage.getPendingOperations();
    setPendingOperations(operations.length);
  };

  const syncData = async () => {
    if (!navigator.onLine) return;

    try {
      setSyncStatus('pending');
      setSyncError(null);

      // First, download any new data from the server
      await dataService.downloadAllData();

      // Then, sync any pending operations
      await dataService.syncPendingOperations();

      // Update pending operations count
      await checkPendingOperations();

      setSyncStatus('success');
    } catch (error) {
      console.error('Error syncing data:', error);
      setSyncStatus('error');
      setSyncError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  const manualSync = async () => {
    if (!navigator.onLine) {
      setSyncError('Cannot sync while offline');
      return;
    }
    await syncData();
  };

  return {
    isOffline,
    pendingOperations,
    syncStatus,
    syncError,
    manualSync
  };
} 