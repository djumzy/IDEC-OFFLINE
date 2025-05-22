import React, { useEffect, useState } from 'react';
import { offlineDebug } from '../services/offline-debug';
import { offlineStorage } from '../services/offline-storage';
import { useOffline } from '../hooks/useOffline';

interface StorageStatus {
  isDebugMode: boolean;
  logCount: number;
  errorCount: number;
  lastError?: {
    code: string;
    message: string;
    context: string;
  };
  storageQuota?: {
    used: number;
    total: number;
  };
}

export const OfflineStatus: React.FC = () => {
  const isOnline = useOffline();
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const updateStorageStatus = async () => {
      const status = await offlineDebug.getStorageStatus();
      setStorageStatus(status);
    };

    updateStorageStatus();
    const interval = setInterval(updateStorageStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStoragePercentage = (): number => {
    if (!storageStatus?.storageQuota) return 0;
    return (storageStatus.storageQuota.used / storageStatus.storageQuota.total) * 100;
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await offlineStorage.syncPendingOperations((progress) => {
        setSyncProgress(progress);
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 w-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Offline Status</h3>
        <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>

      {/* Storage Usage */}
      {storageStatus?.storageQuota && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Storage Usage</span>
            <span>{formatBytes(storageStatus.storageQuota.used)} / {formatBytes(storageStatus.storageQuota.total)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                getStoragePercentage() > 90 ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${getStoragePercentage()}%` }}
            />
          </div>
        </div>
      )}

      {/* Sync Status */}
      <div className="mb-4">
        {isSyncing ? (
          <div className="flex items-center">
            <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
              <div
                className="h-2 rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
            <span className="text-sm">{syncProgress}%</span>
          </div>
        ) : (
          <button
            onClick={handleSync}
            disabled={isOnline}
            className={`w-full py-2 px-4 rounded ${
              isOnline
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Sync Now
          </button>
        )}
      </div>

      {/* Error Status */}
      {storageStatus?.errorCount > 0 && (
        <div className="text-sm text-red-500 mb-2">
          {storageStatus.errorCount} error(s) detected
        </div>
      )}

      {/* Last Error */}
      {storageStatus?.lastError && (
        <div className="text-xs text-gray-600">
          <div>Last Error: {storageStatus.lastError.message}</div>
          <div>Context: {storageStatus.lastError.context}</div>
        </div>
      )}
    </div>
  );
}; 