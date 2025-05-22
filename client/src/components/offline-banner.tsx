import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FiWifi, FiWifiOff } from "react-icons/fi";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  
  useEffect(() => {
    // Set initial state
    setIsOffline(!navigator.onLine);
    
    // Add event listeners for online/offline status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (!isOffline) return null;
  
  return (
    <Alert variant="destructive" className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 flex items-center gap-2 shadow-lg">
      <FiWifiOff className="h-5 w-5" />
      <AlertDescription className="flex-1">
        You're working offline. Changes will be saved locally and synced when you reconnect.
      </AlertDescription>
    </Alert>
  );
}