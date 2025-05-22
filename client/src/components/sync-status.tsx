import { useState, useEffect } from "react";
import { FiWifi, FiWifiOff, FiArrowUp, FiCheck } from "react-icons/fi";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { syncService } from "@/lib/syncService";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function SyncStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Check online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    // Get initial sync data
    const loadSyncInfo = async () => {
      const syncInfo = await syncService.getSyncInfo();
      setPendingChanges(syncInfo.pendingChanges);
      if (syncInfo.lastSynced) {
        setLastSynced(new Date(syncInfo.lastSynced));
      }
    };
    
    // Subscribe to sync events
    const handleSyncUpdate = (data: any) => {
      setPendingChanges(data.pendingChanges);
      if (data.lastSynced) {
        setLastSynced(new Date(data.lastSynced));
      }
      setIsSyncing(data.isSyncing);
    };
    
    loadSyncInfo();
    syncService.subscribe(handleSyncUpdate);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Cleanup
    return () => {
      syncService.unsubscribe(handleSyncUpdate);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncService.syncAll();
    } finally {
      setIsSyncing(false);
    }
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              onClick={handleSync}
              disabled={!isOnline || isSyncing || pendingChanges === 0}
            >
              {isOnline ? (
                <FiWifi className="h-5 w-5 text-green-500" />
              ) : (
                <FiWifiOff className="h-5 w-5 text-red-500" />
              )}
              
              {pendingChanges > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 p-0 text-xs"
                  variant="destructive"
                >
                  {pendingChanges > 99 ? '99+' : pendingChanges}
                </Badge>
              )}
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <div className="font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </div>
            {pendingChanges > 0 && (
              <div>
                {pendingChanges} pending change{pendingChanges !== 1 ? 's' : ''}
              </div>
            )}
            {lastSynced && (
              <div className="text-xs text-muted-foreground">
                Last synced: {format(lastSynced, 'MMM d, HH:mm')}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function SyncStatusCard() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Check online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    // Get initial sync data
    const loadSyncInfo = async () => {
      const syncInfo = await syncService.getSyncInfo();
      setPendingChanges(syncInfo.pendingChanges);
      if (syncInfo.lastSynced) {
        setLastSynced(new Date(syncInfo.lastSynced));
      }
    };
    
    // Subscribe to sync events
    const handleSyncUpdate = (data: any) => {
      setPendingChanges(data.pendingChanges);
      if (data.lastSynced) {
        setLastSynced(new Date(data.lastSynced));
      }
      setIsSyncing(data.isSyncing);
    };
    
    loadSyncInfo();
    syncService.subscribe(handleSyncUpdate);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Cleanup
    return () => {
      syncService.unsubscribe(handleSyncUpdate);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncService.syncAll();
    } finally {
      setIsSyncing(false);
    }
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center">
          {isOnline ? (
            <>
              <FiWifi className="mr-2 h-5 w-5 text-green-500" />
              Online
            </>
          ) : (
            <>
              <FiWifiOff className="mr-2 h-5 w-5 text-red-500" />
              Offline
            </>
          )}
        </CardTitle>
        <CardDescription>
          {isOnline 
            ? 'Your data is being synced with the server' 
            : 'Changes will be saved locally and synced when you reconnect'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className={isOnline ? 'text-green-500' : 'text-red-500'}>
              {isOnline ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Pending changes:</span>
            <span className={pendingChanges > 0 ? 'text-amber-500 font-medium' : 'text-muted-foreground'}>
              {pendingChanges}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Last synced:</span>
            <span className="text-muted-foreground">
              {lastSynced ? format(lastSynced, 'MMM d, HH:mm') : 'Never'}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSync} 
          disabled={!isOnline || isSyncing || pendingChanges === 0}
          className="w-full"
        >
          {isSyncing ? (
            <>Syncing...</>
          ) : pendingChanges > 0 ? (
            <>
              <FiArrowUp className="mr-2 h-4 w-4" />
              Sync {pendingChanges} change{pendingChanges !== 1 ? 's' : ''}
            </>
          ) : (
            <>
              <FiCheck className="mr-2 h-4 w-4" />
              All Changes Synced
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}